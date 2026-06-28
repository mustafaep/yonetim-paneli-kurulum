import httpClient from '../../../shared/services/httpClient';
import type {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppTemplate,
  ConnectionStatus,
  QrCodeData,
  BulkSendResult,
  MemberFilter,
  BulkMessageHistoryItem,
} from '../types/whatsapp.types';

// ─── Baglanti ───

export const getConnectionStatus = () =>
  httpClient.get<ConnectionStatus>('/whatsapp/status').then((r) => r.data);

export const connectInstance = () =>
  httpClient
    .post<{ qr: QrCodeData | null; status: ConnectionStatus }>('/whatsapp/connect')
    .then((r) => r.data);

export const getQrCode = () =>
  httpClient.get<QrCodeData | null>('/whatsapp/qr').then((r) => r.data);

export const disconnectInstance = () =>
  httpClient.post('/whatsapp/disconnect').then((r) => r.data);

// ─── Konusmalar ───

export const getConversations = (params?: {
  search?: string;
  isArchived?: boolean;
  limit?: number;
  offset?: number;
}) =>
  httpClient
    .get<{ data: WhatsAppConversation[]; total: number }>(
      '/whatsapp/conversations',
      { params },
    )
    .then((r) => r.data);

export const getUnreadCount = () =>
  httpClient
    .get<{ count: number }>('/whatsapp/conversations/unread-count')
    .then((r) => r.data);

export const getConversation = (id: string) =>
  httpClient
    .get<WhatsAppConversation>(`/whatsapp/conversations/${id}`)
    .then((r) => r.data);

export const getMessages = (
  conversationId: string,
  params?: { limit?: number; before?: string },
) =>
  httpClient
    .get<{ data: WhatsAppMessage[]; total: number }>(
      `/whatsapp/conversations/${conversationId}/messages`,
      { params },
    )
    .then((r) => r.data);

export const sendMessage = (conversationId: string, content: string) =>
  httpClient
    .post<WhatsAppMessage>(
      `/whatsapp/conversations/${conversationId}/messages`,
      { content },
    )
    .then((r) => r.data);

export const markConversationRead = (id: string) =>
  httpClient.patch(`/whatsapp/conversations/${id}/read`).then((r) => r.data);

export const archiveConversation = (id: string, archive: boolean) =>
  httpClient
    .patch(`/whatsapp/conversations/${id}/archive`, { archive })
    .then((r) => r.data);

export const deleteConversation = (id: string) =>
  httpClient.delete(`/whatsapp/conversations/${id}`).then((r) => r.data);

// ─── Mesaj Gonderimi ───

export const sendToPhone = (phone: string, content: string) =>
  httpClient
    .post<WhatsAppMessage>('/whatsapp/send', { phone, content })
    .then((r) => r.data);

export const sendBulk = (payload: {
  message: string;
  memberFilter?: MemberFilter;
  memberIds?: string[];
}) =>
  httpClient
    .post<BulkSendResult>('/whatsapp/send-bulk', payload)
    .then((r) => r.data);

export const getBulkHistory = (limit = 5) =>
  httpClient
    .get<BulkMessageHistoryItem[]>('/whatsapp/bulk-history', { params: { limit } })
    .then((r) => r.data);

// ─── Sablonlar ───

export const getTemplates = () =>
  httpClient.get<WhatsAppTemplate[]>('/whatsapp/templates').then((r) => r.data);

export const createTemplate = (data: {
  name: string;
  slug: string;
  content: string;
  description?: string;
  triggerEvent?: string;
}) =>
  httpClient
    .post<WhatsAppTemplate>('/whatsapp/templates', data)
    .then((r) => r.data);

export const updateTemplate = (
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    content: string;
    description: string;
    isActive: boolean;
    triggerEvent: string;
  }>,
) =>
  httpClient
    .patch<WhatsAppTemplate>(`/whatsapp/templates/${id}`, data)
    .then((r) => r.data);

export const deleteTemplate = (id: string) =>
  httpClient.delete(`/whatsapp/templates/${id}`).then((r) => r.data);

export const sendTemplate = (
  id: string,
  payload: {
    memberFilter?: MemberFilter;
    memberIds?: string[];
    extraVariables?: Record<string, string>;
  },
) =>
  httpClient
    .post<BulkSendResult>(`/whatsapp/templates/${id}/send`, payload)
    .then((r) => r.data);
