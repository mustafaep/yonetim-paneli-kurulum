// src/features/notifications/services/notificationsApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP'; // Eski sistem için
  category: 'SYSTEM' | 'FINANCIAL' | 'ANNOUNCEMENT' | 'REMINDER';
  typeCategory?: string;
  channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[];
  targetType: 'ALL_MEMBERS' | 'REGION' | 'SCOPE' | 'USER' | 'ROLE';
  targetId?: string;
  targetRole?: string;
  targetName?: string;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'PARTIALLY_SENT';
  sentAt?: string;
  scheduledFor?: string;
  sentBy: string;
  sentByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  recipientCount: number;
  successCount: number;
  failedCount: number;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  notificationId: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  notification: Notification;
}

export interface SendNotificationDto {
  title: string;
  message: string;
  type?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP'; // Eski sistem için
  category?: 'SYSTEM' | 'FINANCIAL' | 'ANNOUNCEMENT' | 'REMINDER';
  typeCategory?: string;
  channels?: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[];
  targetType: 'ALL_MEMBERS' | 'REGION' | 'SCOPE' | 'USER' | 'ROLE';
  targetId?: string;
  targetRole?: string;
  scheduledFor?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  timeZone: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  systemNotificationsEnabled: boolean;
  financialNotificationsEnabled: boolean;
  announcementNotificationsEnabled: boolean;
  reminderNotificationsEnabled: boolean;
  typeCategorySettings?: Record<string, boolean>;
}

// ============ ESKİ SİSTEM (Geriye dönük uyumluluk) ============

// Bildirim gönder (eski)
export const sendNotification = async (
  payload: SendNotificationDto,
): Promise<Notification> => {
  const res = await httpClient.post<Notification>('/notifications/send', payload);
  return res.data;
};

// Bildirim geçmişi (eski)
export const getNotifications = async (params?: {
  targetType?: 'ALL_MEMBERS' | 'REGION' | 'SCOPE';
  status?: 'PENDING' | 'SENT' | 'FAILED';
}): Promise<Notification[]> => {
  const res = await httpClient.get<{ data: Notification[]; total: number; limit: number; offset: number }>('/notifications', { params });
  return Array.isArray(res.data?.data) ? res.data.data : [];
};

// Bildirim detayı (eski)
export const getNotificationById = async (id: string): Promise<Notification> => {
  const res = await httpClient.get<Notification>(`/notifications/${id}`);
  return res.data;
};

// ============ YENİ SİSTEM (V2) ============

// Bildirim listesi (V2 - gelişmiş filtreleme)
export const getNotificationsV2 = async (params?: {
  status?: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'PARTIALLY_SENT';
  targetType?: 'ALL_MEMBERS' | 'REGION' | 'SCOPE' | 'USER' | 'ROLE';
  category?: 'SYSTEM' | 'FINANCIAL' | 'ANNOUNCEMENT' | 'REMINDER';
  typeCategory?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Notification[]; total: number; limit: number; offset: number }> => {
  const res = await httpClient.get<{ data: Notification[]; total: number; limit: number; offset: number }>('/notifications/v2', { params });
  return res.data;
};

// Yeni bildirim oluştur (V2)
export const createNotificationV2 = async (payload: SendNotificationDto): Promise<Notification> => {
  const res = await httpClient.post<Notification>('/notifications/v2', payload);
  return res.data;
};

// Bildirim oluştur ve gönder (V2)
export const createAndSendNotificationV2 = async (payload: SendNotificationDto): Promise<Notification> => {
  const res = await httpClient.post<Notification>('/notifications/v2/send', payload);
  return res.data;
};

// Bildirimi gönder (V2)
export const sendNotificationV2 = async (id: string): Promise<Notification> => {
  const res = await httpClient.post<Notification>(`/notifications/v2/${id}/send`);
  return res.data;
};

// Bildirim detayı (V2)
export const getNotificationByIdV2 = async (id: string): Promise<Notification> => {
  const res = await httpClient.get<Notification>(`/notifications/v2/${id}`);
  return res.data;
};

// Bildirim logları
export const getNotificationLogs = async (id: string, limit = 100) => {
  const res = await httpClient.get(`/notifications/v2/${id}/logs`, { params: { limit } });
  return res.data;
};

// Bildirim istatistikleri
export const getNotificationStats = async (id: string) => {
  const res = await httpClient.get(`/notifications/v2/${id}/stats`);
  return res.data;
};

// ============ KULLANICI BİLDİRİMLERİ (IN_APP) ============

// Okunmamış bildirim sayısı
export const getUnreadNotificationCount = async (): Promise<number> => {
  const res = await httpClient.get<{ count: number }>('/notifications/me/unread-count');
  return res.data.count;
};

// Kullanıcı bildirimlerini getir
export const getMyNotifications = async (params?: {
  isRead?: boolean;
  category?: 'SYSTEM' | 'FINANCIAL' | 'ANNOUNCEMENT' | 'REMINDER';
  limit?: number;
  offset?: number;
}): Promise<{ data: UserNotification[]; total: number; limit: number; offset: number }> => {
  const res = await httpClient.get<{ data: UserNotification[]; total: number; limit: number; offset: number }>('/notifications/me', { params });
  return res.data;
};

// Bildirimi okundu işaretle
export const markNotificationAsRead = async (notificationId: string): Promise<UserNotification> => {
  const res = await httpClient.patch<UserNotification>(`/notifications/me/${notificationId}/read`);
  return res.data;
};

// Tüm bildirimleri okundu işaretle
export const markAllNotificationsAsRead = async () => {
  const res = await httpClient.patch('/notifications/me/read-all');
  return res.data;
};

// ============ BİLDİRİM AYARLARI ============

// Bildirim ayarlarını getir
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const res = await httpClient.get<NotificationSettings>('/notifications/settings');
  return res.data;
};

// Bildirim ayarlarını güncelle
export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
  const res = await httpClient.put<NotificationSettings>('/notifications/settings', settings);
  return res.data;
};

