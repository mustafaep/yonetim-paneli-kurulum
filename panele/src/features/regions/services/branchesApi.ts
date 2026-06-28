// src/features/regions/services/branchesApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface Branch {
  id: string;
  name: string;
  code?: string | null;
  presidentId?: string;
  president?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  isActive: boolean;
  provinceId?: string | null;
  districtId?: string | null;
  province?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  district?: {
    id: string;
    name: string;
  } | null;
  branchSharePercent?: number | string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchDetail extends Branch {
  activeMemberCount: number;
  totalRevenue: number | string;
  branchShareAmount: number | string;
}

export interface CreateBranchDto {
  name: string;
  provinceId?: string;
  districtId?: string;
}

export interface UpdateBranchDto {
  name?: string;
  isActive?: boolean;
  provinceId?: string | null;
  districtId?: string | null;
}

export interface AssignPresidentDto {
  presidentId: string;
}

// Şube listesi
export const getBranches = async (params?: {
  isActive?: boolean;
  provinceId?: string;
  districtId?: string;
}): Promise<Branch[]> => {
  const res = await httpClient.get<Branch[]>('/regions/branches', { params });
  return Array.isArray(res.data) ? res.data : [];
};

// Şube detayı
export const getBranchById = async (id: string): Promise<BranchDetail> => {
  const res = await httpClient.get<BranchDetail>(`/regions/branches/${id}`);
  return res.data;
};

// Şube oluştur
export const createBranch = async (payload: CreateBranchDto): Promise<Branch> => {
  const res = await httpClient.post<Branch>('/regions/branches', payload);
  return res.data;
};

// Şube güncelle
export const updateBranch = async (
  id: string,
  payload: UpdateBranchDto,
): Promise<Branch> => {
  const res = await httpClient.put<Branch>(`/regions/branches/${id}`, payload);
  return res.data;
};

export interface DeleteBranchDto {
  memberActionType: 'TRANSFER_TO_BRANCH' | 'TRANSFER_AND_DEACTIVATE' | 'TRANSFER_AND_CANCEL' | 'TRANSFER_DEACTIVATE_AND_CANCEL';
  targetBranchId: string;
}

// Şube sil
export const deleteBranch = async (id: string, dto: DeleteBranchDto): Promise<void> => {
  await httpClient.delete(`/regions/branches/${id}`, { data: dto });
};

// Şube başkanı ata
export const assignBranchPresident = async (
  id: string,
  payload: AssignPresidentDto,
): Promise<Branch> => {
  const res = await httpClient.post<Branch>(`/regions/branches/${id}/assign-president`, payload);
  return res.data;
};

