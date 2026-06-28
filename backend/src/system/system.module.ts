import { Module, forwardRef } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '../config/config.module.js';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [PrismaModule, forwardRef(() => ConfigModule), MembersModule],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
