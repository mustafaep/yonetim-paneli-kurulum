// src/features/auth/services/authApi.ts
import httpClient from '../../../shared/services/httpClient';
import type { LoginRequest, LoginResponse, RefreshResponse } from '../../../types/auth';

export const loginApi = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await httpClient.post<LoginResponse>('/auth/login', data);
  return response.data;
};

export const refreshApi = async (refreshToken: string): Promise<RefreshResponse> => {
  const response = await httpClient.post<RefreshResponse>('/auth/refresh', { refreshToken });
  return response.data;
};

export const logoutApi = async (): Promise<{ message: string }> => {
  const response = await httpClient.post<{ message: string }>('/auth/logout');
  return response.data;
};

export const logoutAllApi = async (): Promise<{ message: string; revokedCount: number }> => {
  const response = await httpClient.post<{ message: string; revokedCount: number }>('/auth/logout-all');
  return response.data;
};
