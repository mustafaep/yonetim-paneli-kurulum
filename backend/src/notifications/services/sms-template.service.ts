import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from './sms.service';

@Injectable()
export class SmsTemplateService {
  private readonly logger = new Logger(SmsTemplateService.name);
  private static readonly BULK_HISTORY_ACTION = 'SMS_BULK_SEND';

  constructor(
    private prisma: PrismaService,
    private smsService: SmsService,
  ) {}

  async getTemplates(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.smsTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(id: string) {
    return this.prisma.smsTemplate.findUnique({ where: { id } });
  }

  async createTemplate(data: {
    name: string;
    slug: string;
    content: string;
    description?: string;
    triggerEvent?: string;
  }) {
    const existing = await this.prisma.smsTemplate.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException(`Bu slug ile zaten bir şablon mevcut: "${data.slug}"`);

    const existingByName = await this.prisma.smsTemplate.findUnique({ where: { name: data.name } });
    if (existingByName) throw new BadRequestException(`Bu isimde zaten bir şablon mevcut: "${data.name}"`);

    return this.prisma.smsTemplate.create({ data });
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      slug?: string;
      content?: string;
      description?: string;
      isActive?: boolean;
      triggerEvent?: string;
    },
  ) {
    return this.prisma.smsTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    return this.prisma.smsTemplate.delete({ where: { id } });
  }

  renderTemplate(content: string, variables: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  }

  async sendTemplateToMember(
    templateSlug: string,
    memberId: string,
    extraVariables?: Record<string, string>,
  ) {
    const template = await this.prisma.smsTemplate.findUnique({ where: { slug: templateSlug } });
    if (!template || !template.isActive) {
      this.logger.warn(`SMS template '${templateSlug}' not found or inactive`);
      return null;
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
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

    if (!member || !member.phone) {
      this.logger.warn(`Member '${memberId}' not found or has no phone`);
      return null;
    }

    const variables: Record<string, string> = {
      firstName: member.firstName,
      lastName: member.lastName,
      fullName: `${member.firstName} ${member.lastName}`,
      phone: member.phone,
      registrationNumber: member.registrationNumber || '',
      status: member.status || '',
      province: member.province?.name || '',
      district: member.district?.name || '',
      branch: member.branch?.name || '',
      institution: member.institution?.name || '',
      ...extraVariables,
    };

    const renderedContent = this.renderTemplate(template.content, variables);
    return this.smsService.sendSms({ to: member.phone, message: renderedContent });
  }

  async triggerAutoSend(
    triggerEvent: string,
    memberId: string,
    _sentById: string,
    extraVariables?: Record<string, string>,
  ) {
    const templates = await this.prisma.smsTemplate.findMany({
      where: { triggerEvent, isActive: true },
    });

    for (const template of templates) {
      try {
        await this.sendTemplateToMember(template.slug, memberId, extraVariables);
        this.logger.log(
          `Auto-sent SMS template '${template.slug}' for event '${triggerEvent}' to member ${memberId}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to auto-send SMS template '${template.slug}': ${error.message}`,
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

    const template = await this.prisma.smsTemplate.findUnique({ where: { slug: templateSlug } });
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
        phone: true,
        firstName: true,
        lastName: true,
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
    const successfulMembers: { memberId: string; name: string; phone: string }[] = [];
    const failedMembers: { memberId: string; name: string; phone: string; error: string }[] = [];

    for (const member of members) {
      try {
        const variables: Record<string, string> = {
          firstName: member.firstName,
          lastName: member.lastName,
          fullName: `${member.firstName} ${member.lastName}`,
          phone: member.phone,
          registrationNumber: member.registrationNumber || '',
          status: member.status || '',
          province: member.province?.name || '',
          district: member.district?.name || '',
          branch: member.branch?.name || '',
          institution: member.institution?.name || '',
          ...extraVariables,
        };
        const renderedContent = this.renderTemplate(template.content, variables);
        await this.smsService.sendSms({ to: member.phone, message: renderedContent });
        sent++;
        successfulMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          phone: member.phone,
        });
      } catch (error: any) {
        failed++;
        failedMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          phone: member.phone,
          error: error.message || 'Bilinmeyen hata',
        });
        this.logger.error(`SMS template bulk send failed for ${member.phone}: ${error.message}`);
      }
    }

    await this.prisma.systemLog.create({
      data: {
        action: SmsTemplateService.BULK_HISTORY_ACTION,
        entityType: 'SMS_BULK',
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
    const { message, sentById, memberFilter, memberIds } = params;

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
      select: { id: true, phone: true, firstName: true, lastName: true, registrationNumber: true },
    });

    let sent = 0;
    let failed = 0;
    const successfulMembers: { memberId: string; name: string; phone: string }[] = [];
    const failedMembers: { memberId: string; name: string; phone: string; error: string }[] = [];

    for (const member of members) {
      try {
        await this.smsService.sendSms({ to: member.phone, message });
        sent++;
        successfulMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          phone: member.phone,
        });
      } catch (error: any) {
        failed++;
        failedMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          phone: member.phone,
          error: error.message || 'Bilinmeyen hata',
        });
        this.logger.error(`Bulk SMS failed for ${member.phone}: ${error.message}`);
      }
    }

    await this.prisma.systemLog.create({
      data: {
        action: SmsTemplateService.BULK_HISTORY_ACTION,
        entityType: 'SMS_BULK',
        entityId: null,
        userId: sentById,
        details: { message, sent, failed, total: members.length, recipients: successfulMembers, failedMembers },
      },
    });

    return { sent, failed, total: members.length, failedMembers };
  }

  async getRecentBulkHistory(limit = 5) {
    const logs = await this.prisma.systemLog.findMany({
      where: { action: SmsTemplateService.BULK_HISTORY_ACTION },
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
        message: details.message || details.templateName || '',
        sent: details.sent || 0,
        failed: details.failed || 0,
        total: details.total || 0,
        recipients: Array.isArray(details.recipients) ? details.recipients : [],
        failedMembers: Array.isArray(details.failedMembers) ? details.failedMembers : [],
      };
    });
  }
}
