/**
 * Auth Application Service – Controller için uyum katmanı.
 * Tüm iş mantığı AuthService'te; bu servis sadece AuthService'e delegate edip UserSession döndürür.
 */
import { Injectable } from '@nestjs/common';
import { AuthService, type AuthRequestMeta } from '../../auth.service';
import { LoginDto } from '../../dto/login.dto';
import { UserSession } from '../../domain/entities/user-session.entity';

@Injectable()
export class AuthApplicationService {
  constructor(private readonly authService: AuthService) {}

  async login(dto: LoginDto, meta?: AuthRequestMeta): Promise<UserSession> {
    const result = await this.authService.login(dto, meta);
    return UserSession.create({
      userId: result.user.id,
      email: result.user.email,
      roles: result.user.roles,
      permissions: result.user.permissions,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  async refresh(refreshToken: string): Promise<UserSession> {
    const result = await this.authService.refresh(refreshToken);
    return UserSession.create({
      userId: result.user.id,
      email: result.user.email,
      roles: result.user.roles,
      permissions: result.user.permissions,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  async logout(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    return this.authService.logout(userId, ipAddress, userAgent);
  }

  async logoutAll(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string; revokedCount: number }> {
    return this.authService.logoutAll(userId, ipAddress, userAgent);
  }
}
