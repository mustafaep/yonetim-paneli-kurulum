// src/features/professions/services/professionsApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface Profession {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 🔹 Meslek/Unvan listesini getir (aktif olanlar)
export const getProfessions = async (): Promise<Profession[]> => {
  const res = await httpClient.get<Profession[]>('/professions');
  return Array.isArray(res.data) ? res.data : [];
};

// 🔹 Tüm meslek/unvanları getir (aktif ve pasif)
export const getAllProfessions = async (): Promise<Profession[]> => {
  const res = await httpClient.get<Profession[]>('/professions/all');
  return Array.isArray(res.data) ? res.data : [];
};

// 🔹 Meslek/Unvan detayını getir
export const getProfessionById = async (id: string): Promise<Profession> => {
  const res = await httpClient.get<Profession>(`/professions/${id}`);
  return res.data;
};

// 🔹 Meslek/Unvan oluştur
export const createProfession = async (data: { name: string }): Promise<Profession> => {
  const res = await httpClient.post<Profession>('/professions', data);
  return res.data;
};

// 🔹 Meslek/Unvan güncelle
export const updateProfession = async (
  id: string,
  data: { name?: string; isActive?: boolean },
): Promise<Profession> => {
  const res = await httpClient.patch<Profession>(`/professions/${id}`, data);
  return res.data;
};

// 🔹 Meslek/Unvan sil
export const deleteProfession = async (id: string): Promise<void> => {
  await httpClient.delete(`/professions/${id}`);
};
