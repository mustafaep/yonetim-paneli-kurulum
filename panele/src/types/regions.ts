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


export interface Dealer {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  province?: {
    id: string;
    name: string;
  } | null;
  district?: {
    id: string;
    name: string;
  } | null;
}

// 🔹 Kullanıcı scope tipleri (GET /regions/user-scope/:userId)
export interface UserScope {
  id: string;
  province?: { id: string; name: string } | null;
  district?: { id: string; name: string } | null;
  dealer?: { id: string; name: string } | null;
}
