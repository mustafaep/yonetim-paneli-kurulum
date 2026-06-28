import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../../../auth/decorators/public.decorator';
import { WhatsAppChatService } from '../../services/whatsapp-chat.service';
import { WhatsAppService } from '../../services/whatsapp.service';
import { ConfigService } from '../../../config/config.service';
import { WhatsAppMessageStatus } from '@prisma/client';

@ApiTags('WhatsApp Webhook')
@Controller('whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly chatService: WhatsAppChatService,
    private readonly whatsAppService: WhatsAppService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * WAHA webhook endpoint'i
   * Event formati: { event: string, session: string, payload: any }
   */
  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Headers('x-webhook-secret') secretHeader: string | undefined,
    @Body() body: any,
  ) {
    const expectedSecret = this.configService.wahaWebhookSecret;
    if (expectedSecret) {
      if (!secretHeader || secretHeader !== expectedSecret) {
        this.logger.warn(
          `Webhook rejected: invalid or missing X-Webhook-Secret header`,
        );
        throw new UnauthorizedException('Invalid webhook secret');
      }
    }

    const event = body?.event;

    this.logger.debug(
      `Webhook received: event=${event}, keys=${Object.keys(body || {}).join(',')}`,
    );

    if (!event) {
      return { received: true };
    }

    try {
      switch (event) {
        case 'message':
          // Gelen mesajlar (fromMe=false) + telefondan gönderilenler (fromMe=true)
          await this.handleIncomingMessage(body);
          break;

        case 'message.any':
          // Tüm mesajlar: message.any ile gelen fromMe=true olanları işle,
          // fromMe=false olanlar 'message' event'inde zaten işlendi → dedup yakalar
          await this.handleIncomingMessage(body);
          break;

        case 'message.ack':
          await this.handleMessageAck(body);
          break;

        case 'session.status':
          this.handleSessionStatus(body);
          break;

        default:
          this.logger.debug(`Unhandled webhook event: ${event}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Webhook processing error (${event}): ${error.message}`,
        error.stack,
      );
    }

    return { received: true };
  }

  /**
   * Payload'dan gercek telefon bazli JID'yi cikar.
   * WAHA WEBJS yeni surumlerde @lid (Linked Identity) formatinda
   * gonderebilir. Bu format telefon numarasi icermez.
   * Gercek telefon JID'sini payload'daki alternatif alanlardan cikarir.
   */
  private resolvePhoneJid(payload: any): string | null {
    const from = payload.from;

    // @c.us veya @s.whatsapp.net ise zaten telefon bazli
    if (from && !from.includes('@lid') && !from.includes('@g.us')) {
      return from;
    }

    // @lid geldi - alternatif kaynaklardan telefon numarasini bul
    // 1. payload.id.remote (raw WA message ID'deki chat/remote JID)
    const idRemote =
      typeof payload.id === 'object'
        ? payload.id?.remote || payload.id?._serialized?.split('@')?.[0]
        : null;
    if (idRemote && this.isPhoneJid(idRemote)) {
      return idRemote;
    }

    // 2. payload._data.id.remote
    const dataIdRemote = payload._data?.id?.remote;
    if (dataIdRemote && this.isPhoneJid(dataIdRemote)) {
      return dataIdRemote;
    }

    // 3. payload._data.from (raw from field)
    const dataFrom = payload._data?.from;
    if (dataFrom && this.isPhoneJid(dataFrom)) {
      return dataFrom;
    }

    // 4. payload.chatId
    const chatId = payload.chatId;
    if (chatId && this.isPhoneJid(chatId)) {
      return chatId;
    }

    // 5. payload.to (our number - but we need the remote, not us)
    // This doesn't help, skip

    // 6. payload._data.chat.id._serialized
    const chatSerialized = payload._data?.chat?.id?._serialized;
    if (chatSerialized && this.isPhoneJid(chatSerialized)) {
      return chatSerialized;
    }

    // Hicbir alternatif bulunamadi - @lid ile devam et
    this.logger.warn(
      `Could not resolve phone JID from @lid. from=${from}, ` +
        `id=${JSON.stringify(payload.id)}, ` +
        `_data.id=${JSON.stringify(payload._data?.id)}, ` +
        `_data.from=${payload._data?.from}, ` +
        `chatId=${payload.chatId}`,
    );

    return from;
  }

  /**
   * JID telefon bazli mi? (@c.us veya @s.whatsapp.net veya saf numara)
   */
  private isPhoneJid(jid: string): boolean {
    if (!jid) return false;
    if (jid.includes('@lid') || jid.includes('@g.us') || jid.includes('@newsletter')) {
      return false;
    }
    // @c.us, @s.whatsapp.net, veya saf rakam
    return (
      jid.includes('@c.us') ||
      jid.includes('@s.whatsapp.net') ||
      /^\d+$/.test(jid)
    );
  }

  /**
   * Gelen mesajlari isle
   * WAHA payload: { id, from, to, body, fromMe, ... }
   */
  private async handleIncomingMessage(body: any) {
    const payload = body?.payload;
    if (!payload) {
      this.logger.warn('Incoming message: no payload');
      return;
    }

    this.logger.log(
      `Incoming message: from=${payload.from}, fromMe=${payload.fromMe}, ` +
        `hasBody=${!!payload.body}, type=${payload.type || 'chat'}, ` +
        `id=${typeof payload.id === 'object' ? JSON.stringify(payload.id) : payload.id}`,
    );

    // Telefon uygulamasindan gonderilen mesajlar (fromMe=true)
    // API uzerinden gonderilenler zaten DB'de var - dedup check yakalar
    if (payload.fromMe) {
      await this.handleOutboundPhoneMessage(body);
      return;
    }

    // Telefon bazli JID'yi coz (@lid -> @c.us/@s.whatsapp.net)
    let remoteJid = this.resolvePhoneJid(payload);
    if (!remoteJid) {
      this.logger.warn('Incoming message: could not resolve remote JID');
      return;
    }

    // Hala @lid ise WAHA API uzerinden telefon numarasini cozumle
    if (remoteJid.includes('@lid')) {
      const resolvedPhone = await this.whatsAppService.resolveLidToPhone(remoteJid);
      if (resolvedPhone) {
        remoteJid = `${resolvedPhone}@s.whatsapp.net`;
        this.logger.log(
          `Resolved @lid via WAHA API: ${payload.from} -> ${remoteJid}`,
        );
      } else {
        this.logger.warn(
          `Could not resolve @lid ${payload.from}, will try phone-based matching`,
        );
        // remoteJid hala @lid - chat service contactPhone ile eslestirmeyi deneyecek
      }
    }

    // Status mesajlarini ve grup mesajlarini atla
    if (
      remoteJid === 'status@broadcast' ||
      remoteJid.includes('@g.us') ||
      remoteJid.includes('@newsletter')
    ) {
      return;
    }

    // Mesaj icerigini cikar (metin, emoji, medya aciklamasi vb.)
    const msgType = payload.type || payload._data?.type || 'chat';
    let content = payload.body || '';

    // Medya/sticker/belge mesajlarinda body bos olabilir - tip bilgisi ekle
    if (!content) {
      switch (msgType) {
        case 'image':
          content = payload.caption || '📷 Fotoğraf';
          break;
        case 'video':
          content = payload.caption || '🎥 Video';
          break;
        case 'audio':
        case 'ptt':
          content = '🎵 Sesli mesaj';
          break;
        case 'sticker':
          content = '🏷️ Çıkartma';
          break;
        case 'document':
          content = payload.caption || `📄 ${payload._data?.filename || 'Belge'}`;
          break;
        case 'location':
          content = '📍 Konum';
          break;
        case 'contact':
        case 'vcard':
          content = '👤 Kişi kartı';
          break;
        default:
          this.logger.warn(
            `Incoming message from ${remoteJid}: empty body, type=${msgType}`,
          );
          return;
      }
    }

    // messageId: WAHA string veya object donebilir
    const rawId = payload.id;
    const messageId =
      typeof rawId === 'string'
        ? rawId
        : rawId?._serialized || rawId?.id || String(rawId);

    const pushName = payload._data?.notifyName || payload.notifyName || null;

    this.logger.log(
      `Processing incoming message: resolved=${remoteJid}, original=${payload.from}, ` +
        `messageId=${messageId}, content=${content.substring(0, 50)}`,
    );

    await this.chatService.processIncomingMessage({
      remoteJid,
      messageId,
      content,
      pushName,
    });
  }

  /**
   * Telefondan gonderilen mesajlari isle (fromMe=true)
   * API uzerinden gonderilenler zaten DB'de oldugundan dedup check yakalar.
   */
  private async handleOutboundPhoneMessage(body: any) {
    const payload = body?.payload;
    if (!payload) return;

    // Alici JID'si payload.to veya _data.to'dan gelir
    let remoteJid: string =
      payload.to ||
      payload._data?.to ||
      payload.chatId ||
      payload._data?.chat?.id?._serialized ||
      '';

    if (!remoteJid) {
      this.logger.warn('Outbound phone message: no recipient JID found');
      return;
    }

    // @lid ise coz
    if (remoteJid.includes('@lid')) {
      const resolvedPhone = await this.whatsAppService.resolveLidToPhone(remoteJid);
      if (resolvedPhone) {
        remoteJid = `${resolvedPhone}@s.whatsapp.net`;
      }
    }

    // Grup, broadcast, newsletter mesajlarini atla
    if (
      remoteJid === 'status@broadcast' ||
      remoteJid.includes('@g.us') ||
      remoteJid.includes('@newsletter')
    ) {
      return;
    }

    const msgType = payload.type || payload._data?.type || 'chat';
    let content = payload.body || '';

    if (!content) {
      switch (msgType) {
        case 'image':   content = payload.caption || '📷 Fotoğraf'; break;
        case 'video':   content = payload.caption || '🎥 Video'; break;
        case 'audio':
        case 'ptt':     content = '🎵 Sesli mesaj'; break;
        case 'sticker': content = '🏷️ Çıkartma'; break;
        case 'document': content = payload.caption || `📄 ${payload._data?.filename || 'Belge'}`; break;
        case 'location': content = '📍 Konum'; break;
        default:
          this.logger.debug(`Outbound phone message: empty body, type=${msgType}, skipping`);
          return;
      }
    }

    const rawId = payload.id;
    const messageId =
      typeof rawId === 'string'
        ? rawId
        : rawId?._serialized || rawId?.id || String(rawId);

    this.logger.log(
      `Outbound phone message: to=${remoteJid}, msgId=${messageId}, content=${content.substring(0, 50)}`,
    );

    await this.chatService.processOutboundPhoneMessage({
      remoteJid,
      messageId,
      content,
    });
  }

  /**
   * Mesaj onay durumu (ack) guncelleme
   * WAHA ack degerleri: 1=SENT, 2=DELIVERED, 3=READ
   */
  private async handleMessageAck(body: any) {
    const payload = body?.payload;
    if (!payload?.id) return;

    const rawId = payload.id;
    const messageId =
      typeof rawId === 'string'
        ? rawId
        : rawId?._serialized || rawId?.id || String(rawId);
    const ack = payload.ack;

    let mappedStatus: WhatsAppMessageStatus | null = null;
    switch (ack) {
      case 1:
        mappedStatus = WhatsAppMessageStatus.SENT;
        break;
      case 2:
        mappedStatus = WhatsAppMessageStatus.DELIVERED;
        break;
      case 3:
        mappedStatus = WhatsAppMessageStatus.READ;
        break;
    }

    if (mappedStatus) {
      await this.chatService.updateMessageStatus(messageId, mappedStatus);
    }
  }

  /**
   * Session durum degisikligi
   */
  private handleSessionStatus(body: any) {
    const payload = body?.payload;
    this.logger.log(
      `WhatsApp session status: ${payload?.status || 'unknown'}`,
    );
  }
}
