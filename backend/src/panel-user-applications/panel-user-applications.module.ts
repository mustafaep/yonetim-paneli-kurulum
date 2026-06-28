import { Module } from '@nestjs/common';
import { PanelUserApplicationsService } from './panel-user-applications.service';
import { PanelUserApplicationsController } from './presentation/controllers/panel-user-applications.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PanelUserApplicationApplicationService } from './application/services/panel-user-application-application.service';
import { PrismaPanelUserApplicationRepository } from './infrastructure/persistence/prisma-panel-user-application.repository';

@Module({
  imports: [UsersModule, PrismaModule],
  providers: [
    PanelUserApplicationsService, // Legacy service for backward compatibility
    PanelUserApplicationApplicationService,
    {
      provide: 'PanelUserApplicationRepository',
      useClass: PrismaPanelUserApplicationRepository,
    },
    PrismaPanelUserApplicationRepository,
  ],
  controllers: [PanelUserApplicationsController],
  exports: [PanelUserApplicationsService],
})
export class PanelUserApplicationsModule {}
