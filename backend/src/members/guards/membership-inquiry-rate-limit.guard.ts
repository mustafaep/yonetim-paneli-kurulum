/**
 * Public üyelik sorgulama — IP bazlı hız sınırı (Redis veya bellek).
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
import { ConfigService } from '../../config/config.service';

const REDIS_PREFIX = 'rl:membership-inquiry:';

interface Slot {
  count: number;
  resetAt: number;
}

@Injectable()
export class MembershipInquiryRateLimitGuard implements CanActivate {
  private readonly memStore = new Map<string, Slot>();

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);
    const ttl = this.configService.membershipInquiryRateLimitTtlSeconds;
    const max = this.configService.membershipInquiryRateLimitMax;

    if (this.redisService.isConnected) {
      return this.checkRedis(ip, ttl, max);
    }
    return this.checkMemory(ip, ttl, max);
  }

  private async checkRedis(
    ip: string,
    ttlSeconds: number,
    maxRequests: number,
  ): Promise<boolean> {
    const key = `${REDIS_PREFIX}${ip}`;
    const count = await this.redisService.increment(key, ttlSeconds);
    if (count > maxRequests) {
      throw new HttpException(
        {
          message:
            'Çok fazla sorgu gönderildi. Lütfen bir süre sonra tekrar deneyin.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private checkMemory(
    ip: string,
    ttlSeconds: number,
    maxRequests: number,
  ): boolean {
    const now = Date.now();
    let slot = this.memStore.get(ip);
    if (!slot || now >= slot.resetAt) {
      this.memStore.set(ip, {
        count: 1,
        resetAt: now + ttlSeconds * 1000,
      });
      return true;
    }
    slot.count += 1;
    if (slot.count > maxRequests) {
      throw new HttpException(
        {
          message:
            'Çok fazla sorgu gönderildi. Lütfen bir süre sonra tekrar deneyin.',
        },
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
