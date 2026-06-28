// src/features/regions/services/institutionsApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface Institution {
  id: string;
  name: string;
  provinceId?: string | null;
  districtId?: string | null;
  isActive: boolean;
  approvedAt?: string;
  province?: {
    id: string;
    name: string;
    code?: string;
  };
  district?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Kurum listesi
export const getInstitutions = async (params?: {
  provinceId?: string;
  districtId?: string;
  isActive?: boolean;
}): Promise<Institution[]> => {
  const res = await httpClient.get<Institution[]>('/regions/institutions', { params });
  return Array.isArray(res.data) ? res.data : [];
};

