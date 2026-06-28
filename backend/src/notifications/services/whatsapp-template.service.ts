import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppChatService } from './whatsapp-chat.service';

@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);

  constructor(
    private prisma: PrismaService,
    private whatsAppChatService: WhatsAppChatService,
  ) {}

  /**
   * Tum sablonlari listele
   */
  async getTemplates(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.whatsAppTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Tek sablon getir
   */
  async getTemplate(id: string) {
    return this.prisma.whatsAppTemplate.findUnique({ where: { id } });
  }

  /**
   * Sablon olustur
   */
  async createTemplate(data: {
    name: string;
    slug: string;
    content: string;
    description?: string;
    triggerEvent?: string;
  }) {
    // Slug çakışma kontrolü
    const existing = await this.prisma.whatsAppTemplate.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new BadRequestException(
        `Bu slug ile zaten bir şablon mevcut: "${data.slug}"`,
      );
    }

    // Aynı isimde şablon kontrolü
    const existingByName = await this.prisma.whatsAppTemplate.findUnique({
      where: { name: data.name },
    });
    if (existingByName) {
      throw new BadRequestException(
        `Bu isimde zaten bir şablon mevcut: "${data.name}"`,
      );
    }

    // Aynı triggerEvent ile birden fazla aktif şablon kontrolü
    if (data.triggerEvent) {
      const existingTrigger = await this.prisma.whatsAppTemplate.findFirst({
        where: { triggerEvent: data.triggerEvent, isActive: true },
      });
      if (existingTrigger) {
        throw new BadRequestException(
          `Bu tetikleyici olay için zaten aktif bir şablon var: "${existingTrigger.name}". Önce onu pasif yapın veya farklı bir tetikleyici seçin.`,
        );
      }
    }

    return this.prisma.whatsAppTemplate.create({ data });
  }

  /**
   * Sablon guncelle
   */
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
    // Slug çakışma kontrolü (başka şablonla)
    if (data.slug) {
      const existing = await this.prisma.whatsAppTemplate.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException(
          `Bu slug ile zaten bir şablon mevcut: "${data.slug}"`,
        );
      }
    }

    // İsim çakışma kontrolü
    if (data.name) {
      const existing = await this.prisma.whatsAppTemplate.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException(
          `Bu isimde zaten bir şablon mevcut: "${data.name}"`,
        );
      }
    }

    // Aynı triggerEvent ile birden fazla aktif şablon kontrolü
    if (data.triggerEvent && data.isActive !== false) {
      const existingTrigger = await this.prisma.whatsAppTemplate.findFirst({
        where: { triggerEvent: data.triggerEvent, isActive: true, id: { not: id } },
      });
      if (existingTrigger) {
        throw new BadRequestException(
          `Bu tetikleyici olay için zaten aktif bir şablon var: "${existingTrigger.name}"`,
        );
      }
    }

    return this.prisma.whatsAppTemplate.update({ where: { id }, data });
  }

  /**
   * Sablon sil
   */
  async deleteTemplate(id: string) {
    return this.prisma.whatsAppTemplate.delete({ where: { id } });
  }

  /**
   * Sablon icerigini degiskenlerle render et
   * {{firstName}}, {{lastName}}, {{phone}} vb.
   */
  renderTemplate(
    content: string,
    variables: Record<string, string>,
  ): string {
    return content.replace(
      /\{\{(\w+)\}\}/g,
      (match, key) => variables[key] || match,
    );
  }

  /**
   * Sablonu bir uyeye gonder
   */
  async sendTemplateToMember(
    templateSlug: string,
    memberId: string,
    sentById: string,
    extraVariables?: Record<string, string>,
  ) {
    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { slug: templateSlug },
    });

    if (!template || !template.isActive) {
      this.logger.warn(`WhatsApp template '${templateSlug}' not found or inactive`);
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

    if (!member) {
      this.logger.warn(`Member '${memberId}' not found for template send`);
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

    return this.whatsAppChatService.sendMessageToPhone(
      member.phone,
      renderedContent,
      sentById,
    );
  }

  /**
   * Sablonu birden fazla uyeye gonder
   */
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
    const { templateSlug, sentById, memberFilter, memberIds, extraVariables } =
      params;

    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { slug: templateSlug },
    });

    if (!template || !template.isActive) {
      throw new Error(`Template '${templateSlug}' not found or inactive`);
    }

    // Uyeleri filtrele
    const where: any = { isActive: true };
    if (memberIds?.length) {
      where.id = { in: memberIds };
    } else if (memberFilter) {
      if (memberFilter.provinceId)
        where.provinceId = memberFilter.provinceId;
      if (memberFilter.districtId)
        where.districtId = memberFilter.districtId;
      if (memberFilter.status) where.status = memberFilter.status;
      if (memberFilter.branchId) where.branchId = memberFilter.branchId;
    }

    const members = await this.prisma.member.findMany({
      where,
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

    let sent = 0;
    let failed = 0;

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

        const renderedContent = this.renderTemplate(
          template.content,
          variables,
        );

        await this.whatsAppChatService.sendMessageToPhone(
          member.phone,
          renderedContent,
          sentById,
        );
        sent++;
        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        failed++;
        this.logger.error(
          `Failed to send template to ${member.phone}: ${error.message}`,
        );
      }
    }

    return { sent, failed, total: members.length };
  }

  /**
   * TriggerEvent bazli otomatik sablon gonderimi
   * Ornegin: uye onaylandiginda MEMBER_APPROVED event'i tetiklenir
   */
  async triggerAutoSend(
    triggerEvent: string,
    memberId: string,
    sentById: string,
    extraVariables?: Record<string, string>,
  ) {
    const templates = await this.prisma.whatsAppTemplate.findMany({
      where: { triggerEvent, isActive: true },
    });

    for (const template of templates) {
      try {
        await this.sendTemplateToMember(
          template.slug,
          memberId,
          sentById,
          extraVariables,
        );
        this.logger.log(
          `Auto-sent template '${template.slug}' for event '${triggerEvent}' to member ${memberId}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to auto-send template '${template.slug}': ${error.message}`,
        );
      }
    }
  }
}
