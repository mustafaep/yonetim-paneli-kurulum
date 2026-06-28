/**
 * Prisma Notification Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationRepository } from '../../domain/repositories/notification.repository.interface';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationStatus, NotificationTargetType } from '@prisma/client';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Notification | null> {
    const data = await this.prisma.notification.findUnique({
      where: { id },
    });
    return data ? Notification.fromPersistence(data) : null;
  }

  async findAll(params?: {
    status?: NotificationStatus;
    targetType?: NotificationTargetType;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Notification[]; total: number }> {
    const { limit = 25, offset = 0, status, targetType } = params || {};

    const where: any = {};
    if (status) where.status = status;
    if (targetType) where.targetType = targetType;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map((item) => Notification.fromPersistence(item)),
      total,
    };
  }

  async save(notification: Notification): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        targetType: notification.targetType,
        targetId: notification.targetId,
        metadata: notification.metadata,
        status: notification.status,
        sentAt: notification.sentAt,
        recipientCount: notification.recipientCount,
        successCount: notification.successCount,
        failedCount: notification.failedCount,
      },
    });
  }

  async create(notification: Notification): Promise<Notification> {
    const createData: any = {
      title: notification.title,
      message: notification.message,
      type: notification.type,
      targetType: notification.targetType,
      targetId: notification.targetId,
      metadata: notification.metadata,
      sentBy: notification.sentBy,
      status: notification.status,
    };
    delete createData.id;

    const created = await this.prisma.notification.create({
      data: createData,
    });

    return Notification.fromPersistence(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }
}
