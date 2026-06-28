// src/features/regions/services/regionsApi.ts
import httpClient from '../../../shared/services/httpClient';
import type {
  Province,
  District,
  UserScope,
  Institution,
} from '../../../types/region';

// 🔹 İller
export const getProvinces = async (): Promise<Province[]> => {
  const res = await httpClient.get<Province[]>('/regions/provinces');
  return Array.isArray(res.data) ? res.data : [];
};

export const createProvince = async (payload: {
  name: string;
  code?: string;
}): Promise<Province> => {
  const res = await httpClient.post<Province>('/regions/provinces', payload);
  return res.data;
};

export const updateProvince = async (
  id: string,
  payload: {
    name: string;
    code?: string;
  },
): Promise<Province> => {
  const res = await httpClient.put<Province>(`/regions/provinces/${id}`, payload);
  return res.data;
};

export const getProvinceById = async (id: string): Promise<Province & {
  districtCount?: number;
  institutionCount?: number;
  memberCount?: number;
}> => {
  const res = await httpClient.get<Province & {
    districtCount?: number;
    institutionCount?: number;
    memberCount?: number;
  }>(`/regions/provinces/${id}`);
  return res.data;
};

// 🔹 İlçeler
export const getDistricts = async (
  provinceId?: string,
): Promise<District[]> => {
  const res = await httpClient.get<District[]>('/regions/districts', {
    params: provinceId ? { provinceId } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const createDistrict = async (payload: {
  name: string;
  provinceId: string;
}): Promise<District> => {
  const res = await httpClient.post<District>('/regions/districts', payload);
  return res.data;
};

export const updateDistrict = async (
  id: string,
  payload: {
    name: string;
    provinceId: string;
  },
): Promise<District> => {
  const res = await httpClient.put<District>(`/regions/districts/${id}`, payload);
  return res.data;
};

export const getDistrictById = async (id: string): Promise<District & {
  institutionCount?: number;
  memberCount?: number;
}> => {
  const res = await httpClient.get<District & {
    institutionCount?: number;
    memberCount?: number;
  }>(`/regions/districts/${id}`);
  return res.data;
};

// 🔹 Kullanıcı scope
export const getUserScopes = async (userId: string): Promise<UserScope[]> => {
  const res = await httpClient.get<UserScope[]>(`/regions/user-scope/${userId}`);
  return Array.isArray(res.data) ? res.data : [];
};

export const createUserScope = async (payload: {
  userId: string;
  provinceId?: string;
  districtId?: string;
}): Promise<UserScope> => {
  const res = await httpClient.post<UserScope>('/regions/user-scope', payload);
  return res.data;
};

export const updateUserScope = async (
  scopeId: string,
  payload: {
    provinceId?: string;
    districtId?: string;
  },
): Promise<UserScope> => {
  const res = await httpClient.patch<UserScope>(`/regions/user-scope/${scopeId}`, payload);
  return res.data;
};

export const deleteUserScope = async (scopeId: string): Promise<void> => {
  await httpClient.delete(`/regions/user-scope/${scopeId}`);
};

// 🔹 Kurumlar
export const getInstitutions = async (filters?: {
  provinceId?: string;
  districtId?: string;
  isActive?: boolean;
}): Promise<Institution[]> => {
  const res = await httpClient.get<Institution[]>('/regions/institutions', {
    params: filters,
  });
  return Array.isArray(res.data) ? res.data : [];
};

export const getInstitutionById = async (id: string): Promise<Institution> => {
  const res = await httpClient.get<Institution>(`/regions/institutions/${id}`);
  return res.data;
};

export const createInstitution = async (payload: {
  name: string;
  provinceId?: string;
  districtId?: string;
}): Promise<Institution> => {
  const res = await httpClient.post<Institution>('/regions/institutions', payload);
  return res.data;
};

export const updateInstitution = async (
  id: string,
  payload: {
    name: string;
    provinceId?: string | null;
    districtId?: string | null;
    isActive?: boolean;
  },
): Promise<Institution> => {
  const res = await httpClient.put<Institution>(`/regions/institutions/${id}`, payload);
  return res.data;
};

export const approveInstitution = async (id: string): Promise<Institution> => {
  const res = await httpClient.post<Institution>(`/regions/institutions/${id}/approve`);
  return res.data;
};

export interface DeleteInstitutionDto {
  memberActionType: 'REMOVE_INSTITUTION' | 'TRANSFER_TO_INSTITUTION' | 'REMOVE_AND_DEACTIVATE' | 'TRANSFER_AND_DEACTIVATE' | 'TRANSFER_AND_CANCEL';
  targetInstitutionId?: string;
}

export const deleteInstitution = async (id: string, dto?: DeleteInstitutionDto): Promise<void> => {
  await httpClient.delete(`/regions/institutions/${id}`, dto ? { data: dto } : undefined);
};
