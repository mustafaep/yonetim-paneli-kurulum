import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { MessageDirection, WhatsAppMessageStatus } from '@prisma/client';

@Injectable()
export class WhatsAppChatService {
  private readonly logger = new Logger(WhatsAppChatService.name);
  private static readonly BULK_HISTORY_ACTION = 'WHATSAPP_BULK_SEND';

  constructor(
    private prisma: PrismaService,
    private whatsAppService: WhatsAppService,
  ) {}

  /**
   * JID'yi standart formata normalize et.
   * WAHA @c.us gonderir, biz @s.whatsapp.net olarak saklariz.
   */
  private normalizeJid(jid: string): string {
    return jid.replace('@c.us', '@s.whatsapp.net');
  }

  /**
   * JID'den telefon numarasini cikar (@c.us, @s.whatsapp.net, @lid destekli)
   */
  private extractPhoneFromJid(jid: string): string {
    return jid.replace(/@(s\.whatsapp\.net|c\.us|lid)$/, '');
  }

  /**
   * JID telefon bazli mi? (@lid icermez)
   */
  private isPhoneBasedJid(jid: string): boolean {
    return !jid.includes('@lid') && (
      jid.includes('@c.us') ||
      jid.includes('@s.whatsapp.net') ||
      /^\d+$/.test(jid)
    );
  }

  /**
   * Konusma listesi (paginated, searchable)
   */
  async getConversations(params: {
    search?: string;
    isArchived?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { search, isArchived = false, limit = 50, offset = 0 } = params;

    const where: any = { isArchived };

    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search } },
        { lastMessage: { contains: search, mode: 'insensitive' } },
        {
          member: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.whatsAppConversation.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              status: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.whatsAppConversation.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Tek konusma detayi
   */
  async getConversation(id: string) {
    return this.prisma.whatsAppConversation.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            province: { select: { name: true } },
            district: { select: { name: true } },
          },
        },
      },
    });
  }

  /**
   * Konusma mesajlari (paginated, cursor-based)
   */
  async getMessages(
    conversationId: string,
    params: { limit?: number; before?: string },
  ) {
    const { limit = 50, before } = params;

    const where: any = { conversationId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const [data, total] = await Promise.all([
      this.prisma.whatsAppMessage.findMany({
        where,
        include: {
          sentBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.whatsAppMessage.count({ where: { conversationId } }),
    ]);

    return { data: data.reverse(), total };
  }

  /**
   * Konusmaya mesaj gonder.
   * remoteJid @lid ise contactPhone uzerinden gonderir.
   */
  async sendMessage(
    conversationId: string,
    content: string,
    sentById: string,
  ) {
    const conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Gonderim hedefini belirle: @lid ise contactPhone kullan
    let sendTarget = conversation.remoteJid;
    if (sendTarget.includes('@lid')) {
      if (conversation.contactPhone) {
        sendTarget = this.whatsAppService.formatChatId(conversation.contactPhone);
        this.logger.log(
          `Conversation ${conversationId} has @lid JID, using contactPhone: ${sendTarget}`,
        );
      } else {
        this.logger.error(
          `Conversation ${conversationId} has @lid JID but no contactPhone`,
        );
      }
    }

    // WAHA uzerinden gonder - hata olursa mesaji FAILED olarak kaydet
    let result: { messageId: string } | null = null;
    let status: WhatsAppMessageStatus = WhatsAppMessageStatus.SENT;
    let errorMessage: string | null = null;

    try {
      result = await this.whatsAppService.sendText(sendTarget, content);
      if (!result) {
        status = WhatsAppMessageStatus.FAILED;
        errorMessage = 'WhatsApp gönderimi devre dışı';
      }
    } catch (error: any) {
      status = WhatsAppMessageStatus.FAILED;
      errorMessage = error.message || 'Bilinmeyen hata';
      this.logger.error(
        `Failed to send message to ${sendTarget}: ${error.message}`,
      );
    }

    // Mesaji DB'ye kaydet (basarili veya basarisiz)
    const message = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId,
        whatsappMsgId: result?.messageId || null,
        direction: MessageDirection.OUTBOUND,
        content,
        status,
        errorMessage,
        sentById,
        sentAt: new Date(),
      },
      include: {
        sentBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Konusmayi guncelle
    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content,
        lastMessageAt: new Date(),
      },
    });

    return message;
  }

  /**
   * Telefon numarasina direkt mesaj gonder (konusma yoksa olusturur)
   */
  async sendMessageToPhone(
    phone: string,
    content: string,
    sentById: string,
  ) {
    const formattedPhone = this.whatsAppService.formatPhoneForWhatsApp(phone);
    const remoteJid = `${formattedPhone}@s.whatsapp.net`;

    const conversation = await this.findOrCreateConversation(
      remoteJid,
      formattedPhone,
    );

    return this.sendMessage(conversation.id, content, sentById);
  }

  /**
   * Toplu mesaj gonder (uye filtresiyle)
   */
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
      if (memberFilter.provinceId)
        where.provinceId = memberFilter.provinceId;
      if (memberFilter.districtId)
        where.districtId = memberFilter.districtId;
      if (memberFilter.status) where.status = memberFilter.status;
      if (memberFilter.branchId) where.branchId = memberFilter.branchId;
    }

    const members = await this.prisma.member.findMany({
      where,
      select: { id: true, phone: true, firstName: true, lastName: true },
    });

    let sent = 0;
    let failed = 0;
    const successfulMembers: {
      memberId: string;
      name: string;
      phone: string;
    }[] = [];
    const failedMembers: {
      memberId: string;
      name: string;
      phone: string;
      error: string;
    }[] = [];

    for (const member of members) {
      try {
        await this.sendMessageToPhone(member.phone, message, sentById);
        sent++;
        successfulMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          phone: member.phone,
        });
        // Rate limiting: WhatsApp anti-spam koruması (3-5 saniye rastgele)
        const delay = 3000 + Math.random() * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error: any) {
        failed++;
        failedMembers.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          phone: member.phone,
          error: error.message || 'Bilinmeyen hata',
        });
        this.logger.error(
          `Failed to send bulk message to ${member.phone}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Bulk WhatsApp: ${sent} sent, ${failed} failed out of ${members.length}`,
    );

    await this.prisma.systemLog.create({
      data: {
        action: WhatsAppChatService.BULK_HISTORY_ACTION,
        entityType: 'WHATSAPP_BULK',
        entityId: null,
        userId: sentById,
        details: {
          message,
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

  async getRecentBulkMessageHistory(limit = 5) {
    const logs = await this.prisma.systemLog.findMany({
      where: { action: WhatsAppChatService.BULK_HISTORY_ACTION },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
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
          ? {
              id: log.user.id,
              firstName: log.user.firstName,
              lastName: log.user.lastName,
              email: log.user.email,
            }
          : null,
        message: details.message || '',
        sent: details.sent || 0,
        failed: details.failed || 0,
        total: details.total || 0,
        recipients: Array.isArray(details.recipients) ? details.recipients : [],
        failedMembers: Array.isArray(details.failedMembers)
          ? details.failedMembers
          : [],
      };
    });
  }

  /**
   * Konusmayi okundu olarak isaretle
   */
  async markConversationRead(conversationId: string) {
    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });
  }

  /**
   * Konusmayi arsivle
   */
  async archiveConversation(conversationId: string, archive = true) {
    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { isArchived: archive },
    });
  }

  /**
   * Konusmayi ve tum mesaj gecmisini sil
   */
  async deleteConversation(conversationId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppMessage.deleteMany({
        where: { conversationId },
      });

      await tx.whatsAppConversation.delete({
        where: { id: conversationId },
      });
    });
  }

  /**
   * Toplam okunmamis mesaj sayisi
   */
  async getTotalUnreadCount(): Promise<number> {
    const result = await this.prisma.whatsAppConversation.aggregate({
      _sum: { unreadCount: true },
      where: { isArchived: false },
    });
    return result._sum.unreadCount || 0;
  }

  /**
   * Konusma bul veya olustur. Telefon numarasindan uye eslestirmesi yapar.
   *
   * Eslestirme sirasi:
   * 1. remoteJid ile (normalize edilmis + orijinal)
   * 2. contactPhone ile (telefon numarasi bazli - @lid durumu icin)
   * 3. Bulunamazsa yeni olustur
   */
  async findOrCreateConversation(remoteJid: string, phone?: string) {
    const normalized = this.normalizeJid(remoteJid);
    const isPhoneBased = this.isPhoneBasedJid(remoteJid);

    // 1. JID ile ara (hem normalize hem orijinal)
    let conversation =
      await this.prisma.whatsAppConversation.findFirst({
        where: {
          remoteJid: { in: [normalized, remoteJid] },
        },
      });

    // 2. JID bulunamadiysa ve telefon numarasi varsa, contactPhone ile ara
    //    Bu @lid JID'den gelen mesajlari mevcut konusmaya eslestirmek icin kritik
    if (!conversation && phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length >= 10) {
        conversation = await this.prisma.whatsAppConversation.findFirst({
          where: {
            contactPhone: { in: this.phoneSearchVariants(phoneDigits) },
          },
        });

        if (conversation) {
          this.logger.log(
            `Matched conversation by phone ${phoneDigits} (JID: ${remoteJid} -> existing: ${conversation.remoteJid})`,
          );
        }
      }
    }

    if (conversation) {
      // JID guncelleme: eger mevcut JID telefon bazli degilse (@lid) ve
      // yeni JID telefon bazliysa, guncelle
      if (isPhoneBased && !this.isPhoneBasedJid(conversation.remoteJid)) {
        conversation = await this.prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: { remoteJid: normalized },
        });
        this.logger.log(
          `Updated conversation JID from @lid to ${normalized}`,
        );
      }
      // Eski @c.us formatini @s.whatsapp.net'e guncelle
      else if (
        isPhoneBased &&
        conversation.remoteJid !== normalized &&
        this.isPhoneBasedJid(conversation.remoteJid)
      ) {
        conversation = await this.prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: { remoteJid: normalized },
        });
      }
      return conversation;
    }

    // 3. Yeni konusma olustur
    const normalizedPhone = phone || this.extractPhoneFromJid(remoteJid);
    const member = await this.findMemberByPhone(normalizedPhone);

    // @lid JID'yi DB'ye kaydetme - telefon bazli JID tercih et
    const storedJid = isPhoneBased
      ? normalized
      : normalizedPhone
        ? `${normalizedPhone}@s.whatsapp.net`
        : normalized; // son care: @lid'i kaydet

    conversation = await this.prisma.whatsAppConversation.create({
      data: {
        remoteJid: storedJid,
        contactPhone: normalizedPhone || null,
        contactName: member
          ? `${member.firstName} ${member.lastName}`
          : null,
        memberId: member?.id || null,
      },
    });

    return conversation;
  }

  /**
   * Gelen mesaji isle (webhook'tan cagirilir)
   */
  async processIncomingMessage(data: {
    remoteJid: string;
    messageId: string;
    content: string;
    pushName?: string;
  }) {
    const { remoteJid, messageId, content, pushName } = data;

    // Dedup: ayni mesaj ID'si zaten varsa atla
    const existing = await this.prisma.whatsAppMessage.findUnique({
      where: { whatsappMsgId: messageId },
    });
    if (existing) return existing;

    // @lid JID ise WAHA API ile telefon numarasini coz
    let effectiveJid = remoteJid;
    let phone = this.extractPhoneFromJid(remoteJid);

    if (remoteJid.includes('@lid')) {
      // WAHA API ile cozumle (webhook controller'da basarisiz olduysa burada tekrar dene)
      const resolvedPhone = await this.whatsAppService.resolveLidToPhone(remoteJid);
      if (resolvedPhone) {
        effectiveJid = `${resolvedPhone}@s.whatsapp.net`;
        phone = resolvedPhone;
        this.logger.log(`LID resolved in processIncoming: ${remoteJid} -> ${effectiveJid}`);
      } else {
        // Son care: @lid numarasindan telefon cikaramadik
        // LID'yi phone olarak kullanma, sadece JID eslestirmesi yapilacak
        phone = '';
        this.logger.warn(`Cannot resolve LID ${remoteJid}, using JID-only matching`);
      }
    }

    const conversation = await this.findOrCreateConversation(
      effectiveJid,
      phone || undefined,
    );

    // pushName varsa ve contactName yoksa guncelle
    if (pushName && !conversation.contactName) {
      await this.prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { contactName: pushName },
      });
    }

    // Mesaji kaydet
    const message = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        whatsappMsgId: messageId,
        direction: MessageDirection.INBOUND,
        content,
        status: WhatsAppMessageStatus.DELIVERED,
        sentAt: new Date(),
      },
    });

    // Konusmayi guncelle
    await this.prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });

    this.logger.log(`Incoming WhatsApp message from ${phone}: ${messageId}`);

    return message;
  }

  /**
   * Telefondan gonderilen mesajlari isle (webhook fromMe=true).
   * API uzerinden gonderilenler zaten DB'de oldugundan whatsappMsgId dedup yapar.
   */
  async processOutboundPhoneMessage(data: {
    remoteJid: string;
    messageId: string;
    content: string;
  }) {
    const { remoteJid, messageId, content } = data;

    // Dedup: API uzerinden gonderilmisse zaten kaydedilmistir
    const existing = await this.prisma.whatsAppMessage.findUnique({
      where: { whatsappMsgId: messageId },
    });
    if (existing) return existing;

    const phone = this.isPhoneBasedJid(remoteJid)
      ? this.extractPhoneFromJid(remoteJid)
      : '';

    const conversation = await this.findOrCreateConversation(
      remoteJid,
      phone || undefined,
    );

    const message = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        whatsappMsgId: messageId,
        direction: MessageDirection.OUTBOUND,
        content,
        status: WhatsAppMessageStatus.SENT,
        sentAt: new Date(),
        // sentById null: telefon uygulamasindan gonderildi, panel kullanicisi degil
      },
    });

    await this.prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content,
        lastMessageAt: new Date(),
      },
    });

    this.logger.log(
      `Outbound phone message saved: ${messageId} -> ${remoteJid}`,
    );

    return message;
  }

  /**
   * Mesaj durumunu guncelle (delivered, read)
   */
  async updateMessageStatus(
    messageId: string,
    status: WhatsAppMessageStatus,
  ) {
    const message = await this.prisma.whatsAppMessage.findUnique({
      where: { whatsappMsgId: messageId },
    });

    if (!message) return;

    const updateData: any = { status };
    if (status === WhatsAppMessageStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (status === WhatsAppMessageStatus.READ) {
      updateData.readAt = new Date();
    }

    await this.prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: updateData,
    });
  }

  /**
   * Telefon numarasinin arama varyantlarini olustur
   */
  private phoneSearchVariants(phone: string): string[] {
    const clean = phone.replace(/\D/g, '');
    const variants = [clean];

    if (clean.startsWith('90') && clean.length >= 12) {
      variants.push('0' + clean.substring(2));    // 05XX...
      variants.push(clean.substring(2));           // 5XX...
      variants.push('+' + clean);                  // +90XX...
    } else if (clean.startsWith('0') && clean.length >= 11) {
      variants.push('90' + clean.substring(1));    // 905XX...
      variants.push(clean.substring(1));           // 5XX...
      variants.push('+90' + clean.substring(1));   // +905XX...
    } else if (clean.length === 10) {
      variants.push('90' + clean);                 // 905XX...
      variants.push('0' + clean);                  // 05XX...
      variants.push('+90' + clean);                // +905XX...
    }

    return [...new Set(variants)];
  }

  /**
   * Telefon numarasindan uye bul (cesitli formatlarla)
   */
  private async findMemberByPhone(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) return null;

    const phoneVariants = this.phoneSearchVariants(cleanPhone);

    return this.prisma.member.findFirst({
      where: {
        phone: { in: phoneVariants },
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
  }
}
