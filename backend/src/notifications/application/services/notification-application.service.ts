/**
 * Notification Application Service
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Notification } from '../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../domain/repositories/notification.repository.interface';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationNotFoundException } from '../../domain/exceptions/notification-domain.exception';
import { NotificationStatus, NotificationTargetType } from '@prisma/client';

export interface CreateNotificationCommand {
  dto: CreateNotificationDto;
  userId: string;
  metadata?: any;
}

export interface DeleteNotificationCommand {
  notificationId: string;
}

@Injectable()
export class NotificationApplicationService {
  private readonly logger = new Logger(NotificationApplicationService.name);

  constructor(
    @Inject('NotificationRepository')
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async createNotification(
    command: CreateNotificationCommand,
  ): Promise<Notification> {
    const { dto, userId, metadata } = command;
    const notification = Notification.create(
      {
        title: dto.title,
        message: dto.message,
        type: dto.type,
        targetType: dto.targetType,
        targetId: dto.targetId,
        metadata: metadata || dto.metadata,
        sentBy: userId,
      },
      '',
    );

    notification.validateTarget();

    const created = await this.notificationRepository.create(notification);
    this.logger.log(`Notification created: ${created.id} (${created.title})`);
    return created;
  }

  async findAll(params?: {
    status?: NotificationStatus;
    targetType?: NotificationTargetType;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Notification[]; total: number }> {
    return await this.notificationRepository.findAll(params);
  }

  async findById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new NotificationNotFoundException(id);
    }
    return notification;
  }

  async deleteNotification(command: DeleteNotificationCommand): Promise<void> {
    const { notificationId } = command;
    const notification =
      await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotificationNotFoundException(notificationId);
    }
    await this.notificationRepository.delete(notificationId);
    this.logger.log(
      `Notification deleted: ${notification.id} (${notification.title})`,
    );
  }
}
