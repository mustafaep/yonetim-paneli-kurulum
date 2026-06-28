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
import { EmailService } from '../../services/email.service';
import { EmailTemplateService } from '../../services/email-template.service';
import { ConfigService } from '../../../config/config.service';

@ApiTags('Email')
@ApiBearerAuth('JWT-auth')
@Controller('email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly templateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Email servis durumu' })
  async getStatus() {
    // Sırlar yalnızca .env üzerinden okunur
    const configured = !!(
      this.configService.awsSesAccessKeyId &&
      this.configService.awsSesSecretAccessKey
    );
    return { configured, provider: 'AWS SES' };
  }

  @Post('send')
  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @ApiOperation({ summary: 'E-posta gönder' })
  async sendEmail(
    @Body() body: { to: string; subject: string; html: string },
  ) {
    await this.emailService.sendEmail({
      to: body.to,
      subject: body.subject,
      html: body.html,
    });
    return { message: 'E-posta gönderildi' };
  }

  @Post('send-bulk')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'Toplu e-posta gönder' })
  async sendBulk(
    @Body()
    body: {
      subject: string;
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
      subject: body.subject,
      message: body.message,
      sentById: user.userId,
      memberFilter: body.memberFilter,
      memberIds: body.memberIds,
    });
  }

  @Get('bulk-history')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'Toplu e-posta gönderim geçmişi' })
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
  @ApiOperation({ summary: 'E-posta şablon listesi' })
  async getTemplates() {
    return this.templateService.getTemplates();
  }

  @Post('templates')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'E-posta şablon oluştur' })
  async createTemplate(
    @Body()
    body: {
      name: string;
      slug: string;
      subject: string;
      content: string;
      description?: string;
      triggerEvent?: string;
    },
  ) {
    return this.templateService.createTemplate(body);
  }

  @Patch('templates/:id')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'E-posta şablon güncelle' })
  async updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      subject?: string;
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
  @ApiOperation({ summary: 'E-posta şablon sil' })
  async deleteTemplate(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
    return { message: 'Şablon silindi' };
  }

  @Post('templates/:id/send')
  @Permissions(Permission.NOTIFY_ALL_MEMBERS)
  @ApiOperation({ summary: 'E-posta şablonunu üyelere gönder' })
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
