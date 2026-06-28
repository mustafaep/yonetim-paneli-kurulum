import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import * as whatsappApi from '../services/whatsappApi';
import type { MemberFilter } from '../types/whatsapp.types';

const KEYS = {
  status: ['whatsapp', 'status'] as const,
  qr: ['whatsapp', 'qr'] as const,
  conversations: (params?: any) => ['whatsapp', 'conversations', params] as const,
  unreadCount: ['whatsapp', 'unread-count'] as const,
  conversation: (id: string) => ['whatsapp', 'conversation', id] as const,
  messages: (conversationId: string) => ['whatsapp', 'messages', conversationId] as const,
  templates: ['whatsapp', 'templates'] as const,
  bulkHistory: ['whatsapp', 'bulk-history'] as const,
};

// ─── Baglanti ───

export function useConnectionStatus(enabled = true) {
  return useQuery({
    queryKey: KEYS.status,
    queryFn: whatsappApi.getConnectionStatus,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      // QR taratma bekleniyorsa daha sık kontrol et
      if (state === 'SCAN_QR_CODE' || state === 'STARTING') return 3000;
      return 10000;
    },
    enabled,
  });
}

export function useQrCode(enabled = true) {
  return useQuery({
    queryKey: KEYS.qr,
    queryFn: whatsappApi.getQrCode,
    refetchInterval: 15000,
    enabled,
    retry: false,
  });
}

export function useConnectInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: whatsappApi.connectInstance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.status });
      qc.invalidateQueries({ queryKey: KEYS.qr });
    },
  });
}

export function useDisconnectInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: whatsappApi.disconnectInstance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.status });
    },
  });
}

// ─── Konusmalar ───

export function useConversations(params?: {
  search?: string;
  isArchived?: boolean;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: KEYS.conversations(params),
    queryFn: () => whatsappApi.getConversations(params),
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: KEYS.unreadCount,
    queryFn: whatsappApi.getUnreadCount,
    refetchInterval: 30000,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: KEYS.conversation(id),
    queryFn: () => whatsappApi.getConversation(id),
    enabled: !!id,
  });
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: KEYS.messages(conversationId),
    queryFn: ({ pageParam }) =>
      whatsappApi.getMessages(conversationId, {
        limit: 50,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < 50) return undefined;
      return lastPage.data[0]?.createdAt;
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => whatsappApi.sendMessage(conversationId, content),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: KEYS.messages(variables.conversationId),
      });
      qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      whatsappApi.markConversationRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      qc.invalidateQueries({ queryKey: KEYS.unreadCount });
    },
  });
}

export function useArchiveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      whatsappApi.archiveConversation(id, archive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => whatsappApi.deleteConversation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      qc.invalidateQueries({ queryKey: KEYS.unreadCount });
    },
  });
}

// ─── Mesaj Gonderimi ───

export function useSendToPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, content }: { phone: string; content: string }) =>
      whatsappApi.sendToPhone(phone, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    },
  });
}

export function useSendBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      message: string;
      memberFilter?: MemberFilter;
      memberIds?: string[];
    }) => whatsappApi.sendBulk(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.bulkHistory });
    },
  });
}

export function useBulkHistory(limit = 5) {
  return useQuery({
    queryKey: [...KEYS.bulkHistory, limit],
    queryFn: () => whatsappApi.getBulkHistory(limit),
    refetchInterval: 30000,
  });
}

// ─── Sablonlar ───

export function useTemplates() {
  return useQuery({
    queryKey: KEYS.templates,
    queryFn: whatsappApi.getTemplates,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: whatsappApi.createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof whatsappApi.updateTemplate>[1] }) =>
      whatsappApi.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => whatsappApi.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates });
    },
  });
}

export function useSendTemplate() {
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof whatsappApi.sendTemplate>[1];
    }) => whatsappApi.sendTemplate(id, payload),
  });
}
