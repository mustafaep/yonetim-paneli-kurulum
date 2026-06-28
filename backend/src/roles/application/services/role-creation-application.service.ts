/**
 * Role Creation Application Service
 *
 * Orchestrates role creation use case.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import type { RoleRepository } from '../../domain/repositories/role.repository.interface';
import { RoleManagementDomainService } from '../../domain/services/role-management-domain.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { Permission } from '../../../auth/permission.enum';

export interface CreateRoleCommand {
  dto: CreateRoleDto;
}

@Injectable()
export class RoleCreationApplicationService {
  private readonly logger = new Logger(RoleCreationApplicationService.name);

  constructor(
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
    private readonly roleManagementDomainService: RoleManagementDomainService,
  ) {}

  async createRole(command: CreateRoleCommand): Promise<Role> {
    const { dto } = command;

    await this.roleManagementDomainService.validateNameUniqueness(dto.name);

    const role = Role.create(
      {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        hasScopeRestriction: dto.hasScopeRestriction,
      },
      '',
    );

    const createdRole = await this.roleRepository.create(role);

    this.logger.log(`Role created: ${createdRole.id} (${createdRole.name})`);

    return createdRole;
  }
}
