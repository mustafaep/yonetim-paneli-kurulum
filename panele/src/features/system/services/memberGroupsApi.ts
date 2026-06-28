// src/features/system/services/memberGroupsApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface MemberGroup {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberGroupDto {
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateMemberGroupDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

// Aktif üye gruplarını listele
export const getMemberGroups = async (): Promise<MemberGroup[]> => {
  const res = await httpClient.get<MemberGroup[]>('/member-groups');
  return res.data || [];
};

// Tüm üye gruplarını listele (aktif ve pasif)
export const getAllMemberGroups = async (): Promise<MemberGroup[]> => {
  const res = await httpClient.get<MemberGroup[]>('/member-groups/all');
  return res.data || [];
};

// Üye grubu detayını getir
export const getMemberGroupById = async (id: string): Promise<MemberGroup> => {
  const res = await httpClient.get<MemberGroup>(`/member-groups/${id}`);
  return res.data;
};

// Üye grubu oluştur
export const createMemberGroup = async (data: CreateMemberGroupDto): Promise<MemberGroup> => {
  const res = await httpClient.post<MemberGroup>('/member-groups', data);
  return res.data;
};

// Üye grubu güncelle
export const updateMemberGroup = async (id: string, data: UpdateMemberGroupDto): Promise<MemberGroup> => {
  const res = await httpClient.patch<MemberGroup>(`/member-groups/${id}`, data);
  return res.data;
};

// Üye grubu sil
export const deleteMemberGroup = async (id: string): Promise<void> => {
  await httpClient.delete(`/member-groups/${id}`);
};

// Üye grubu sırasını değiştir
export const moveMemberGroup = async (id: string, direction: 'up' | 'down'): Promise<MemberGroup> => {
  const res = await httpClient.post<MemberGroup>(`/member-groups/${id}/move`, { direction });
  return res.data;
};

