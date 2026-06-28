import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './infrastructure/services/token.service';
import { PasswordService } from './infrastructure/services/password.service';
import { AuthBruteForceService } from './infrastructure/services/auth-brute-force.service';
import { ConfigService } from '../config/config.service';
import { SystemService } from '../system/system.service';
import { EmailService } from '../notifications/services/email.service';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'Kullanici',
  passwordHash: 'hashedpassword',
  isActive: true,
  deletedAt: null,
  customRoles: [],
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let prismaService: jest.Mocked<Partial<PrismaService>>;
  let tokenService: jest.Mocked<Partial<TokenService>>;
  let passwordService: jest.Mocked<Partial<PasswordService>>;
  let bruteForceService: jest.Mocked<Partial<AuthBruteForceService>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    prismaService = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      } as any,
      systemLog: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      } as any,
    };
    tokenService = {
      signAccess: jest.fn().mockResolvedValue('access-token'),
      signRefresh: jest.fn().mockResolvedValue('refresh-token'),
      decodeRefresh: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 86400 }),
    };
    passwordService = {
      compare: jest.fn(),
    };
    bruteForceService = {
      isLocked: jest.fn().mockResolvedValue(false),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      getLockoutRemainingMinutes: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prismaService },
        { provide: TokenService, useValue: tokenService },
        { provide: PasswordService, useValue: passwordService },
        { provide: AuthBruteForceService, useValue: bruteForceService },
        {
          provide: ConfigService,
          useValue: {
            getSystemSettingBoolean: jest.fn().mockReturnValue(false),
            getSystemSetting: jest.fn().mockReturnValue(undefined),
          },
        },
        { provide: SystemService, useValue: { createLog: jest.fn().mockResolvedValue({}) } },
        { provide: EmailService, useValue: { sendEmail: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('geçerli kimlik bilgileriyle kullanıcı döndürür', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toMatchObject({ email: 'test@example.com' });
    });

    it('kullanıcı bulunamazsa UnauthorizedException fırlatır', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.validateUser('notfound@example.com', 'password'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('şifre yanlışsa UnauthorizedException fırlatır', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('test@example.com', 'wrongpassword'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('pasif kullanıcı için UnauthorizedException fırlatır', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.validateUser('test@example.com', 'password'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('başarılı girişte token ve kullanıcı döndürür', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(
        { email: 'test@example.com', password: 'password' },
        { ipAddress: '127.0.0.1' },
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('kilitli IP için hata fırlatır', async () => {
      (bruteForceService.isLocked as jest.Mock).mockResolvedValue(true);
      (bruteForceService.getLockoutRemainingMinutes as jest.Mock).mockResolvedValue(10);

      await expect(
        service.login({ email: 'test@example.com', password: 'password' }, { ipAddress: '1.2.3.4' }),
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('başarılı çıkış mesajı döndürür', async () => {
      const result = await service.logout('user-123', '127.0.0.1');
      expect(result.message).toBeDefined();
    });
  });

  describe('logoutAll', () => {
    it('tüm oturumları iptal eder', async () => {
      const result = await service.logoutAll('user-123', '127.0.0.1');
      expect(result.revokedCount).toBe(1);
    });
  });
});
