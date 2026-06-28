// src/app/providers/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { BackendUser, LoginRequest, LoginResponse } from '../../types/auth';
import { loginApi, logoutApi } from '../../features/auth/services/authApi';
import type { Role } from '../../types/user';

// ─── Yardımcı: JWT payload decode (doğrulama yapmaz, sadece okur) ───
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ─── Yardımcı: Token'ın süresi dolmuş mu? ───
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  // 30 saniye tampon ekle (clock skew)
  return payload.exp * 1000 < Date.now() + 30_000;
}

// ─── httpClient ↔ AuthContext senkronizasyon event'leri ───
import { AUTH_EVENTS } from '../../shared/constants/authEvents';

type UserMeResponse = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  scopeRestricted?: boolean;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

interface AuthContextValue {
  user: BackendUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const initRef = useRef(false);

  // ─── Oturumu temizle (state + sessionStorage) ───
  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  }, []);

  const fetchCurrentUserProfile = useCallback(async (): Promise<BackendUser | null> => {
    try {
      const { httpClient } = await import('../../shared/services/httpClient');
      const { data } = await httpClient.get<UserMeResponse>('/users/me');
      const firstName = data.member?.firstName?.trim() || data.firstName?.trim() || '';
      const lastName = data.member?.lastName?.trim() || data.lastName?.trim() || '';

      return {
        id: data.id,
        email: data.email,
        firstName,
        lastName,
        roles: (data.roles ?? []) as Role[],
        permissions: data.permissions ?? [],
        scopeRestricted: data.scopeRestricted ?? false,
      };
    } catch {
      return null;
    }
  }, []);

  // ─── İlk yükleme: sessionStorage'daki token'ları doğrula ───
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      const storedToken = sessionStorage.getItem('accessToken');
      const storedUser = sessionStorage.getItem('user');
      const storedRefreshToken = sessionStorage.getItem('refreshToken');

      // Token yoksa → giriş yok
      if (!storedToken || !storedUser) {
        clearSession();
        setIsLoading(false);
        return;
      }

      // Access token süresi dolmuş mu?
      if (isTokenExpired(storedToken)) {
        // Refresh token ile yenilemeyi dene
        if (storedRefreshToken && !isTokenExpired(storedRefreshToken)) {
          try {
            const { httpClient } = await import('../../shared/services/httpClient');
            const API_BASE_URL = httpClient.defaults.baseURL;
            const { default: axios } = await import('axios');
            const { data } = await axios.post<{
              accessToken: string;
              refreshToken?: string;
              user?: BackendUser;
            }>(`${API_BASE_URL}/auth/refresh`, { refreshToken: storedRefreshToken }, {
              headers: { 'Content-Type': 'application/json' },
            });

            sessionStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) {
              sessionStorage.setItem('refreshToken', data.refreshToken);
            }
            if (data.user) {
              const refreshedUser: BackendUser = {
                id: data.user.id,
                email: data.user.email,
                firstName: data.user.firstName ?? '',
                lastName: data.user.lastName ?? '',
                roles: (data.user.roles ?? []) as Role[],
                permissions: data.user.permissions ?? [],
              };
              sessionStorage.setItem('user', JSON.stringify(refreshedUser));
              setUser(refreshedUser);
            } else {
              try {
                setUser(JSON.parse(storedUser));
              } catch {
                clearSession();
                setIsLoading(false);
                return;
              }
            }
            setAccessToken(data.accessToken);
            setIsLoading(false);
            return;
          } catch {
            // Refresh de başarısız → oturumu temizle
            clearSession();
            setIsLoading(false);
            return;
          }
        }

        // Refresh token yok veya o da expired → oturumu temizle
        clearSession();
        setIsLoading(false);
        return;
      }

      // Access token henüz geçerli → kullan
      let parsedUser: BackendUser;
      try {
        parsedUser = JSON.parse(storedUser);
      } catch {
        clearSession();
        setIsLoading(false);
        return;
      }

      setAccessToken(storedToken);
      setUser(parsedUser);

      // Arka planda backend'den token geçerliliğini doğrula
      try {
        const { httpClient } = await import('../../shared/services/httpClient');
        const { data } = await httpClient.get<{
          userId: string;
          email: string;
          roles: string[];
          permissions: string[];
        }>('/auth/me');
        const profile = await fetchCurrentUserProfile();
        // Backend'den gelen güncel rolleri/izinleri + kullanıcı profilini uygula.
        // Üyeye bağlı panel kullanıcılarında isim/soyisim member kaydından gelir.
        const updatedUser: BackendUser = {
          ...(profile ?? parsedUser),
          id: data.userId ?? profile?.id ?? parsedUser.id,
          email: data.email ?? profile?.email ?? parsedUser.email,
          roles: (data.roles ?? profile?.roles ?? parsedUser.roles) as Role[],
          permissions: data.permissions ?? profile?.permissions ?? parsedUser.permissions,
        };
        setUser(updatedUser);
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      } catch {
        // /auth/me 401 döndüyse interceptor refresh deneyecek
        // Eğer o da başarısız olursa clearAuthAndRedirect çalışacak
        // Burada ekstra bir şey yapmamıza gerek yok
      }

      setIsLoading(false);
    };

    initAuth();
  }, [clearSession, fetchCurrentUserProfile]);

  // ─── httpClient'tan gelen senkronizasyon event'lerini dinle ───
  useEffect(() => {
    const handleTokensUpdated = () => {
      const newToken = sessionStorage.getItem('accessToken');
      const newUser = sessionStorage.getItem('user');
      if (newToken) {
        setAccessToken(newToken);
      }
      if (newUser) {
        try {
          setUser(JSON.parse(newUser));
        } catch {
          // JSON parse hatası → mevcut state'i koru
        }
      }
    };

    const handleSessionExpired = () => {
      clearSession();
    };

    window.addEventListener(AUTH_EVENTS.TOKENS_UPDATED, handleTokensUpdated);
    window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);

    return () => {
      window.removeEventListener(AUTH_EVENTS.TOKENS_UPDATED, handleTokensUpdated);
      window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
    };
  }, [clearSession]);

  const login = async (credentials: LoginRequest) => {
    const data: LoginResponse = await loginApi(credentials);
    const loginUser: BackendUser = {
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName ?? '',
      lastName: data.user.lastName ?? '',
      roles: (data.user.roles ?? []) as Role[],
      permissions: data.user.permissions ?? [],
      scopeRestricted: data.user.scopeRestricted ?? false,
    };

    const profileUser = await fetchCurrentUserProfile();
    const mergedUser: BackendUser = profileUser
      ? {
          ...profileUser,
          roles: profileUser.roles?.length
            ? profileUser.roles
            : loginUser.roles,
          permissions: profileUser.permissions?.length
            ? profileUser.permissions
            : loginUser.permissions,
        }
      : loginUser;

    setAccessToken(data.accessToken);
    setUser(mergedUser);
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('user', JSON.stringify(mergedUser));
    if (data.refreshToken) {
      sessionStorage.setItem('refreshToken', data.refreshToken);
    }
  };

  const logout = async () => {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        try {
          await logoutApi();
        } catch (error) {
          console.error('Logout API hatası:', error);
        }
      }
    } catch (error) {
      console.error('Logout hatası:', error);
    } finally {
      clearSession();
    }
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.roles?.includes('ADMIN')) return true;
    const permissions = user.permissions ?? [];
    if (permissions.includes(permission)) return true;

    // Backward compatibility for renamed tevkifat permissions
    if (permission === 'TEVKIFAT_VIEW' && permissions.includes('ACCOUNTING_VIEW')) {
      return true;
    }
    if (permission === 'TEVKIFAT_EXPORT' && permissions.includes('ACCOUNTING_EXPORT')) {
      return true;
    }
    if (permission === 'ACCOUNTING_VIEW' && permissions.includes('TEVKIFAT_VIEW')) {
      return true;
    }
    if (permission === 'ACCOUNTING_EXPORT' && permissions.includes('TEVKIFAT_EXPORT')) {
      return true;
    }

    return false;
  };

  const hasRole = (role: Role) => {
    if (!user) return false;
    return user.roles?.includes(role);
  };

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
