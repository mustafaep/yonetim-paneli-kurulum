// src/features/system/services/systemApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: 'GENERAL' | 'EMAIL' | 'SMS' | 'DASHBOARD' | 'MEMBERSHIP' | 'DUES' | 'SECURITY' | 'NOTIFICATION' | 'UI' | 'INTEGRATION' | 'AUDIT' | 'REPORTS' | 'OTHER';
  isEditable: boolean;
  isCritical?: boolean;
  requiresApproval?: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface UpdateSystemSettingDto {
  value: string;
}

export interface SystemLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string; // Nullable - başarısız login gibi durumlar için
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Sistem ayarları
export const getSystemSettings = async (): Promise<SystemSetting[]> => {
  const res = await httpClient.get<SystemSetting[]>('/system/settings');
  return Array.isArray(res.data) ? res.data : [];
};

export const getSystemSettingByKey = async (key: string): Promise<SystemSetting> => {
  const res = await httpClient.get<SystemSetting>(`/system/settings/${key}`);
  return res.data;
};

export const updateSystemSetting = async (
  key: string,
  payload: UpdateSystemSettingDto,
): Promise<SystemSetting> => {
  const res = await httpClient.patch<SystemSetting>(
    `/system/settings/${key}`,
    payload,
  );
  return res.data;
};

// Logo yükleme
export const uploadLogo = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('logo', file);

  // FormData gönderirken headers'ı belirtmeye gerek yok
  // httpClient interceptor'ı otomatik olarak Content-Type'ı kaldıracak
  const res = await httpClient.post<{ url: string }>(
    '/system/upload-logo',
    formData,
  );
  return res.data.url;
};

// Antetli kağıt yükleme
export const uploadHeaderPaper = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('headerPaper', file);

  const res = await httpClient.post<{ url: string }>(
    '/system/upload-header-paper',
    formData,
  );
  return res.data.url;
};

// Sistem logları
export const getSystemLogs = async (params?: {
  userId?: string;
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: SystemLog[]; total: number }> => {
  const res = await httpClient.get<{ logs: SystemLog[]; total: number }>(
    '/system/logs',
    { params },
  );
  return res.data;
};

export const getSystemLogById = async (id: string): Promise<SystemLog> => {
  const res = await httpClient.get<SystemLog>(`/system/logs/${id}`);
  return res.data;
};

// Public sistem bilgileri (login yapmadan erişilebilir)
export interface PublicSystemInfo {
  siteName: string;
  siteLogoUrl: string;
}

export const getPublicSystemInfo = async (): Promise<PublicSystemInfo> => {
  const res = await httpClient.get<PublicSystemInfo>('/system/public-info');
  return res.data;
};

