import httpClient from '../../../shared/services/httpClient';

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  content: string;
  description?: string;
  isActive: boolean;
  triggerEvent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkEmailResult {
  sent: number;
  failed: number;
  total: number;
  failedMembers: { memberId: string; name: string; email: string; error: string }[];
}

export interface EmailBulkHistoryItem {
  id: string;
  createdAt: string;
  sentBy: { id: string; firstName: string; lastName: string; email: string } | null;
  subject: string;
  message: string;
  sent: number;
  failed: number;
  total: number;
  recipients: { memberId: string; name: string; email: string }[];
  failedMembers: { memberId: string; name: string; email: string; error: string }[];
}

export interface MemberFilter {
  provinceId?: string;
  districtId?: string;
  status?: string;
  branchId?: string;
}

export const getEmailStatus = () =>
  httpClient.get<{ configured: boolean; provider: string }>('/email/status').then((r) => r.data);

export const sendEmail = (data: { to: string; subject: string; html: string }) =>
  httpClient.post('/email/send', data).then((r) => r.data);

export const sendEmailBulk = (data: {
  subject: string;
  message: string;
  memberFilter?: MemberFilter;
  memberIds?: string[];
}) => httpClient.post<BulkEmailResult>('/email/send-bulk', data).then((r) => r.data);

export const getEmailBulkHistory = (limit = 5) =>
  httpClient.get<EmailBulkHistoryItem[]>(`/email/bulk-history?limit=${limit}`).then((r) => r.data);

export const getEmailTemplates = () =>
  httpClient.get<EmailTemplate[]>('/email/templates').then((r) => r.data);

export const createEmailTemplate = (data: {
  name: string;
  slug: string;
  subject: string;
  content: string;
  description?: string;
  triggerEvent?: string;
}) => httpClient.post<EmailTemplate>('/email/templates', data).then((r) => r.data);

export const updateEmailTemplate = (
  id: string,
  data: Partial<Pick<EmailTemplate, 'name' | 'slug' | 'subject' | 'content' | 'description' | 'isActive' | 'triggerEvent'>>,
) => httpClient.patch<EmailTemplate>(`/email/templates/${id}`, data).then((r) => r.data);

export const deleteEmailTemplate = (id: string) =>
  httpClient.delete(`/email/templates/${id}`).then((r) => r.data);

export const sendEmailTemplate = (
  id: string,
  data: {
    memberFilter?: MemberFilter;
    memberIds?: string[];
    extraVariables?: Record<string, string>;
  },
) => httpClient.post<BulkEmailResult>(`/email/templates/${id}/send`, data).then((r) => r.data);
