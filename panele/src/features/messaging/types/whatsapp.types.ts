export interface WhatsAppConversation {
  id: string;
  memberId: string | null;
  remoteJid: string;
  contactName: string | null;
  contactPhone: string | null;
  lastMessageAt: string | null;
  lastMessage: string | null;
  unreadCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    status: string;
    province?: { name: string };
    district?: { name: string };
  } | null;
}

export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type WhatsAppMessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  whatsappMsgId: string | null;
  direction: MessageDirection;
  content: string;
  status: WhatsAppMessageStatus;
  sentById: string | null;
  sentBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  slug: string;
  content: string;
  description: string | null;
  isActive: boolean;
  triggerEvent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionStatus {
  connected: boolean;
  state: string;
}

export interface QrCodeData {
  base64: string;
  code: string;
}

export interface BulkSendFailedMember {
  memberId: string;
  name: string;
  phone: string;
  error: string;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  total: number;
  failedMembers?: BulkSendFailedMember[];
}

export interface MemberFilter {
  provinceId?: string;
  districtId?: string;
  status?: string;
  branchId?: string;
}

export interface BulkHistoryRecipient {
  memberId: string;
  name: string;
  phone: string;
}

export interface BulkMessageHistoryItem {
  id: string;
  createdAt: string;
  sentBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  message: string;
  sent: number;
  failed: number;
  total: number;
  recipients: BulkHistoryRecipient[];
}
