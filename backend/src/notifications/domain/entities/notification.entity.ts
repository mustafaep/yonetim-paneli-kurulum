/**
 * Notification Domain Entity
 */
import {
  NotificationType,
  NotificationTargetType,
  NotificationStatus,
} from '@prisma/client';

export interface CreateNotificationData {
  title: string;
  message: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetId?: string | null;
  metadata?: any;
  sentBy: string;
}

export interface UpdateNotificationData {
  title?: string;
  message?: string;
  type?: NotificationType;
  targetType?: NotificationTargetType;
  targetId?: string | null;
  metadata?: any;
}

export class Notification {
  private _id: string;
  private _title: string;
  private _message: string;
  private _type: NotificationType;
  private _targetType: NotificationTargetType;
  private _targetId?: string | null;
  private _metadata?: any;
  private _status: NotificationStatus;
  private _sentBy: string;
  private _sentAt?: Date;
  private _recipientCount?: number;
  private _successCount?: number;
  private _failedCount?: number;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(data: CreateNotificationData, id: string = ''): Notification {
    const notification = new Notification();
    notification._id = id;
    notification._title = data.title.trim();
    notification._message = data.message.trim();
    notification._type = data.type;
    notification._targetType = data.targetType;
    notification._targetId = data.targetId;
    notification._metadata = data.metadata;
    notification._status = NotificationStatus.PENDING;
    notification._sentBy = data.sentBy;
    notification._createdAt = new Date();
    notification._updatedAt = new Date();
    return notification;
  }

  static fromPersistence(data: any): Notification {
    const notification = new Notification();
    notification._id = data.id;
    notification._title = data.title;
    notification._message = data.message;
    notification._type = data.type;
    notification._targetType = data.targetType;
    notification._targetId = data.targetId;
    notification._metadata = data.metadata;
    notification._status = data.status;
    notification._sentBy = data.sentBy;
    notification._sentAt = data.sentAt ? new Date(data.sentAt) : undefined;
    notification._recipientCount = data.recipientCount;
    notification._successCount = data.successCount;
    notification._failedCount = data.failedCount;
    notification._createdAt = new Date(data.createdAt);
    notification._updatedAt = new Date(data.updatedAt);
    return notification;
  }

  update(data: UpdateNotificationData): void {
    if (data.title !== undefined) {
      this._title = data.title.trim();
    }
    if (data.message !== undefined) {
      this._message = data.message.trim();
    }
    if (data.type !== undefined) {
      this._type = data.type;
    }
    if (data.targetType !== undefined) {
      this._targetType = data.targetType;
    }
    if (data.targetId !== undefined) {
      this._targetId = data.targetId;
    }
    if (data.metadata !== undefined) {
      this._metadata = data.metadata;
    }
    this._updatedAt = new Date();
  }

  markAsSent(
    recipientCount: number,
    successCount: number,
    failedCount: number,
  ): void {
    if (this._status !== NotificationStatus.PENDING) {
      throw new Error(
        `Notification cannot be sent. Current status: ${this._status}`,
      );
    }
    this._status = NotificationStatus.SENT;
    this._sentAt = new Date();
    this._recipientCount = recipientCount;
    this._successCount = successCount;
    this._failedCount = failedCount;
    this._updatedAt = new Date();
  }

  markAsFailed(): void {
    this._status = NotificationStatus.FAILED;
    this._updatedAt = new Date();
  }

  validateTarget(): void {
    if (
      (this._targetType === NotificationTargetType.REGION ||
        this._targetType === NotificationTargetType.SCOPE) &&
      !this._targetId &&
      !this._metadata?.scopeProvinceId &&
      !this._metadata?.scopeDistrictId
    ) {
      throw new Error(
        `${this._targetType} için targetId veya scope bilgisi zorunludur`,
      );
    }

    if (
      this._targetType === NotificationTargetType.ALL_MEMBERS &&
      this._targetId
    ) {
      throw new Error('ALL_MEMBERS için targetId belirtilmemelidir');
    }
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get message(): string {
    return this._message;
  }

  get type(): NotificationType {
    return this._type;
  }

  get targetType(): NotificationTargetType {
    return this._targetType;
  }

  get targetId(): string | null | undefined {
    return this._targetId;
  }

  get metadata(): any {
    return this._metadata;
  }

  get status(): NotificationStatus {
    return this._status;
  }

  get sentBy(): string {
    return this._sentBy;
  }

  get sentAt(): Date | undefined {
    return this._sentAt;
  }

  get recipientCount(): number | undefined {
    return this._recipientCount;
  }

  get successCount(): number | undefined {
    return this._successCount;
  }

  get failedCount(): number | undefined {
    return this._failedCount;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
