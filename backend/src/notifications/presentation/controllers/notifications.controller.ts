import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from '../../notifications.service';
import { CreateNotificationDto } from '../../application/dto/create-notification.dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { NotificationStatus, NotificationTargetType } from '@prisma/client';
import { NotificationExceptionFilter } from '../filters/notification-exception.filter';
import { NotificationValidationPipe } from '../pipes/notification-validation.pipe';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseFilters(NotificationExceptionFilter)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Okunmamış bildirim sayısı' })
  @ApiResponse({ status: 200, description: 'count: number' })
  async getUnreadCount(@CurrentUser() user: CurrentUserData) {
    const count = await this.notificationsService.findUnreadCount(user.userId);
    return { count };
  }

  @Get('me')
  @ApiOperation({ summary: 'Kullanıcının kendi bildirimlerini getir' })
  @ApiResponse({ status: 200 })
  async getMyNotifications(
    @CurrentUser() user: CurrentUserData,
    @Query('isRead') isRead?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationsService.findUserNotifications({
      userId: user.userId,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @Get()
  @ApiOperation({ summary: 'Bildirimleri listele' })
  @ApiResponse({ status: 200 })
  async findAll(
    @Query('status') status?: NotificationStatus,
    @Query('targetType') targetType?: NotificationTargetType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationsService.findAll({
      status,
      targetType,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @Get(':id')
  @ApiOperation({ summary: 'Bildirim detayı' })
  @ApiResponse({ status: 200 })
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @Post()
  @UsePipes(NotificationValidationPipe)
  @ApiOperation({ summary: 'Yeni bildirim oluştur' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.create(dto, user.userId, user);
  }

  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @Post('send')
  @UsePipes(NotificationValidationPipe)
  @ApiOperation({ summary: 'Bildirim oluştur ve hemen gönder' })
  @ApiResponse({ status: 201 })
  async createAndSend(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const notification = await this.notificationsService.create(
      dto,
      user.userId,
      user,
    );
    if (!notification) {
      throw new Error('Notification creation failed');
    }
    return this.notificationsService.send(notification.id);
  }

  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @Post(':id/send')
  @ApiOperation({ summary: 'Bildirimi gönder' })
  @ApiResponse({ status: 200 })
  async send(@Param('id') id: string) {
    return this.notificationsService.send(id);
  }

  @Patch('me/:id/read')
  @ApiOperation({ summary: 'Bildirimi okundu olarak işaretle' })
  @ApiResponse({ status: 200 })
  async markAsRead(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.userId, id);
  }

  @Patch('me/read-all')
  @ApiOperation({ summary: 'Tüm bildirimleri okundu olarak işaretle' })
  @ApiResponse({ status: 200 })
  async markAllAsRead(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Permissions(
    Permission.NOTIFY_ALL_MEMBERS,
    Permission.NOTIFY_REGION,
    Permission.NOTIFY_OWN_SCOPE,
  )
  @Delete(':id')
  @ApiOperation({ summary: 'Bildirimi sil' })
  @ApiResponse({ status: 200 })
  async delete(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }
}
