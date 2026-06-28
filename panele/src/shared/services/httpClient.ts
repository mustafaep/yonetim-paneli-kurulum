// src/shared/services/httpClient.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { AUTH_EVENTS } from '../constants/authEvents';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : (import.meta.env.PROD ? '/api' : 'http://localhost:3000');

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function isRefreshRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config?.url) return false;
  const url = typeof config.url === 'string' ? config.url : config.url.pathname ?? '';
  return url.includes('/auth/refresh');
}

function clearAuthAndRedirect(): void {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
  // AuthContext'i bilgilendir
  window.dispatchEvent(new Event(AUTH_EVENTS.SESSION_EXPIRED));
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refreshToken = sessionStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('Yenileme belirteci bulunamadı');
  }
  const { data } = await axios.post<{ accessToken: string; refreshToken?: string; user?: unknown }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  sessionStorage.setItem('accessToken', data.accessToken);
  if (data.refreshToken) {
    sessionStorage.setItem('refreshToken', data.refreshToken);
  }
  if (data.user) {
    sessionStorage.setItem('user', JSON.stringify(data.user));
  }
  // AuthContext'i bilgilendir – state güncellensin
  window.dispatchEvent(new Event(AUTH_EVENTS.TOKENS_UPDATED));
  return data.accessToken;
}

// Request interceptor: Authorization header ve FormData desteği
httpClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor: 401 ise önce refresh dene, başarısızsa logout
httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }
    if (isRefreshRequest(error.config)) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }
    try {
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      const config = error.config;
      if (config?.headers) {
        config.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return httpClient.request(config);
    } catch {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }
  },
);

export default httpClient;
