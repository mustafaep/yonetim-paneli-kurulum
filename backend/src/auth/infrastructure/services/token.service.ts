/**
 * TokenService – JWT access ve refresh token üretimi / doğrulama.
 * Access doğrulama (verify) şu an Passport JWT strategy tarafından yapılıyor.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../../../config/config.service';
import type {
  AccessPayload,
  RefreshPayload,
} from '../../domain/types/token-payload.types';
import {
  TOKEN_TYPE_ACCESS,
  TOKEN_TYPE_REFRESH,
} from '../../domain/types/token-payload.types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Access token üretir.
   * Süre: önce SECURITY_SESSION_TIMEOUT (dakika cinsinden DB ayarı), yoksa env değişkeni.
   * type: 'access' claim'i ile refresh token'dan ayırt edilir.
   */
  signAccess(payload: Omit<AccessPayload, 'type'>): Promise<string> {
    const sessionTimeoutMinutes = this.configService.getSystemSettingNumber(
      'SECURITY_SESSION_TIMEOUT',
      0,
    );
    const expiresIn =
      sessionTimeoutMinutes > 0
        ? `${sessionTimeoutMinutes}m`
        : this.configService.jwtAccessExpiresIn;

    return this.jwtService.signAsync(
      { ...payload, type: TOKEN_TYPE_ACCESS },
      { expiresIn } as any,
    );
  }

  /**
   * Refresh token üretir (sadece sub; süre env'den refresh süresi).
   * type: 'refresh' claim'i ile access token'dan ayırt edilir.
   */
  signRefresh(userId: string): Promise<string> {
    const payload: RefreshPayload = { type: TOKEN_TYPE_REFRESH, sub: userId };
    // JwtSignOptions.expiresIn tipi string kabul etmeyebilir; runtime'da "7d" geçerli
    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.jwtRefreshExpiresIn,
    } as any);
  }

  /**
   * Refresh token'ı doğrular; type: 'refresh' olmalıdır.
   */
  async verifyRefresh(token: string): Promise<RefreshPayload> {
    const payload = await this.jwtService.verifyAsync<RefreshPayload>(token);
    if (payload.type !== TOKEN_TYPE_REFRESH) {
      throw new UnauthorizedException(
        'Geçersiz belirteç türü: yenileme belirteci bekleniyor',
      );
    }
    return payload;
  }

  /**
   * Refresh token'ı doğrulamadan decode eder (expiresAt almak için).
   */
  decodeRefresh(token: string): { sub: string; exp?: number } | null {
    const payload = this.jwtService.decode(token);
    if (!payload || typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, exp: payload.exp };
  }
}
