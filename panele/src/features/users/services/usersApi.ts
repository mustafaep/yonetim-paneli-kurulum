// src/features/users/services/usersApi.ts
import httpClient from '../../../shared/services/httpClient';
import type { UserListItem, UserDetail, Role } from '../../../types/user';

export const getUsers = async (): Promise<UserListItem[]> => {
  const res = await httpClient.get<UserListItem[]>('/users');
  return res.data;
};

export const getUserById = async (id: string): Promise<UserDetail> => {
  const res = await httpClient.get<UserDetail>(`/users/${id}`);
  return res.data;
};

// 🔹 Kullanıcı rolleri güncelle: PATCH /users/:id/roles
export const updateUserRoles = async (
  id: string,
  customRoleIds: string[],
): Promise<UserDetail> => {
  const res = await httpClient.patch<UserDetail>(`/users/${id}/roles`, {
    customRoleIds,
  });
  return res.data;
};

export interface UpdateUserAccountDto {
  email: string;
  password?: string;
}

export const updateUserAccount = async (
  id: string,
  dto: UpdateUserAccountDto,
): Promise<UserDetail> => {
  const res = await httpClient.patch<UserDetail>(`/users/${id}/account`, dto);
  return res.data;
};

/** Üyeye bağlı panel hesabını kapatır; kişi yalnız üye kalır ve yeniden başvuru yapılabilir. */
export const demoteUserToMember = async (userId: string): Promise<void> => {
  await httpClient.post(`/users/${userId}/demote-to-member`);
};
