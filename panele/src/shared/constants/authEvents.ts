// src/shared/constants/authEvents.ts
// httpClient ↔ AuthContext arasında senkronizasyon için kullanılan event isimleri.
// Circular dependency'yi önlemek için ayrı bir dosyada tutulur.

export const AUTH_EVENTS = {
  /** httpClient refresh interceptor'u yeni token aldığında tetiklenir */
  TOKENS_UPDATED: 'auth:tokens-updated',
  /** Oturum tamamen geçersiz olduğunda tetiklenir (refresh de başarısız) */
  SESSION_EXPIRED: 'auth:session-expired',
} as const;
