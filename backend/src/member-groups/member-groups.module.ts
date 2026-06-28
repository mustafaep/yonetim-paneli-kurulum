import { Module } from '@nestjs/common';
import { MemberGroupsService } from './member-groups.service';
import { MemberGroupsController } from './presentation/controllers/member-groups.controller';
import { MemberGroupApplicationService } from './application/services/member-group-application.service';
import { MemberGroupManagementDomainService } from './domain/services/member-group-management-domain.service';
import { PrismaMemberGroupRepository } from './infrastructure/persistence/prisma-member-group.repository';
import { MemberGroupRepository } from './domain/repositories/member-group.repository.interface';
import { MemberGroupExceptionFilter } from './presentation/filters/member-group-exception.filter';
import { MemberGroupValidationPipe } from './presentation/pipes/member-group-validation.pipe';

@Module({
  providers: [
    MemberGroupsService,
    MemberGroupApplicationService,
    MemberGroupManagementDomainService,
    {
      provide: 'MemberGroupRepository',
      useClass: PrismaMemberGroupRepository,
    },
    PrismaMemberGroupRepository,
    MemberGroupExceptionFilter,
    MemberGroupValidationPipe,
  ],
  controllers: [MemberGroupsController],
  exports: [MemberGroupsService],
})
export class MemberGroupsModule {}
