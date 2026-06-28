import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '../config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private _connected = false;
  private readonly memoryStore = new Map<
    string,
    { value: string; expiresAt: number | null }
  >();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (!this.configService.redisEnabled) {
      this._connected = false;
      this.logger.warn(
        'Redis devre disi (REDIS_ENABLED=false). In-memory fallback aktif.',
      );
      return;
    }

    this.client = new Redis({
      host: this.configService.redisHost,
      port: this.configService.redisPort,
      password: this.configService.redisPassword || undefined,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 500, 5000),
      enableOfflineQueue: false,
    });

    this.client.on('connect', () => {
      this._connected = true;
      this.logger.log('Redis bağlantısı kuruldu.');
    });

    this.client.on('error', (err) => {
      this._connected = false;
      this.logger.warn(`Redis bağlantı hatası: ${err.message}`);
    });

    this.client.connect().catch(() => {
      this.logger.warn(
        'Redis başlangıçta bağlanamadı. In-memory fallback aktif olacak.',
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => null);
    }
  }

  get isConnected(): boolean {
    return this._connected;
  }

  getClient(): Redis | null {
    return this.client;
  }

  private cleanupExpired(key: string): void {
    const item = this.memoryStore.get(key);
    if (!item) return;
    if (item.expiresAt !== null && item.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
    }
  }

  /** key'in değerini artırır; ilk artırımda TTL (saniye) ayarlar. */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    if (!this.client || !this._connected) {
      this.cleanupExpired(key);
      const current = Number(this.memoryStore.get(key)?.value || '0');
      const next = current + 1;
      const existing = this.memoryStore.get(key);
      this.memoryStore.set(key, {
        value: String(next),
        expiresAt:
          existing?.expiresAt ??
          (ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null),
      });
      return next;
    }

    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this._connected) {
      this.cleanupExpired(key);
      return this.memoryStore.get(key)?.value ?? null;
    }
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client || !this._connected) {
      this.memoryStore.set(key, {
        value,
        expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
      });
      return;
    }
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this._connected) {
      this.memoryStore.delete(key);
      return;
    }
    await this.client.del(key);
  }

  async ttl(key: string): Promise<number> {
    if (!this.client || !this._connected) {
      this.cleanupExpired(key);
      const item = this.memoryStore.get(key);
      if (!item) return -2;
      if (item.expiresAt === null) return -1;
      return Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 1000));
    }
    return this.client.ttl(key);
  }
}
