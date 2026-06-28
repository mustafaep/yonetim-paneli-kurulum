import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
  Logger,
  Optional,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';
import {
  getPermissionsForCustomRoles,
  ALL_PERMISSIONS,
} from './role-permissions.map';
import { Permission } from './permission.enum';
import { ConfigService } from '../config/config.service';
import { SystemService } from '../system/system.service';
import { TokenService } from './infrastructure/services/token.service';
import { PasswordService } from './infrastructure/services/password.service';
import { AuthBruteForceService } from './infrastructure/services/auth-brute-force.service';
import { EmailService } from '../notifications/services/email.service';
import type { AccessPayload } from './domain/types/token-payload.types';

/** signAccess type'ı otomatik ekler; buildUserPayload type olmadan döner */
type AccessPayloadWithoutType = Omit<AccessPayload, 'type'>;

type UserWithRoles = User & {
  customRoles?: Array<{
    name: string;
    permissions?: Array<{ permission: string }>;
  }>;
};

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
  };
}

export interface AuthRequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

/** PII maskeleme: a***@example.com */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const masked = local.length <= 1 ? '*' : local[0] + '***';
  return `${masked}@${domain}`;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private bruteForceService: AuthBruteForceService,
    private configService: ConfigService,
    @Inject(forwardRef(() => SystemService))
    private systemService: SystemService,
    @Optional() @Inject(forwardRef(() => EmailService))
    private emailService: EmailService,
  ) {}

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private logFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.logger.warn(
      `Login failed | email=${maskEmail(email)} | ip=${ipAddress ?? 'unknown'} | ua=${userAgent ?? 'unknown'}`,
    );
  }

  private logLoginSuccess(userId: string, ipAddress?: string): void {
    this.logger.log(
      `Login success | userId=${userId} | ip=${ipAddress ?? 'unknown'}`,
    );
  }

  private async recordLoginAndCheckSuspicious(
    user: User,
    ipAddress?: string,
  ): Promise<void> {
    try {
      if (!this.systemService) return;

      // Son başarılı giriş kaydını bul (mevcut girişten önceki)
      const lastLogin = await this.prisma.systemLog.findFirst({
        where: { userId: user.id, action: 'LOGIN' },
        orderBy: { createdAt: 'desc' },
      });

      // Yeni giriş olayını kaydet
      await this.systemService.createLog({
        action: 'LOGIN',
        entityType: 'AUTH',
        userId: user.id,
        details: { success: true },
        ipAddress,
      });

      // Önceki giriş varsa ve IP farklıysa uyarı e-postası gönder
      if (
        lastLogin?.ipAddress &&
        ipAddress &&
        lastLogin.ipAddress !== ipAddress &&
        user.email &&
        this.emailService
      ) {
        const loginTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
        await this.emailService.sendEmail({
          to: user.email,
          subject: 'Yeni bir konumdan giriş yapıldı',
          html: `
            <h2>Güvenlik Bildirimi</h2>
            <p>Hesabınıza yeni bir IP adresinden giriş yapıldı.</p>
            <ul>
              <li><strong>Yeni IP:</strong> ${ipAddress}</li>
              <li><strong>Önceki IP:</strong> ${lastLogin.ipAddress}</li>
              <li><strong>Zaman:</strong> ${loginTime}</li>
            </ul>
            <p>Bu giriş size ait değilse lütfen şifrenizi hemen değiştirin ve tüm oturumları kapatın.</p>
          `,
        });
        this.logger.warn(
          `Suspicious login: userId=${user.id} previous_ip=${lastLogin.ipAddress} new_ip=${ipAddress}`,
        );
      }
    } catch (error) {
      this.logger.error('Login kaydı oluşturulurken hata:', error);
    }
  }

  private logRefresh(userId: string): void {
    this.logger.log(`Refresh token used | userId=${userId}`);
  }

  private buildUserPayload(user: UserWithRoles): AccessPayloadWithoutType {
    const customRolePermissions: Permission[] = [];
    const customRoleNames: string[] = [];

    if (user.customRoles && Array.isArray(user.customRoles)) {
      user.customRoles.forEach((customRole) => {
        if (customRole && customRole.name) {
          customRoleNames.push(customRole.name);
          if (customRole.permissions && Array.isArray(customRole.permissions)) {
            customRole.permissions.forEach((perm) => {
              if (perm && perm.permission) {
                customRolePermissions.push(perm.permission as Permission);
              }
            });
          }
        }
      });
    }

    const isAdmin = customRoleNames.includes('ADMIN');
    const permissions = isAdmin
      ? ALL_PERMISSIONS
      : getPermissionsForCustomRoles(customRolePermissions);

    return {
      sub: user.id,
      email: user.email,
      roles: customRoleNames,
      permissions: permissions || [],
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }
    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    const passwordValid = await this.passwordService.compare(
      password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    return user;
  }

  async login(dto: LoginDto, meta?: AuthRequestMeta): Promise<LoginResult> {
    if (meta?.ipAddress && (await this.bruteForceService.isLocked(meta.ipAddress))) {
      const remaining = await this.bruteForceService.getLockoutRemainingMinutes(
        meta.ipAddress,
      );
      throw new HttpException(
        {
          message: `Çok fazla başarısız giriş. ${remaining} dakika sonra tekrar deneyin.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const maintenanceMode = this.configService.getSystemSettingBoolean(
      'MAINTENANCE_MODE',
      false,
    );

    if (maintenanceMode) {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        await this.bruteForceService.recordFailure(meta?.ipAddress ?? '');
        this.logFailedLogin(dto.email, meta?.ipAddress, meta?.userAgent);
        throw new UnauthorizedException('Kullanıcı bulunamadı');
      }

      const userWithRoles = user as UserWithRoles;
      const customRoleNames =
        userWithRoles.customRoles?.map((r) => r.name) || [];
      const isAdmin = customRoleNames.includes('ADMIN');

      if (!isAdmin) {
        await this.bruteForceService.recordFailure(meta?.ipAddress ?? '');
        this.logFailedLogin(dto.email, meta?.ipAddress, meta?.userAgent);
        const maintenanceMessage = this.configService.getSystemSetting(
          'MAINTENANCE_MESSAGE',
          'Sistem bakım modunda. Lütfen daha sonra tekrar deneyin.',
        );
        throw new ServiceUnavailableException(maintenanceMessage);
      }

      let validatedUser: User;
      try {
        validatedUser = await this.validateUser(dto.email, dto.password);
      } catch (e) {
        await this.bruteForceService.recordFailure(meta?.ipAddress ?? '');
        this.logFailedLogin(dto.email, meta?.ipAddress, meta?.userAgent);
        throw e;
      }
      const result = await this.createSession(validatedUser as UserWithRoles);
      await this.bruteForceService.recordSuccess(meta?.ipAddress ?? '');
      this.logLoginSuccess(result.user.id, meta?.ipAddress);
      void this.recordLoginAndCheckSuspicious(validatedUser, meta?.ipAddress);
      return result;
    }

    let user: User;
    try {
      user = await this.validateUser(dto.email, dto.password);
    } catch (e) {
      await this.bruteForceService.recordFailure(meta?.ipAddress ?? '');
      this.logFailedLogin(dto.email, meta?.ipAddress, meta?.userAgent);
      throw e;
    }
    const result = await this.createSession(user as UserWithRoles);
    await this.bruteForceService.recordSuccess(meta?.ipAddress ?? '');
    this.logLoginSuccess(result.user.id, meta?.ipAddress);
    void this.recordLoginAndCheckSuspicious(user, meta?.ipAddress);
    return result;
  }

  /**
   * Access + refresh token ve kullanıcı bilgisi üretir; refresh token DB'ye hash'lenerek yazılır.
   */
  private async createSession(user: UserWithRoles): Promise<LoginResult> {
    const payload = this.buildUserPayload(user);
    const accessToken = await this.tokenService.signAccess(payload);
    const refreshToken = await this.tokenService.signRefresh(user.id);
    const decoded = this.tokenService.decodeRefresh(refreshToken);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt,
      },
    });

    const customRoleNames = user.customRoles?.map((r) => r.name) || [];
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: customRoleNames,
        permissions: payload.permissions,
      },
    };
  }

  /**
   * Refresh token ile yeni access + yeni refresh döner; eski refresh revoke edilir (token rotation).
   */
  async refresh(refreshToken: string): Promise<LoginResult> {
    const payload = await this.tokenService.verifyRefresh(refreshToken);
    const userId = payload.sub;
    const tokenHash = this.hashRefreshToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş yenileme belirteci');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Geçersiz belirteç');
    }
    this.logRefresh(userId);
    return this.createSession(user as UserWithRoles);
  }

  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
    try {
      if (this.systemService) {
        await this.systemService.createLog({
          action: 'LOGOUT',
          entityType: 'AUTH',
          userId,
          details: { success: true },
          ipAddress,
          userAgent,
        });
      }
    } catch (error) {
      console.error('Logout log kaydı oluşturulamadı:', error);
    }
    return { message: 'Logout başarılı' };
  }

  async logoutAll(userId: string, ipAddress?: string, userAgent?: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    try {
      if (this.systemService) {
        await this.systemService.createLog({
          action: 'LOGOUT_ALL',
          entityType: 'AUTH',
          userId,
          details: { revokedCount: result.count },
          ipAddress,
          userAgent,
        });
      }
    } catch (error) {
      this.logger.error('Logout-all log kaydı oluşturulamadı:', error);
    }
    return { message: 'Tüm oturumlar kapatıldı', revokedCount: result.count };
  }
}
