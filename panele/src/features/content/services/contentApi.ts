// src/features/content/services/contentApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface Content {
  id: string;
  title: string;
  content: string;
  type: 'NEWS' | 'ANNOUNCEMENT' | 'EVENT';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
  authorId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentDto {
  title: string;
  content: string;
  type: 'NEWS' | 'ANNOUNCEMENT' | 'EVENT';
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface UpdateContentDto {
  title?: string;
  content?: string;
  type?: 'NEWS' | 'ANNOUNCEMENT' | 'EVENT';
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

// İçerik listesi
export const getContents = async (params?: {
  type?: 'NEWS' | 'ANNOUNCEMENT' | 'EVENT';
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}): Promise<Content[]> => {
  const res = await httpClient.get<Content[]>('/content', { params });
  return Array.isArray(res.data) ? res.data : [];
};

// İçerik detayı
export const getContentById = async (id: string): Promise<Content> => {
  const res = await httpClient.get<Content>(`/content/${id}`);
  return res.data;
};

// İçerik oluştur
export const createContent = async (payload: CreateContentDto): Promise<Content> => {
  const res = await httpClient.post<Content>('/content', payload);
  return res.data;
};

// İçerik güncelle
export const updateContent = async (
  id: string,
  payload: UpdateContentDto,
): Promise<Content> => {
  const res = await httpClient.put<Content>(`/content/${id}`, payload);
  return res.data;
};

// İçerik sil
export const deleteContent = async (id: string): Promise<void> => {
  await httpClient.delete(`/content/${id}`);
};

// İçerik yayınla
export const publishContent = async (id: string): Promise<Content> => {
  const res = await httpClient.post<Content>(`/content/${id}/publish`);
  return res.data;
};
