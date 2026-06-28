import { Module } from '@nestjs/common';
import { AccountingController } from './presentation/controllers/accounting.controller';
import { AccountingService } from './accounting.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { TevkifatCenterApplicationService } from './application/services/tevkifat-center-application.service';
import { TevkifatTitleApplicationService } from './application/services/tevkifat-title-application.service';
import { TevkifatFileApplicationService } from './application/services/tevkifat-file-application.service';
import { PrismaTevkifatCenterRepository } from './infrastructure/persistence/prisma-tevkifat-center.repository';
import { PrismaTevkifatTitleRepository } from './infrastructure/persistence/prisma-tevkifat-title.repository';
import { PrismaTevkifatFileRepository } from './infrastructure/persistence/prisma-tevkifat-file.repository';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [AccountingController],
  providers: [
    AccountingService, // Legacy service for backward compatibility
    TevkifatCenterApplicationService,
    TevkifatTitleApplicationService,
    TevkifatFileApplicationService,
    {
      provide: 'TevkifatCenterRepository',
      useClass: PrismaTevkifatCenterRepository,
    },
    {
      provide: 'TevkifatTitleRepository',
      useClass: PrismaTevkifatTitleRepository,
    },
    {
      provide: 'TevkifatFileRepository',
      useClass: PrismaTevkifatFileRepository,
    },
    PrismaTevkifatCenterRepository,
    PrismaTevkifatTitleRepository,
    PrismaTevkifatFileRepository,
  ],
  exports: [AccountingService],
})
export class AccountingModule {}
