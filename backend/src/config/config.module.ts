import { Module, Global } from '@nestjs/common';
import { ConfigService } from './config.service.js';
import { JwtConfigService } from './jwt.config.js';
import { DatabaseConfigService } from './database.config.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ConfigService, JwtConfigService, DatabaseConfigService],
  exports: [ConfigService, JwtConfigService, DatabaseConfigService],
})
export class ConfigModule {}
