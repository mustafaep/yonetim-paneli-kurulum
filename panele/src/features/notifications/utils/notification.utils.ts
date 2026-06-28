/**
 * Bildirim UI yardımcıları - tek kaynak, NotificationCenter ve MyNotificationsPage tarafından kullanılır.
 */
import type { NotificationCategoryType } from '../types/notification.types';
import { NOTIFICATION_CATEGORIES } from '../types/notification.types';

export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Az önce';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} ay önce`;
  return `${Math.floor(diffInSeconds / 31536000)} yıl önce`;
}

export function getCategoryLabel(category: string): string {
  return NOTIFICATION_CATEGORIES[category as NotificationCategoryType]?.label ?? category;
}

export function getCategoryColor(
  category: string
): 'primary' | 'success' | 'info' | 'warning' | 'default' {
  return NOTIFICATION_CATEGORIES[category as NotificationCategoryType]?.color ?? 'default';
}
