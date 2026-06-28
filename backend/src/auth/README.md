# Auth Module

Authentication ve authorization katmanı: JWT access/refresh token, rate limit, brute force koruması, logging.

## Klasör Yapısı

```
auth/
├── application/
│   └── services/
│       └── auth-application.service.ts   # Controller uyum katmanı; AuthService'e delegate
├── domain/
│   ├── entities/
│   │   └── user-session.entity.ts
│   └── types/
│       └── token-payload.types.ts        # AccessPayload, RefreshPayload
├── infrastructure/
│   └── services/
│       ├── token.service.ts             # JWT signAccess, signRefresh, verifyRefresh
│       ├── password.service.ts          # hash, compare (bcrypt)
│       └── auth-brute-force.service.ts  # IP bazlı başarısız giriş sayacı + kilitleme
├── presentation/
│   └── controllers/
│       └── auth.controller.ts
├── strategies/
│   └── jwt.strategy.ts                  # Passport JWT + 1 dk user cache
├── guards/
│   ├── jwt-auth.guard.ts                # Global; @Public hariç JWT zorunlu
│   ├── roles.guard.ts                   # @Roles
│   ├── permissions.guard.ts             # Global; @Permissions veya ADMIN
│   └── auth-rate-limit.guard.ts         # login/refresh: 10 req/dk per IP
├── decorators/
│   ├── current-user.decorator.ts
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── permissions.decorator.ts
├── dto/
│   ├── login.dto.ts
│   └── refresh-token.dto.ts
├── auth.service.ts                      # İş mantığı: login, refresh, logout, createSession
├── auth.module.ts
├── permission.enum.ts
└── role-permissions.map.ts
```

## Akış Özeti

| Endpoint | Açıklama |
|----------|----------|
| `POST /auth/login` | Email + şifre → access + refresh token; rate limit + brute force uygulanır. |
| `POST /auth/refresh` | Refresh token → yeni access + refresh (token rotation); eski refresh revoke. |
| `POST /auth/logout` | JWT gerekli; kullanıcının tüm refresh token'ları revoke, audit log. |

- **TokenService:** Access/refresh JWT üretimi ve doğrulama.
- **PasswordService:** Şifre hash (user oluşturma) ve compare (login); Auth + Users modülü kullanır.
- **AuthBruteForceService:** 5 başarısız giriş (IP) → 15 dk kilitleme (in-memory).
- **AuthRateLimitGuard:** login ve refresh için 10 istek/dk per IP; 429 aşımda.
- **JwtStrategy:** Her istekte token doğrulanır; kullanıcı bilgisi 1 dk TTL cache'ten veya DB'den.
- **Auth logging:** Başarısız/başarılı login (maskeli email, IP), refresh kullanımı; PII maskeleme.

## Guard Sırası (Global)

1. **JwtAuthGuard** – @Public hariç JWT zorunlu.
2. **PermissionsGuard** – @Permissions yoksa geçer; varsa ADMIN veya en az bir permission.

Controller'da `@UseGuards(AuthRateLimitGuard)` sadece login ve refresh üzerinde.

## Bağımlılıklar

- **UsersModule** (forwardRef), **PrismaModule**, **ConfigModule**, **SystemModule** (forwardRef), **JwtModule**.
- **Exports:** AuthService, TokenService, PasswordService (Users modülü user oluşturmada PasswordService kullanır).

## Production

- `markdowns/AUTH_MIMARI_PLAN.md` – Mimari plan ve uygulama durumu.
- `markdowns/AUTH_PRODUCTION_CHECKLIST.md` – Canlıya almadan önce env, migration, HTTPS vb. kontrol listesi.
