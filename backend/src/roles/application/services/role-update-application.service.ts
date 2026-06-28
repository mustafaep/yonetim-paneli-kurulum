/**
 * Role Update Application Service
 *
 * Orchestrates role update use case.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import type { RoleRepository } from '../../domain/repositories/role.repository.interface';
import { RoleManagementDomainService } from '../../domain/services/role-management-domain.service';
import { UpdateRoleDto } from '../dto/update-role.dto';

export interface UpdateRoleCommand {
  roleId: string;
  updateData: UpdateRoleDto;
}

@Injectable()
export class RoleUpdateApplicationService {
  private readonly logger = new Logger(RoleUpdateApplicationService.name);

  constructor(
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
    private readonly roleManagementDomainService: RoleManagementDomainService,
  ) {}

  async updateRole(command: UpdateRoleCommand): Promise<Role> {
    const { roleId, updateData } = command;

    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (updateData.name && updateData.name !== role.name) {
      await this.roleManagementDomainService.validateNameUniqueness(
        updateData.name,
        roleId,
      );
    }

    role.update(updateData);
    await this.roleRepository.save(role);

    this.logger.log(`Role updated: ${role.id} (${role.name})`);

    return role;
  }
}
