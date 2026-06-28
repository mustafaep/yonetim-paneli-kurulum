/**
 * Brute force koruması – IP bazlı başarısız giriş sayacı ve geçici kilitleme.
 * Redis mevcutsa Redis store kullanır; değilse in-memory fallback devreye girer.
 * Limitler SECURITY_MAX_LOGIN_ATTEMPTS ve SECURITY_LOCKOUT_DURATION sistem ayarlarından okunur.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service';
import { RedisService } from '../../../redis/redis.service';

const REDIS_COUNT_PREFIX = 'bf:count:';
const REDIS_LOCK_PREFIX = 'bf:lock:';

interface MemSlot {
  count: number;
  lockedUntil: number;
}

@Injectable()
export class AuthBruteForceService {
  private readonly memStore = new Map<string, MemSlot>();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  private get maxAttempts(): number {
    return this.configService.getSystemSettingNumber(
      'SECURITY_MAX_LOGIN_ATTEMPTS',
      5,
    );
  }

  private get lockoutSeconds(): number {
    const minutes = this.configService.getSystemSettingNumber(
      'SECURITY_LOCKOUT_DURATION',
      15,
    );
    return minutes * 60;
  }

  async getLockoutRemainingMinutes(ip: string): Promise<number> {
    if (!ip || ip === 'unknown') return 0;

    if (this.redisService.isConnected) {
      const ttl = await this.redisService.ttl(`${REDIS_LOCK_PREFIX}${ip}`);
      if (ttl <= 0) return 0;
      return Math.ceil(ttl / 60);
    }

    const slot = this.memStore.get(ip);
    if (!slot) return 0;
    const remaining = slot.lockedUntil - Date.now();
    if (remaining <= 0) {
      this.memStore.delete(ip);
      return 0;
    }
    return Math.ceil(remaining / 60000);
  }

  async isLocked(ip: string): Promise<boolean> {
    if (!ip || ip === 'unknown') return false;

    if (this.redisService.isConnected) {
      const ttl = await this.redisService.ttl(`${REDIS_LOCK_PREFIX}${ip}`);
      return ttl > 0;
    }

    const slot = this.memStore.get(ip);
    if (!slot) return false;
    if (Date.now() < slot.lockedUntil) return true;
    this.memStore.delete(ip);
    return false;
  }

  async recordFailure(ip: string): Promise<void> {
    if (!ip || ip === 'unknown') return;

    if (this.redisService.isConnected) {
      const countKey = `${REDIS_COUNT_PREFIX}${ip}`;
      const lockKey = `${REDIS_LOCK_PREFIX}${ip}`;
      const count = await this.redisService.increment(
        countKey,
        this.lockoutSeconds * 2,
      );
      if (count >= this.maxAttempts) {
        await this.redisService.set(
          lockKey,
          '1',
          this.lockoutSeconds,
        );
        await this.redisService.del(countKey);
      }
      return;
    }

    const now = Date.now();
    let slot = this.memStore.get(ip);
    if (!slot || now >= slot.lockedUntil) {
      slot = { count: 0, lockedUntil: 0 };
    }
    slot.count += 1;
    if (slot.count >= this.maxAttempts) {
      slot.lockedUntil = now + this.lockoutSeconds * 1000;
    }
    this.memStore.set(ip, slot);
  }

  async recordSuccess(ip: string): Promise<void> {
    if (!ip || ip === 'unknown') return;

    if (this.redisService.isConnected) {
      await this.redisService.del(`${REDIS_COUNT_PREFIX}${ip}`);
      await this.redisService.del(`${REDIS_LOCK_PREFIX}${ip}`);
      return;
    }

    this.memStore.delete(ip);
  }
}
