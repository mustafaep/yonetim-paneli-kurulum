/**
 * Auth Controller (Presentation Layer)
 */
import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthApplicationService } from '../../application/services/auth-application.service';
import { LoginDto } from '../../dto/login.dto';
import { RefreshTokenDto } from '../../dto/refresh-token.dto';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { CurrentUserData } from '../../decorators/current-user.decorator';
import type { Request } from 'express';
import { AuthRateLimitGuard } from '../../guards/auth-rate-limit.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authApplicationService: AuthApplicationService,
  ) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Kullanıcı girişi',
    description:
      'E-posta ve şifre ile giriş yaparak JWT access + refresh token alır',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Giriş başarılı',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'user-uuid-123',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          roles: ['ADMIN'],
          permissions: ['USER_LIST', 'USER_VIEW', 'USER_CREATE', 'MEMBER_LIST'],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri' })
  @ApiResponse({ status: 429, description: 'Çok fazla istek (rate limit)' })
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const session = await this.authApplicationService.login(dto, {
      ipAddress,
      userAgent,
    });
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken ?? undefined,
      user: {
        id: session.userId,
        email: session.email,
        roles: session.roles,
        permissions: session.permissions,
      },
    };
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('refresh')
  @ApiOperation({
    summary: 'Token yenileme',
    description: 'Refresh token ile yeni access + refresh token alır',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Yeni tokenlar' })
  @ApiResponse({
    status: 401,
    description: 'Geçersiz veya süresi dolmuş refresh token',
  })
  @ApiResponse({ status: 429, description: 'Çok fazla istek (rate limit)' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const session = await this.authApplicationService.refresh(dto.refreshToken);
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken ?? undefined,
      user: {
        id: session.userId,
        email: session.email,
        roles: session.roles,
        permissions: session.permissions,
      },
    };
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mevcut kullanıcı bilgileri',
    description:
      'Access token ile doğrulanmış kullanıcının bilgilerini döner. Frontend token doğrulaması için kullanılır.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı bilgileri',
    schema: {
      example: {
        userId: 'user-uuid-123',
        email: 'admin@example.com',
        roles: ['ADMIN'],
        permissions: ['USER_LIST', 'USER_VIEW'],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Geçersiz veya süresi dolmuş token',
  })
  me(@CurrentUser() user: CurrentUserData) {
    return {
      userId: user.userId,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Kullanıcı çıkışı',
    description: 'Kullanıcı oturumunu sonlandırır ve log kaydı oluşturur',
  })
  @ApiResponse({ status: 200, description: 'Çıkış başarılı' })
  async logout(@CurrentUser() user: CurrentUserData, @Req() request: Request) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    return this.authApplicationService.logout(
      user.userId,
      ipAddress,
      userAgent,
    );
  }

  @Post('logout-all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Tüm oturumları kapat',
    description: 'Kullanıcının tüm aktif oturumlarını (refresh tokenlarını) geçersiz kılar',
  })
  @ApiResponse({ status: 200, description: 'Tüm oturumlar kapatıldı' })
  async logoutAll(@CurrentUser() user: CurrentUserData, @Req() request: Request) {
    if (!user.roles?.includes('ADMIN')) {
      throw new ForbiddenException('Bu işlem için yönetici yetkisi gereklidir');
    }
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    return this.authApplicationService.logoutAll(
      user.userId,
      ipAddress,
      userAgent,
    );
  }

  private getIpAddress(request: Request): string {
    return (
      request.ip ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      (request.socket as any)?.remoteAddress ||
      'unknown'
    );
  }
}
