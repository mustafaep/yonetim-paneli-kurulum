import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private static readonly BULK_HISTORY_ACTION = 'EMAIL_BULK_SEND';

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async getTemplates(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(id: string) {
    return this.prisma.emailTemplate.findUnique({ where: { id } });
  }

  async createTemplate(data: {
    name: string;
    slug: string;
    subject: string;
    content: string;
    description?: string;
    triggerEvent?: string;
  }) {
    const existing = await this.prisma.emailTemplate.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException(`Bu slug ile zaten bir şablon mevcut: "${data.slug}"`);

    const existingByName = await this.prisma.emailTemplate.findUnique({ where: { name: data.name } });
    if (existingByName) throw new BadRequestException(`Bu isimde zaten bir şablon mevcut: "${data.name}"`);

    return this.prisma.emailTemplate.create({ data });
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      slug?: string;
      subject?: string;
      content?: string;
      description?: string;
      isActive?: boolean;
      triggerEvent?: string;
    },
  ) {
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    return this.prisma.emailTemplate.delete({ where: { id } });
  }

  renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  }

  async sendTemplateToMember(
    templateSlug: string,
    memberId: string,
    extraVariables?: Record<string, string>,
  ) {
    const template = await this.prisma.emailTemplate.findUnique({ where: { slug: templateSlug } });
    if (!template || !template.isActive) {
      this.logger.warn(`Email template '${templateSlug}' not found or inactive`);
      return null;
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        registrationNumber: true,
        status: true,
        province: { select: { name: true } },
        district: { select: { name: true } },
        branch: { select: { name: true } },
        institution: { select: { name: true } },
      },
    });

    if (!member || !member.email) {
      this.logger.warn(`Member '${memberId}' not found or has no email`);
      return null;
    }

    const variables: Record<string, string> = {
      firstName: member.firstName,
      lastName: member.lastName,
      fullName: `${member.firstName} ${member.lastName}`,
      email: member.email,
      phone: member.phone || '',
      registrationNumber: member.registrationNumber || '',
      status: member.status || '',
      province: member.province?.name || '',
      district: member.district?.name || '',
      branch: member.branch?.name || '',
      institution: member.institution?.name || '',
      ...extraVariables,
    };

    const renderedSubject = this.renderTemplate(template.subject, variables);
    const renderedContent = this.renderTemplate(template.content, variables);
    return this.emailService.sendEmail({
      to: member.email,
      subject: renderedSubject,
      html: renderedContent,
    });
  }

  async triggerAutoSend(
    triggerEvent: string,
    memberId: string,
    _sentById: string,
    extraVariables?: Record<string, string>,
  ) {
    const templates = await this.prisma.emailTemplate.findMany({
      where: { triggerEvent, isActive: true },
    });

    for (const template of templates) {
      try {
        await this.sendTemplateToMember(template.slug, memberId, extraVariables);
        this.logger.log(
          `Auto-sent email template '${template.slug}' for event '${triggerEvent}' to member ${memberId}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to auto-send email template '${template.slug}': ${error.message}`,
        );
      }
    }
  }

  async sendBulkTemplate(params: {
    templateSlug: string;
    sentById: string;
    memberFilter?: {
      provinceId?: string;
      districtId?: string;
      status?: string;
      branchId?: string;
    };
    memberIds?: string[];
    extraVariables?: Record<string, string>;
  }) {
    const { templateSlug, sentById, memberFilter, memberIds, extraVariables } = params;

    const template = await this.prisma.emailTemplate.findUnique({ where: { slug: templateSlug } });
    if (!template) throw new BadRequestException(`Şablon bulunamadı: "${templateSlug}"`);

    const where: any = { isActive: true };
    if (memberIds?.length) {
      where.id = { in: memberIds };
    } else if (memberFilter) {
      if (memberFilter.provinceId) where.provinceId = memberFilter.provinceId;
      if (memberFilter.districtId) where.districtId = memberFilter.districtId;
      if (memberFilter.status) where.status = memberFilter.status;
      if (memberFilter.branchId) where.branchId = memberFilter.branchId;
    }

    const members = await this.prisma.member.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        registrationNumber: true,
        status: true,
        province: { select: { name: true } },
        district: { select: { name: true } },
        branch: { select: { name: true } },
        institution: { select: { name: true } },
      },
    });

    let sent = 0;
    let failed = 0;
    const successfulMembers: { memberId: string; name: string; email: string }[] = [];
    const failedMembers: { memberId: string; name: string; email: string; error: string }[] = [];

    for (const member of members) {
      if (!member.email) {
        failed++;
        failedMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: '',
          error: 'E-posta adresi yok',
        });
        continue;
      }
      try {
        const variables: Record<string, string> = {
          firstName: member.firstName,
          lastName: member.lastName,
          fullName: `${member.firstName} ${member.lastName}`,
          email: member.email,
          phone: member.phone || '',
          registrationNumber: member.registrationNumber || '',
          status: member.status || '',
          province: member.province?.name || '',
          district: member.district?.name || '',
          branch: member.branch?.name || '',
          institution: member.institution?.name || '',
          ...extraVariables,
        };
        const renderedSubject = this.renderTemplate(template.subject, variables);
        const renderedContent = this.renderTemplate(template.content, variables);
        await this.emailService.sendEmail({
          to: member.email,
          subject: renderedSubject,
          html: renderedContent,
        });
        sent++;
        successfulMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
        });
      } catch (error: any) {
        failed++;
        failedMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          error: error.message || 'Bilinmeyen hata',
        });
        this.logger.error(`Email template bulk send failed for ${member.email}: ${error.message}`);
      }
    }

    await this.prisma.systemLog.create({
      data: {
        action: EmailTemplateService.BULK_HISTORY_ACTION,
        entityType: 'EMAIL_BULK',
        entityId: null,
        userId: sentById,
        details: {
          templateSlug,
          templateName: template.name,
          sent,
          failed,
          total: members.length,
          recipients: successfulMembers,
          failedMembers,
        },
      },
    });

    return { sent, failed, total: members.length, failedMembers };
  }

  async sendBulkMessage(params: {
    subject: string;
    message: string;
    sentById: string;
    memberFilter?: {
      provinceId?: string;
      districtId?: string;
      status?: string;
      branchId?: string;
    };
    memberIds?: string[];
  }) {
    const { subject, message, sentById, memberFilter, memberIds } = params;

    const where: any = { isActive: true };
    if (memberIds?.length) {
      where.id = { in: memberIds };
    } else if (memberFilter) {
      if (memberFilter.provinceId) where.provinceId = memberFilter.provinceId;
      if (memberFilter.districtId) where.districtId = memberFilter.districtId;
      if (memberFilter.status) where.status = memberFilter.status;
      if (memberFilter.branchId) where.branchId = memberFilter.branchId;
    }

    const members = await this.prisma.member.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    let sent = 0;
    let failed = 0;
    const successfulMembers: { memberId: string; name: string; email: string }[] = [];
    const failedMembers: { memberId: string; name: string; email: string; error: string }[] = [];

    for (const member of members) {
      if (!member.email) {
        failed++;
        failedMembers.push({ memberId: member.id, name: `${member.firstName} ${member.lastName}`, email: '', error: 'E-posta adresi yok' });
        continue;
      }
      try {
        await this.emailService.sendEmail({ to: member.email, subject, html: message });
        sent++;
        successfulMembers.push({ memberId: member.id, name: `${member.firstName} ${member.lastName}`, email: member.email });
      } catch (error: any) {
        failed++;
        failedMembers.push({ memberId: member.id, name: `${member.firstName} ${member.lastName}`, email: member.email, error: error.message || 'Bilinmeyen hata' });
        this.logger.error(`Bulk email failed for ${member.email}: ${error.message}`);
      }
    }

    await this.prisma.systemLog.create({
      data: {
        action: EmailTemplateService.BULK_HISTORY_ACTION,
        entityType: 'EMAIL_BULK',
        entityId: null,
        userId: sentById,
        details: { subject, message, sent, failed, total: members.length, recipients: successfulMembers, failedMembers },
      },
    });

    return { sent, failed, total: members.length, failedMembers };
  }

  async getRecentBulkHistory(limit = 5) {
    const logs = await this.prisma.systemLog.findMany({
      where: { action: EmailTemplateService.BULK_HISTORY_ACTION },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => {
      const details = (log.details || {}) as any;
      return {
        id: log.id,
        createdAt: log.createdAt,
        sentBy: log.user
          ? { id: log.user.id, firstName: log.user.firstName, lastName: log.user.lastName, email: log.user.email }
          : null,
        subject: details.subject || details.templateName || '',
        message: details.message || '',
        sent: details.sent || 0,
        failed: details.failed || 0,
        total: details.total || 0,
        recipients: Array.isArray(details.recipients) ? details.recipients : [],
        failedMembers: Array.isArray(details.failedMembers) ? details.failedMembers : [],
      };
    });
  }
}
