/**
 * Merkezi bildirim state'i.
 * Header badge, dropdown listesi ve okundu işaretleme tek kaynaktan yönetilir.
 * REST API kullanır; ileride SignalR/WebSocket bu context üzerinden entegre edilebilir.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import {
  getUnreadNotificationCount,
  getMyNotifications,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
  type UserNotification,
} from '../services/notificationsApi';

const RECENT_LIMIT = 10;

interface NotificationState {
  unreadCount: number;
  recentNotifications: UserNotification[];
  loading: boolean;
}

interface NotificationContextValue extends NotificationState {
  loadUnreadCount: () => Promise<void>;
  loadRecentNotifications: (options?: { isRead?: boolean }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, [isAuthenticated]);

  const loadRecentNotifications = useCallback(
    async (options?: { isRead?: boolean }) => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const result = await getMyNotifications({
          limit: RECENT_LIMIT,
          isRead: options?.isRead,
        });
        setRecentNotifications(result.data);
      } catch (error) {
        console.error('Failed to load recent notifications:', error);
        setRecentNotifications([]);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated]
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!isAuthenticated) return;
      try {
        await apiMarkAsRead(notificationId);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setRecentNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notificationId ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    },
    [isAuthenticated]
  );

  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await apiMarkAllAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [isAuthenticated]);

  const refresh = useCallback(async () => {
    await loadUnreadCount();
    await loadRecentNotifications({ isRead: false });
  }, [loadUnreadCount, loadRecentNotifications]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount();
    } else {
      setUnreadCount(0);
      setRecentNotifications([]);
    }
  }, [isAuthenticated, loadUnreadCount]);

  // Yeni bildirimlerde rozet/liste otomatik yenilensin (Socket kapalıyken polling)
  const POLL_INTERVAL_MS = 45_000; // 45 saniye
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadUnreadCount();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadUnreadCount]);

  const value: NotificationContextValue = {
    unreadCount,
    recentNotifications,
    loading,
    loadUnreadCount,
    loadRecentNotifications,
    markAsRead,
    markAllAsRead,
    refresh,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return ctx;
}

/** Provider dışında kullanım için (opsiyonel değer döner) */
export function useNotificationContextOptional(): NotificationContextValue | null {
  return useContext(NotificationContext);
}
