import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './presentation/controllers/roles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RoleCreationApplicationService } from './application/services/role-creation-application.service';
import { RoleQueryApplicationService } from './application/services/role-query-application.service';
import { RoleUpdateApplicationService } from './application/services/role-update-application.service';
import { RolePermissionsUpdateApplicationService } from './application/services/role-permissions-update-application.service';
import { RoleDeletionApplicationService } from './application/services/role-deletion-application.service';
import { RoleManagementDomainService } from './domain/services/role-management-domain.service';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma-role.repository';
import { RoleRepository } from './domain/repositories/role.repository.interface';
import { RoleExceptionFilter } from './presentation/filters/role-exception.filter';
import { RoleValidationPipe } from './presentation/pipes/role-validation.pipe';

@Module({
  imports: [PrismaModule],
  providers: [
    RolesService,
    RoleCreationApplicationService,
    RoleQueryApplicationService,
    RoleUpdateApplicationService,
    RolePermissionsUpdateApplicationService,
    RoleDeletionApplicationService,
    RoleManagementDomainService,
    {
      provide: 'RoleRepository',
      useClass: PrismaRoleRepository,
    },
    PrismaRoleRepository,
    RoleExceptionFilter,
    RoleValidationPipe,
  ],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
