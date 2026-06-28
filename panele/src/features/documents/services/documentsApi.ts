// src/features/documents/services/documentsApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  type: 'MEMBER_CERTIFICATE' | 'MEMBER_CARD' | 'LETTER' | 'RESIGNATION_LETTER' | 'EXPULSION_LETTER' | 'APPROVAL_CERTIFICATE' | 'INVITATION_LETTER' | 'CONGRATULATION_LETTER' | 'WARNING_LETTER' | 'NOTIFICATION_LETTER' | 'MEMBERSHIP_APPLICATION' | 'TRANSFER_CERTIFICATE' | 'BULK_MEMBER_LIST' | 'OTHER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDocument {
  id: string;
  memberId: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    memberNumber?: string;
  };
  templateId?: string;
  template?: DocumentTemplate;
  documentType: string;
  fileName: string;
  fileUrl: string;
  generatedAt: string;
  generatedBy: string;
  generatedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/** PDF Oluştur sayfası — son kayıtlar listesi (GET /documents/recent-panel-pdfs) */
export interface RecentPanelPdf {
  id: string;
  fileName: string;
  documentType: string;
  uploadStatus: string;
  generatedAt: string;
  fileUrl: string | null;
  templateId: string | null;
  templateName: string | null;
  memberId: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    registrationNumber: string | null;
  };
  generatedBy: string;
  generatedByUser: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  fromTemplate: boolean;
}

export interface CreateDocumentTemplateDto {
  name: string;
  description?: string;
  template: string;
  type: 'MEMBER_CERTIFICATE' | 'MEMBER_CARD' | 'LETTER' | 'RESIGNATION_LETTER' | 'EXPULSION_LETTER' | 'APPROVAL_CERTIFICATE' | 'INVITATION_LETTER' | 'CONGRATULATION_LETTER' | 'WARNING_LETTER' | 'NOTIFICATION_LETTER' | 'MEMBERSHIP_APPLICATION' | 'TRANSFER_CERTIFICATE' | 'BULK_MEMBER_LIST' | 'OTHER';
}

export interface UpdateDocumentTemplateDto {
  name?: string;
  description?: string;
  template?: string;
  type?: 'MEMBER_CERTIFICATE' | 'MEMBER_CARD' | 'LETTER' | 'RESIGNATION_LETTER' | 'EXPULSION_LETTER' | 'APPROVAL_CERTIFICATE' | 'INVITATION_LETTER' | 'CONGRATULATION_LETTER' | 'WARNING_LETTER' | 'NOTIFICATION_LETTER' | 'MEMBERSHIP_APPLICATION' | 'TRANSFER_CERTIFICATE' | 'BULK_MEMBER_LIST' | 'OTHER';
  isActive?: boolean;
}

export interface GenerateDocumentDto {
  memberId: string;
  templateId: string;
  variables?: Record<string, string>;
  fileName?: string;
}

export interface GenerateMemberListDocumentDto {
  memberIds: string[];
  templateId: string;
  variables?: Record<string, string>;
  fileName?: string;
}

export interface DocumentPreviewResponse {
  previewId: string;
  fileName: string;
  expiresAt: string;
  memberCount?: number;
}

// Doküman şablonları
export const getDocumentTemplates = async (): Promise<DocumentTemplate[]> => {
  const res = await httpClient.get<DocumentTemplate[]>('/documents/templates');
  return Array.isArray(res.data) ? res.data : [];
};

export const getDocumentTemplateById = async (
  id: string,
): Promise<DocumentTemplate> => {
  const res = await httpClient.get<DocumentTemplate>(`/documents/templates/${id}`);
  return res.data;
};

export const createDocumentTemplate = async (
  payload: CreateDocumentTemplateDto,
): Promise<DocumentTemplate> => {
  const res = await httpClient.post<DocumentTemplate>('/documents/templates', payload);
  return res.data;
};

export const updateDocumentTemplate = async (
  id: string,
  payload: UpdateDocumentTemplateDto,
): Promise<DocumentTemplate> => {
  const res = await httpClient.patch<DocumentTemplate>(
    `/documents/templates/${id}`,
    payload,
  );
  return res.data;
};

export const deleteDocumentTemplate = async (id: string): Promise<void> => {
  await httpClient.delete(`/documents/templates/${id}`);
};

export const getRecentPanelPdfs = async (): Promise<RecentPanelPdf[]> => {
  const res = await httpClient.get<RecentPanelPdf[]>('/documents/recent-panel-pdfs');
  return Array.isArray(res.data) ? res.data : [];
};

// Üye doküman geçmişi
export const getMemberDocuments = async (
  memberId: string,
): Promise<MemberDocument[]> => {
  const res = await httpClient.get<MemberDocument[]>(
    `/documents/members/${memberId}`,
  );
  return Array.isArray(res.data) ? res.data : [];
};

// Doküman yükle
export const uploadMemberDocument = async (
  memberId: string,
  file: File,
  documentType: string,
  description?: string,
  fileName?: string,
): Promise<MemberDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  if (description) {
    formData.append('description', description);
  }
  if (fileName) {
    formData.append('fileName', fileName);
  }

  const res = await httpClient.post<MemberDocument>(
    `/documents/members/${memberId}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return res.data;
};

/** Üye dokümanı PDF’ini uygulama içi PDF.js önizleyicide göstermek için blob alır */
export const fetchMemberDocumentBlob = async (documentId: string): Promise<Blob> => {
  const token = sessionStorage.getItem('accessToken');
  const API_BASE_URL = httpClient.defaults.baseURL || 'http://localhost:3000';
  const url = `${API_BASE_URL}/documents/view/${documentId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Dosya görüntülenemedi');
  }

  return response.blob();
};

// Üye dokümanını sil
export const deleteMemberDocument = async (documentId: string): Promise<void> => {
  await httpClient.delete(`/documents/${documentId}`);
};

// PDF oluştur
export const generateDocument = async (
  payload: GenerateDocumentDto,
): Promise<MemberDocument> => {
  const res = await httpClient.post<MemberDocument>('/documents/generate', payload);
  return res.data;
};

export const previewDocument = async (
  payload: GenerateDocumentDto,
): Promise<DocumentPreviewResponse> => {
  const res = await httpClient.post<DocumentPreviewResponse>('/documents/preview', payload);
  return res.data;
};

// Toplu üye listesi PDF oluştur (tek PDF)
export const generateMemberListDocument = async (
  payload: GenerateMemberListDocumentDto,
): Promise<{ fileUrl: string; fileName: string; document: MemberDocument; memberCount: number }> => {
  const res = await httpClient.post('/documents/generate-list', payload);
  return res.data;
};

export const previewMemberListDocument = async (
  payload: GenerateMemberListDocumentDto,
): Promise<DocumentPreviewResponse> => {
  const res = await httpClient.post<DocumentPreviewResponse>('/documents/preview-list', payload);
  return res.data;
};

export const commitDocumentPreview = async (previewId: string) => {
  const res = await httpClient.post(`/documents/preview/${previewId}/commit`);
  return res.data;
};

export const discardDocumentPreview = async (previewId: string) => {
  const res = await httpClient.delete(`/documents/preview/${previewId}`);
  return res.data;
};

export const viewDocumentPreview = async (previewId: string): Promise<Blob> => {
  const token = sessionStorage.getItem('accessToken');
  const API_BASE_URL = httpClient.defaults.baseURL || 'http://localhost:3000';
  const response = await fetch(`${API_BASE_URL}/documents/preview/${previewId}/view`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Preview görüntülenemedi');
  }
  return response.blob();
};

// PDF indir
export const downloadDocument = async (documentId: string, fileName?: string): Promise<void> => {
  const token = sessionStorage.getItem('accessToken');
  const API_BASE_URL = httpClient.defaults.baseURL || 'http://localhost:3000';
  const url = `${API_BASE_URL}/documents/download/${documentId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Dosya indirilemedi');
  }

  // Dosya adını belirle: önce parametre olarak gelen, sonra header'dan, son olarak default
  let finalFileName = fileName || 'document.pdf';
  
  if (!fileName) {
    // Response'dan dosya adını al
    const contentDisposition = response.headers.get('Content-Disposition');
    
    if (contentDisposition) {
      // Content-Disposition formatı: attachment; filename="dosya_adi.pdf" veya attachment; filename*=UTF-8''dosya_adi.pdf
      // Önce filename*=UTF-8'' formatını kontrol et (RFC 5987)
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          finalFileName = decodeURIComponent(utf8Match[1].trim());
        } catch (e) {
          console.warn('UTF-8 filename decode hatası:', e);
        }
      } else {
        // Sonra normal filename="..." formatını kontrol et
        const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
        if (quotedMatch && quotedMatch[1]) {
          finalFileName = quotedMatch[1];
        } else {
          // Son olarak filename=... formatını kontrol et (tırnak olmadan)
          const unquotedMatch = contentDisposition.match(/filename=([^;]+)/i);
          if (unquotedMatch && unquotedMatch[1]) {
            finalFileName = unquotedMatch[1].trim().replace(/^["']|["']$/g, '');
          }
        }
      }
    }
  }

  // Blob oluştur ve indir
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

