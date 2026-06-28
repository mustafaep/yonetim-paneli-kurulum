// src/features/roles/services/rolesApi.ts
import httpClient from '../../../shared/services/httpClient';
import type {
  RoleListItem,
  CustomRole,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from '../../../types/role';

export const getRoles = async (): Promise<RoleListItem[]> => {
  const res = await httpClient.get<RoleListItem[]>('/roles');
  return res.data;
};

export const getRoleById = async (id: string): Promise<CustomRole> => {
  const res = await httpClient.get<CustomRole>(`/roles/${id}`);
  return res.data;
};

export const createRole = async (dto: CreateRoleDto): Promise<CustomRole> => {
  const res = await httpClient.post<CustomRole>('/roles', dto);
  return res.data;
};

export const updateRole = async (
  id: string,
  dto: UpdateRoleDto,
): Promise<CustomRole> => {
  const res = await httpClient.put<CustomRole>(`/roles/${id}`, dto);
  return res.data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await httpClient.delete(`/roles/${id}`);
};

export const updateRolePermissions = async (
  id: string,
  dto: UpdateRolePermissionsDto,
): Promise<CustomRole> => {
  const res = await httpClient.put<CustomRole>(`/roles/${id}/permissions`, dto);
  return res.data;
};
