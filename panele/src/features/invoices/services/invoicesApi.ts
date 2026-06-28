import httpClient from '../../../shared/services/httpClient';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNo: string;
  recipient: string;
  issueDate: string;
  dueDate?: string | null;
  month: number;
  year: number;
  amount: number | string;
  status: InvoiceStatus;
  description?: string | null;
  documentUrl?: string | null;
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceDto {
  invoiceNo: string;
  recipient: string;
  issueDate?: string;
  dueDate?: string;
  month: number;
  year: number;
  amount: string;
  status?: InvoiceStatus;
  description?: string;
  documentUrl?: string;
}

export interface UpdateInvoiceDto {
  invoiceNo?: string;
  recipient?: string;
  issueDate?: string;
  dueDate?: string;
  month?: number;
  year?: number;
  amount?: string;
  status?: InvoiceStatus;
  description?: string;
  documentUrl?: string;
  clearDocument?: boolean;
}

export const getInvoices = async (filters?: {
  search?: string;
  year?: number;
  month?: number;
  status?: InvoiceStatus;
}): Promise<Invoice[]> => {
  const res = await httpClient.get<Invoice[]>('/invoices', { params: filters });
  return Array.isArray(res.data) ? res.data : [];
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const res = await httpClient.get<Invoice>(`/invoices/${id}`);
  return res.data;
};

export const createInvoice = async (dto: CreateInvoiceDto): Promise<Invoice> => {
  const res = await httpClient.post<Invoice>('/invoices', dto);
  return res.data;
};

export const updateInvoice = async (id: string, dto: UpdateInvoiceDto): Promise<Invoice> => {
  const res = await httpClient.patch<Invoice>(`/invoices/${id}`, dto);
  return res.data;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await httpClient.delete(`/invoices/${id}`);
};

export const uploadInvoiceDocument = async (
  file: File,
  month: number,
  year: number,
  fileName?: string,
): Promise<{ fileUrl: string; fileName: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('month', month.toString());
  formData.append('year', year.toString());
  if (fileName) formData.append('fileName', fileName);

  const res = await httpClient.post<{ fileUrl: string; fileName: string }>(
    '/invoices/upload-document',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
};

/** Fatura PDF’ini uygulama içi PDF.js önizleyicide göstermek için blob alır */
export const fetchInvoiceDocumentBlob = async (invoiceId: string): Promise<Blob> => {
  const token = sessionStorage.getItem('accessToken');
  const API_BASE_URL = httpClient.defaults.baseURL || 'http://localhost:3000';
  const url = `${API_BASE_URL}/invoices/${invoiceId}/document/view`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Dosya görüntülenemedi');
  }

  return response.blob();
};

export const downloadInvoiceDocument = async (
  invoiceId: string,
  fileName?: string,
): Promise<void> => {
  const token = sessionStorage.getItem('accessToken');
  const API_BASE_URL = httpClient.defaults.baseURL || 'http://localhost:3000';
  const url = `${API_BASE_URL}/invoices/${invoiceId}/document/download`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Dosya indirilemedi');
  }

  let finalFileName = fileName || 'fatura.pdf';
  if (!fileName) {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match?.[1]) {
        try { finalFileName = decodeURIComponent(utf8Match[1].trim()); } catch { /* ignore */ }
      } else {
        const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
        if (quotedMatch?.[1]) finalFileName = quotedMatch[1];
      }
    }
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = finalFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};
