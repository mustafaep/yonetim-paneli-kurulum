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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { SmsService } from '../../services/sms.service';
import { SmsTemplateService } from '../../services/sms-template.service';
import { ConfigService } from '../../../config/config.service';

@ApiTags('SMS')
@ApiBearerAuth('JWT-auth')
@Controller('sms')
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly templateService: SmsTemplateService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'SMS servis durumu' })
  async getStatus() {
    // Sırlar yalnızca .env üzerinden okunur
    const configured = !!(
      this.configService.netgsmUsername && this.configService.netgsmPassword
    );
    return { configured, provider: 'NetGSM' };
  }

  @Post('send')
  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @ApiOperation({ summary: 'Telefon numarasına SMS gönder' })
  async sendSms(@Body() body: { phone: string; message: string }) {
    await this.smsService.sendSms({ to: body.phone, message: body.message });
    return { message: 'SMS gönderildi' };
  }

  @Post('send-bulk')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'Toplu SMS gönder' })
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
    return this.templateService.sendBulkMessage({
      message: body.message,
      sentById: user.userId,
      memberFilter: body.memberFilter,
      memberIds: body.memberIds,
    });
  }

  @Get('bulk-history')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'Toplu SMS gönderim geçmişi' })
  async getBulkHistory(@Query('limit') limit?: string) {
    return this.templateService.getRecentBulkHistory(
      limit ? parseInt(limit, 10) : 5,
    );
  }

  // ─── Şablonlar ───

  @Get('templates')
  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @ApiOperation({ summary: 'SMS şablon listesi' })
  async getTemplates() {
    return this.templateService.getTemplates();
  }

  @Post('templates')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'SMS şablon oluştur' })
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
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'SMS şablon güncelle' })
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
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'SMS şablon sil' })
  async deleteTemplate(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
    return { message: 'Şablon silindi' };
  }

  @Post('templates/:id/send')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'SMS şablonunu üyelere gönder' })
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
    if (!template) return { error: 'Şablon bulunamadı' };

    return this.templateService.sendBulkTemplate({
      templateSlug: template.slug,
      sentById: user.userId,
      memberFilter: body.memberFilter,
      memberIds: body.memberIds,
      extraVariables: body.extraVariables,
    });
  }
}
