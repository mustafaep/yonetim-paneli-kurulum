import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule } from '../config/config.module.js';
import { JwtConfigService } from '../config/jwt.config.js';
import { SystemModule } from '../system/system.module';
import { AuthApplicationService } from './application/services/auth-application.service';
import { TokenService } from './infrastructure/services/token.service';
import { PasswordService } from './infrastructure/services/password.service';
import { AuthBruteForceService } from './infrastructure/services/auth-brute-force.service';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PrismaModule,
    ConfigModule,
    RedisModule,
    forwardRef(() => SystemModule),
    forwardRef(() => NotificationsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (jwtConfigService: JwtConfigService) =>
        jwtConfigService.createJwtOptions(),
      inject: [JwtConfigService],
    }),
  ],
  providers: [
    TokenService,
    PasswordService,
    AuthBruteForceService,
    AuthService,
    AuthApplicationService,
    JwtStrategy,
    AuthRateLimitGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, TokenService, PasswordService],
})
export class AuthModule {}
