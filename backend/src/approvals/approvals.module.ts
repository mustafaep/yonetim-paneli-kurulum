import { Module } from '@nestjs/common';
import { ApprovalsController } from './presentation/controllers/approvals.controller';
import { ApprovalsService } from './approvals.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalApplicationService } from './application/services/approval-application.service';
import { PrismaApprovalRepository } from './infrastructure/persistence/prisma-approval.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalsController],
  providers: [
    ApprovalsService, // Legacy service for backward compatibility
    ApprovalApplicationService,
    {
      provide: 'ApprovalRepository',
      useClass: PrismaApprovalRepository,
    },
    PrismaApprovalRepository,
  ],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
