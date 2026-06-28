import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { WhatsAppService } from '../../services/whatsapp.service';
import { WhatsAppChatService } from '../../services/whatsapp-chat.service';
import { WhatsAppTemplateService } from '../../services/whatsapp-template.service';

@ApiTags('WhatsApp')
@ApiBearerAuth('JWT-auth')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly chatService: WhatsAppChatService,
    private readonly templateService: WhatsAppTemplateService,
  ) {}

  // ─── Baglanti Yonetimi ───

  @Get('status')
  @Permissions(
    Permission.WHATSAPP_CHAT_VIEW,
    Permission.WHATSAPP_CHAT_SEND,
    Permission.WHATSAPP_CHAT_MANAGE,
    Permission.WHATSAPP_BULK_SEND,
    Permission.WHATSAPP_TEMPLATE_VIEW,
    Permission.WHATSAPP_TEMPLATE_MANAGE,
    Permission.WHATSAPP_INSTANCE_MANAGE,
  )
  @ApiOperation({ summary: 'WhatsApp bağlantı durumu' })
  async getConnectionStatus() {
    return this.whatsAppService.getConnectionStatus();
  }

  @Post('connect')
  @Permissions(Permission.WHATSAPP_INSTANCE_MANAGE)
  @ApiOperation({ summary: 'WhatsApp session başlat ve QR kodu al' })
  async connectInstance() {
    await this.whatsAppService.createInstance();
    // Session başladıktan sonra QR'ın oluşmasını bekle
    await new Promise((r) => setTimeout(r, 2000));
    const qrImage = await this.whatsAppService.getQrCodeImage();
    const qrRaw = !qrImage ? await this.whatsAppService.getQrCode(2, 2000) : null;
    const status = await this.whatsAppService.getConnectionStatus();
    return {
      qr: qrImage
        ? { base64: qrImage }
        : qrRaw
          ? { base64: qrRaw.base64 }
          : null,
      status,
    };
  }

  @Get('qr')
  @Permissions(Permission.WHATSAPP_INSTANCE_MANAGE)
  @ApiOperation({ summary: 'QR kodu al (base64 image)' })
  async getQrCode() {
    const qrImage = await this.whatsAppService.getQrCodeImage();
    if (qrImage) {
      return { base64: qrImage };
    }
    return this.whatsAppService.getQrCode(1);
  }

  @Post('disconnect')
  @Permissions(Permission.WHATSAPP_INSTANCE_MANAGE)
  @ApiOperation({ summary: 'WhatsApp bağlantısını kes' })
  async disconnectInstance() {
    await this.whatsAppService.disconnectInstance();
    return { message: 'Disconnected' };
  }

  // ─── Konusmalar ───

  @Get('conversations')
  @Permissions(Permission.WHATSAPP_CHAT_VIEW)
  @ApiOperation({ summary: 'Konuşma listesi' })
  async getConversations(
    @Query('search') search?: string,
    @Query('isArchived') isArchived?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.chatService.getConversations({
      search,
      isArchived: isArchived === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('conversations/unread-count')
  @Permissions(Permission.WHATSAPP_CHAT_VIEW)
  @ApiOperation({ summary: 'Toplam okunmamış mesaj sayısı' })
  async getUnreadCount() {
    const count = await this.chatService.getTotalUnreadCount();
    return { count };
  }

  @Get('conversations/:id')
  @Permissions(Permission.WHATSAPP_CHAT_VIEW)
  @ApiOperation({ summary: 'Konuşma detayı' })
  async getConversation(@Param('id') id: string) {
    return this.chatService.getConversation(id);
  }

  @Get('conversations/:id/messages')
  @Permissions(Permission.WHATSAPP_CHAT_VIEW)
  @ApiOperation({ summary: 'Konuşma mesajları' })
  async getMessages(
    @Param('id') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getMessages(conversationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      before,
    });
  }

  @Post('conversations/:id/messages')
  @Permissions(Permission.WHATSAPP_CHAT_SEND)
  @ApiOperation({ summary: 'Konuşmaya mesaj gönder' })
  async sendMessageInConversation(
    @Param('id') conversationId: string,
    @Body() body: { content: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      body.content,
      user.userId,
    );
  }

  @Patch('conversations/:id/read')
  @Permissions(Permission.WHATSAPP_CHAT_VIEW)
  @ApiOperation({ summary: 'Konuşmayı okundu olarak işaretle' })
  async markConversationRead(@Param('id') id: string) {
    await this.chatService.markConversationRead(id);
    return { message: 'Marked as read' };
  }

  @Patch('conversations/:id/archive')
  @Permissions(Permission.WHATSAPP_CHAT_MANAGE)
  @ApiOperation({ summary: 'Konuşmayı arşivle/arşivden çıkar' })
  async archiveConversation(
    @Param('id') id: string,
    @Body() body: { archive: boolean },
  ) {
    await this.chatService.archiveConversation(id, body.archive);
    return { message: body.archive ? 'Archived' : 'Unarchived' };
  }

  @Delete('conversations/:id')
  @Permissions(Permission.WHATSAPP_CHAT_MANAGE)
  @ApiOperation({ summary: 'Konuşmayı ve mesaj geçmişini sil' })
  async deleteConversation(@Param('id') id: string) {
    await this.chatService.deleteConversation(id);
    return { message: 'Deleted' };
  }

  // ─── Mesaj Gonderimi ───

  @Post('send')
  @Permissions(Permission.WHATSAPP_CHAT_SEND)
  @ApiOperation({ summary: 'Telefon numarasına mesaj gönder' })
  async sendToPhone(
    @Body() body: { phone: string; content: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.sendMessageToPhone(
      body.phone,
      body.content,
      user.userId,
    );
  }

  @Post('send-bulk')
  @Permissions(Permission.WHATSAPP_BULK_SEND)
  @ApiOperation({ summary: 'Toplu mesaj gönder' })
  async sendBulk(
    @Body()
    body: {
      message: string;
      memberFilter?: {
        provinceId?: string;
        districtId?: string;
        status?: string;
        branchId?: string;
      };
      memberIds?: string[];
    },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.sendBulkMessage({
      message: body.message,
      sentById: user.userId,
      memberFilter: body.memberFilter,
      memberIds: body.memberIds,
    });
  }

  @Get('bulk-history')
  @Permissions(Permission.WHATSAPP_BULK_SEND)
  @ApiOperation({ summary: 'Son toplu mesaj gönderim geçmişi' })
  async getBulkHistory(@Query('limit') limit?: string) {
    return this.chatService.getRecentBulkMessageHistory(
      limit ? parseInt(limit, 10) : 5,
    );
  }

  // ─── Sablonlar ───

  @Get('templates')
  @Permissions(Permission.WHATSAPP_TEMPLATE_VIEW)
  @ApiOperation({ summary: 'Şablon listesi' })
  async getTemplates() {
    return this.templateService.getTemplates();
  }

  @Post('templates')
  @Permissions(Permission.WHATSAPP_TEMPLATE_MANAGE)
  @ApiOperation({ summary: 'Şablon oluştur' })
  async createTemplate(
    @Body()
    body: {
      name: string;
      slug: string;
      content: string;
      description?: string;
      triggerEvent?: string;
    },
  ) {
    return this.templateService.createTemplate(body);
  }

  @Patch('templates/:id')
  @Permissions(Permission.WHATSAPP_TEMPLATE_MANAGE)
  @ApiOperation({ summary: 'Şablon güncelle' })
  async updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      content?: string;
      description?: string;
      isActive?: boolean;
      triggerEvent?: string;
    },
  ) {
    return this.templateService.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @Permissions(Permission.WHATSAPP_TEMPLATE_MANAGE)
  @ApiOperation({ summary: 'Şablon sil' })
  async deleteTemplate(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
    return { message: 'Deleted' };
  }

  @Post('templates/:id/send')
  @Permissions(Permission.WHATSAPP_TEMPLATE_MANAGE)
  @ApiOperation({ summary: 'Şablonu üyelere gönder' })
  async sendTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      memberFilter?: {
        provinceId?: string;
        districtId?: string;
        status?: string;
        branchId?: string;
      };
      memberIds?: string[];
      extraVariables?: Record<string, string>;
    },
    @CurrentUser() user: CurrentUserData,
  ) {
    const template = await this.templateService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }

    return this.templateService.sendBulkTemplate({
      templateSlug: template.slug,
      sentById: user.userId,
      memberFilter: body.memberFilter,
      memberIds: body.memberIds,
      extraVariables: body.extraVariables,
    });
  }
}
