/**
 * Notification Repository Interface (Port)
 */
import { Notification } from '../entities/notification.entity';
import { NotificationStatus, NotificationTargetType } from '@prisma/client';

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findAll(params?: {
    status?: NotificationStatus;
    targetType?: NotificationTargetType;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Notification[]; total: number }>;
  save(notification: Notification): Promise<void>;
  create(notification: Notification): Promise<Notification>;
  delete(id: string): Promise<void>;
}
