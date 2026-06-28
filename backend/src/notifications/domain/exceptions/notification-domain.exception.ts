/**
 * Notification Domain Exceptions
 */
export class NotificationNotFoundException extends Error {
  constructor(public readonly notificationId?: string) {
    super(
      `Notification not found${notificationId ? `: ${notificationId}` : ''}`,
    );
    this.name = 'NotificationNotFoundException';
  }
}

export class NotificationCannotBeSentException extends Error {
  constructor(public readonly currentStatus: string) {
    super(`Notification cannot be sent. Current status: ${currentStatus}`);
    this.name = 'NotificationCannotBeSentException';
  }
}

export class InvalidNotificationTargetException extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'InvalidNotificationTargetException';
  }
}
