import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  private settingsCache: Map<string, string> = new Map();
  private cacheInitialized = false;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadSettingsCache();
    this.validateSecurityConfig();
  }

  /**
   * Güvenlik yapılandırmasını kontrol eder ve uyarı loglar.
   */
  private validateSecurityConfig(): void {
    const defaultSecret = 'your-secret-key-change-in-production';
    if (this.jwtSecret === defaultSecret) {
      this.logger.error(
        '⚠️  JWT_SECRET ortam değişkeni ayarlanmamış! Varsayılan secret kullanılıyor. ' +
          'PRODUCTION ortamında bu ÇOK TEHLİKELİDİR. Lütfen güçlü bir secret belirleyin.',
      );
    }
    if (this.jwtSecret.length < 32) {
      this.logger.warn(
        'JWT_SECRET çok kısa (< 32 karakter). Güvenlik için en az 32 karakterlik bir secret kullanılması önerilir.',
      );
    }
    if (this.isProduction && !this.membershipInquiryToken) {
      this.logger.warn(
        'MEMBERSHIP_INQUIRY_TOKEN tanımlı değil. Üyelik sorgulama endpoint’i production’da kimlik doğrulamasız açıktır; ' +
          'güvenlik için ortam değişkenini ayarlayın (panel ile aynı gizli değer).',
      );
    }
  }

  /**
   * Sistem ayarlarını cache'e yükler
   */
  async loadSettingsCache(): Promise<void> {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: { isEditable: true },
      });
      this.settingsCache.clear();
      settings.forEach((setting) => {
        this.settingsCache.set(setting.key, setting.value);
      });
      this.cacheInitialized = true;
    } catch (error) {
      console.error('Failed to load system settings cache:', error);
    }
  }

  /**
   * Cache'i invalidate eder (ayar değiştiğinde çağrılır)
   */
  async invalidateSettingsCache(key?: string): Promise<void> {
    if (key) {
      // Sadece belirli bir ayarı yeniden yükle
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key },
      });
      if (setting) {
        this.settingsCache.set(key, setting.value);
      } else {
        this.settingsCache.delete(key);
      }
    } else {
      // Tüm cache'i yeniden yükle
      await this.loadSettingsCache();
    }
  }

  /**
   * Sistem ayarını cache'den okur
   */
  getSystemSetting(key: string, defaultValue?: string): string | undefined {
    return this.settingsCache.get(key) || defaultValue;
  }

  /**
   * Sistem ayarını boolean olarak okur
   */
  getSystemSettingBoolean(key: string, defaultValue = false): boolean {
    const value = this.getSystemSetting(key);
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Sistem ayarını number olarak okur
   */
  getSystemSettingNumber(key: string, defaultValue = 0): number {
    const value = this.getSystemSetting(key);
    if (!value) return defaultValue;
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }
  get port(): number {
    return parseInt(process.env.PORT || '3000', 10);
  }

  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get corsOrigin(): string {
    return process.env.CORS_ORIGIN || 'http://localhost:5173';
  }

  get corsCredentials(): boolean {
    return process.env.CORS_CREDENTIALS === 'true';
  }

  // Redis Configuration
  get redisEnabled(): boolean {
    const value = (process.env.REDIS_ENABLED || 'false').toLowerCase();
    return value === 'true' || value === '1';
  }

  get redisHost(): string {
    return process.env.REDIS_HOST || 'localhost';
  }

  get redisPort(): number {
    return parseInt(process.env.REDIS_PORT || '6379', 10);
  }

  get redisPassword(): string | undefined {
    return process.env.REDIS_PASSWORD;
  }

  get redisUrl(): string {
    if (this.redisPassword) {
      return `redis://:${this.redisPassword}@${this.redisHost}:${this.redisPort}`;
    }
    return `redis://${this.redisHost}:${this.redisPort}`;
  }

  // AWS SES Configuration
  get awsSesRegion(): string {
    return process.env.AWS_SES_REGION || 'us-east-1';
  }

  get awsSesAccessKeyId(): string | undefined {
    return process.env.AWS_SES_ACCESS_KEY_ID;
  }

  get awsSesSecretAccessKey(): string | undefined {
    return process.env.AWS_SES_SECRET_ACCESS_KEY;
  }

  get awsSesFromEmail(): string | undefined {
    return process.env.AWS_SES_FROM_EMAIL;
  }

  // NetGSM Configuration
  get netgsmUsername(): string | undefined {
    return process.env.NETGSM_USERNAME;
  }

  get netgsmPassword(): string | undefined {
    return process.env.NETGSM_PASSWORD;
  }

  get netgsmMsgHeader(): string | undefined {
    return process.env.NETGSM_MSG_HEADER;
  }

  get netgsmApiUrl(): string {
    return (
      process.env.NETGSM_API_URL || 'https://api.netgsm.com.tr/sms/send/get'
    );
  }

  // WAHA (WhatsApp HTTP API) Configuration
  get wahaApiUrl(): string {
    return process.env.WAHA_API_URL || 'http://localhost:3001';
  }

  get wahaApiKey(): string | undefined {
    return process.env.WAHA_API_KEY;
  }

  get wahaSessionName(): string {
    return process.env.WAHA_SESSION_NAME || 'default';
  }

  /**
   * WAHA'nın webhook isteğiyle göndereceği paylaşılan gizli anahtar.
   * Tanımlı değilse webhook doğrulaması atlanır (geliştirme ortamı).
   */
  get wahaWebhookSecret(): string | undefined {
    return process.env.WAHA_WEBHOOK_SECRET?.trim() || undefined;
  }

  // JWT Configuration
  get jwtSecret(): string {
    return process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  }

  /** Access token süresi (kısa ömürlü; örn. 15m production, 24h development) */
  get jwtAccessExpiresIn(): string {
    return (
      process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '24h'
    );
  }

  /** Refresh token süresi (uzun ömürlü; örn. 7d) */
  get jwtRefreshExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /** Geriye uyumluluk: access süresi */
  get jwtExpiresIn(): string {
    return this.jwtAccessExpiresIn;
  }

  /**
   * Üyelik sorgulama (public) endpoint için paylaşılan gizli anahtar.
   * Tanımlıysa istekte header veya query ile eşleşmesi zorunludur.
   */
  get membershipInquiryToken(): string | undefined {
    const t = process.env.MEMBERSHIP_INQUIRY_TOKEN?.trim();
    return t || undefined;
  }

  /** Üyelik sorgulama IP başına rate limit penceresi (saniye). Varsayılan 60. */
  get membershipInquiryRateLimitTtlSeconds(): number {
    const n = parseInt(
      process.env.MEMBERSHIP_INQUIRY_RATE_LIMIT_TTL_SECONDS || '60',
      10,
    );
    return Number.isFinite(n) && n > 0 ? n : 60;
  }

  /** Üyelik sorgulama IP başına pencere içi maksimum istek. Varsayılan 20. */
  get membershipInquiryRateLimitMax(): number {
    const n = parseInt(
      process.env.MEMBERSHIP_INQUIRY_RATE_LIMIT_MAX || '20',
      10,
    );
    return Number.isFinite(n) && n > 0 ? n : 20;
  }
}
