// src/types/region.ts

export interface Province {
    id: string;
    name: string;
    code?: string | null;
  }
  
  export interface District {
    id: string;
    name: string;
    provinceId: string;
    province?: {
      id: string;
      name: string;
    } | null;
  }
  
// 🔹 Kullanıcı scope tipleri (GET /regions/user-scope/:userId)
export interface UserScope {
  id: string;
  province?: { id: string; name: string } | null;
  district?: { id: string; name: string } | null;
}

// 🔹 Institution
export interface Institution {
  id: string;
  name: string;
  provinceId?: string | null;
  districtId?: string | null;
  isActive: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdBy?: string | null;
  province?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  district?: {
    id: string;
    name: string;
  } | null;
  memberCount?: number;
  createdAt?: string;
}

// 🔹 Branch
export interface Branch {
  id: string;
  name: string;
  code?: string | null;
  presidentId?: string | null;
  isActive: boolean;
  branchSharePercent: number;
  provinceId?: string | null;
  districtId?: string | null;
  province?: {
    id: string;
    name: string;
  } | null;
  district?: {
    id: string;
    name: string;
  } | null;
  president?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

// 🔹 TevkifatCenter
export interface TevkifatCenter {
  id: string;
  name: string;
  title?: string | null;
  isActive: boolean;
  provinceId?: string | null;
  districtId?: string | null;
  province?: {
    id: string;
    name: string;
  } | null;
  district?: {
    id: string;
    name: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}
  
  