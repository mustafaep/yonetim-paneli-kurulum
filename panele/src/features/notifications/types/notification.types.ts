/**
 * Merkezi bildirim tipleri.
 * Backend (REST) ve ileride SignalR/WebSocket ile uyumlu, genişletilebilir model.
 */

/** Backend NotificationCategory ile uyumlu */
export type NotificationCategoryType =
  | 'SYSTEM'
  | 'FINANCIAL'
  | 'ANNOUNCEMENT'
  | 'REMINDER';

/** UI'da gösterim tipi (toast/ikon renkleri için) */
export type NotificationDisplayType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

/** In-app bildirim modeli (API yanıtı ile uyumlu) */
export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  category: NotificationCategoryType;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

/** Kullanıcı-bildirim eşlemesi (okundu takibi) */
export interface UserNotificationPayload {
  id: string;
  userId: string;
  notificationId: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  notification: NotificationPayload & Record<string, unknown>;
}

/** Kategori sabitleri - tek kaynak */
export const NOTIFICATION_CATEGORIES: Record<
  NotificationCategoryType,
  { label: string; color: 'primary' | 'success' | 'info' | 'warning' | 'default' }
> = {
  SYSTEM: { label: 'Sistem', color: 'primary' },
  FINANCIAL: { label: 'Mali', color: 'success' },
  ANNOUNCEMENT: { label: 'Duyuru', color: 'info' },
  REMINDER: { label: 'Hatırlatma', color: 'warning' },
};
