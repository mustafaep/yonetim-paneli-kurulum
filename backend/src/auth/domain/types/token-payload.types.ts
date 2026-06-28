/**
 * Token tipleri – access ve refresh token'ları ayırt etmek için.
 * Aynı JWT secret kullanıldığından type claim zorunludur.
 */
export const TOKEN_TYPE_ACCESS = 'access' as const;
export const TOKEN_TYPE_REFRESH = 'refresh' as const;

/**
 * JWT Access Token payload tipi.
 * Strategy ve Guard'lar bu yapıyı kullanır.
 */
export interface AccessPayload {
  type: typeof TOKEN_TYPE_ACCESS;
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}

/**
 * JWT Refresh Token payload tipi (sadece sub).
 */
export interface RefreshPayload {
  type: typeof TOKEN_TYPE_REFRESH;
  sub: string;
}
