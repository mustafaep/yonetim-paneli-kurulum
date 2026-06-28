import httpClient from '../../../shared/services/httpClient';

export interface SmsTemplate {
  id: string;
  name: string;
  slug: string;
  content: string;
  description?: string;
  isActive: boolean;
  triggerEvent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkSmsResult {
  sent: number;
  failed: number;
  total: number;
  failedMembers: { memberId: string; name: string; phone: string; error: string }[];
}

export interface SmsBulkHistoryItem {
  id: string;
  createdAt: string;
  sentBy: { id: string; firstName: string; lastName: string; email: string } | null;
  message: string;
  sent: number;
  failed: number;
  total: number;
  recipients: { memberId: string; name: string; phone: string }[];
  failedMembers: { memberId: string; name: string; phone: string; error: string }[];
}

export interface MemberFilter {
  provinceId?: string;
  districtId?: string;
  status?: string;
  branchId?: string;
}

export const getSmsStatus = () =>
  httpClient.get<{ configured: boolean; provider: string }>('/sms/status').then((r) => r.data);

export const sendSms = (data: { phone: string; message: string }) =>
  httpClient.post('/sms/send', data).then((r) => r.data);

export const sendSmsBulk = (data: {
  message: string;
  memberFilter?: MemberFilter;
  memberIds?: string[];
}) => httpClient.post<BulkSmsResult>('/sms/send-bulk', data).then((r) => r.data);

export const getSmsBulkHistory = (limit = 5) =>
  httpClient.get<SmsBulkHistoryItem[]>(`/sms/bulk-history?limit=${limit}`).then((r) => r.data);

export const getSmsTemplates = () =>
  httpClient.get<SmsTemplate[]>('/sms/templates').then((r) => r.data);

export const createSmsTemplate = (data: {
  name: string;
  slug: string;
  content: string;
  description?: string;
  triggerEvent?: string;
}) => httpClient.post<SmsTemplate>('/sms/templates', data).then((r) => r.data);

export const updateSmsTemplate = (
  id: string,
  data: Partial<Pick<SmsTemplate, 'name' | 'slug' | 'content' | 'description' | 'isActive' | 'triggerEvent'>>,
) => httpClient.patch<SmsTemplate>(`/sms/templates/${id}`, data).then((r) => r.data);

export const deleteSmsTemplate = (id: string) =>
  httpClient.delete(`/sms/templates/${id}`).then((r) => r.data);

export const sendSmsTemplate = (
  id: string,
  data: {
    memberFilter?: MemberFilter;
    memberIds?: string[];
    extraVariables?: Record<string, string>;
  },
) => httpClient.post<BulkSmsResult>(`/sms/templates/${id}/send`, data).then((r) => r.data);
