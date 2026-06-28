/**
 * Auth rate limit guard – login ve refresh endpoint'lerini IP bazlı sınırlar.
 * Redis mevcutsa Redis store kullanır; değilse in-memory fallback devreye girer.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';

const TTL_SECONDS = 60;
const MAX_REQUESTS_PER_TTL = 10;
const REDIS_PREFIX = 'rl:auth:';

interface Slot {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly memStore = new Map<string, Slot>();

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);

    if (this.redisService.isConnected) {
      return this.checkRedis(ip);
    }
    return this.checkMemory(ip);
  }

  private async checkRedis(ip: string): Promise<boolean> {
    const key = `${REDIS_PREFIX}${ip}`;
    const count = await this.redisService.increment(key, TTL_SECONDS);
    if (count > MAX_REQUESTS_PER_TTL) {
      throw new HttpException(
        { message: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private checkMemory(ip: string): boolean {
    const now = Date.now();
    let slot = this.memStore.get(ip);
    if (!slot || now >= slot.resetAt) {
      this.memStore.set(ip, { count: 1, resetAt: now + TTL_SECONDS * 1000 });
      return true;
    }
    slot.count += 1;
    if (slot.count > MAX_REQUESTS_PER_TTL) {
      throw new HttpException(
        { message: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      (request.headers['x-real-ip'] as string) ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
