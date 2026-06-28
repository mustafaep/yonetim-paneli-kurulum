import { Module, forwardRef } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './presentation/controllers/members.controller';
import { PublicMembershipController } from './presentation/controllers/public-membership.controller';
import { MemberScopeService } from './member-scope.service';
import { MemberHistoryService } from './member-history.service';
import { DocumentsModule } from '../documents/documents.module';
import { MemberExceptionFilter } from './presentation/filters/member-exception.filter';
import { MemberValidationPipe } from './presentation/pipes/member-validation.pipe';
import { MemberApprovalApplicationService } from './application/services/member-approval-application.service';
import { MemberActivationApplicationService } from './application/services/member-activation-application.service';
import { MemberRejectionApplicationService } from './application/services/member-rejection-application.service';
import { MemberCancellationApplicationService } from './application/services/member-cancellation-application.service';
import { MemberUpdateApplicationService } from './application/services/member-update-application.service';
import { MemberCreationApplicationService } from './application/services/member-creation-application.service';
import { PrismaMemberRepository } from './infrastructure/persistence/prisma-member.repository';
import { PrismaMemberMembershipPeriodRepository } from './infrastructure/persistence/prisma-member-membership-period.repository';
import { MemberRepository } from './domain/repositories/member.repository.interface';
import {
  MemberRegistrationDomainService,
  MembershipConfigAdapter,
} from './domain/services/member-registration-domain.service';
import { PrismaMembershipConfigAdapter } from './infrastructure/config/membership-config.adapter';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembershipInquiryTokenGuard } from './guards/membership-inquiry-token.guard';
import { MembershipInquiryRateLimitGuard } from './guards/membership-inquiry-rate-limit.guard';

@Module({
  imports: [DocumentsModule, RedisModule, forwardRef(() => NotificationsModule)],
  providers: [
    MembersService,
    MemberScopeService,
    MemberHistoryService,
    MemberExceptionFilter,
    MemberValidationPipe,
    MemberApprovalApplicationService,
    MemberActivationApplicationService,
    MemberRejectionApplicationService,
    MemberCancellationApplicationService,
    MemberUpdateApplicationService,
    MemberCreationApplicationService,
    MemberRegistrationDomainService,
    {
      provide: 'MemberRepository',
      useClass: PrismaMemberRepository,
    },
    {
      provide: 'MemberMembershipPeriodRepository',
      useClass: PrismaMemberMembershipPeriodRepository,
    },
    {
      provide: 'MembershipConfigAdapter',
      useClass: PrismaMembershipConfigAdapter,
    },
    PrismaMemberRepository,
    PrismaMembershipConfigAdapter,
    MembershipInquiryTokenGuard,
    MembershipInquiryRateLimitGuard,
  ],
  controllers: [MembersController, PublicMembershipController],
  exports: [MemberScopeService, MemberHistoryService],
})
export class MembersModule {}
