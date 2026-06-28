/**
 * Bildirim hook'u: NotificationContext üzerinden merkezi state + opsiyonel Socket.IO (ileride).
 * Provider içinde kullanılmalıdır.
 */
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../app/providers/AuthContext';
import {
  useNotificationContextOptional,
  type NotificationContextValue,
} from '../../features/notifications/context/NotificationContext';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
  : 'http://localhost:3000';

/** Backend Socket.IO desteklemediği sürece false kalmalı */
const SOCKET_ENABLED = false;

export interface UseNotificationsReturn extends NotificationContextValue {
  socket: Socket | null;
  connected: boolean;
  /** Geriye dönük uyumluluk */
  refreshNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { accessToken, isAuthenticated } = useAuth();
  const context = useNotificationContextOptional();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const contextRef = useRef(context);
  contextRef.current = context;

  // Socket (ileride SignalR/WebSocket entegrasyonu için)
  useEffect(() => {
    if (!SOCKET_ENABLED || !isAuthenticated || !accessToken || !context) return;

    const newSocket = io(`${SOCKET_URL}/notifications`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      contextRef.current?.loadUnreadCount();
    });

    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('notification', () => {
      contextRef.current?.loadUnreadCount();
      contextRef.current?.loadRecentNotifications({ isRead: false });
    });

    newSocket.on('unread-count-update', () => {
      contextRef.current?.loadUnreadCount();
    });

    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, [SOCKET_ENABLED, isAuthenticated, accessToken]);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return {
    ...context,
    socket,
    connected,
    refreshNotifications: () => context.loadRecentNotifications({ isRead: false }),
    refreshUnreadCount: context.loadUnreadCount,
  };
}
