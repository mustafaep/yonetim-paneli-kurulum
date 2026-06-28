/**
 * Role Permissions Update Application Service
 *
 * Orchestrates role permissions update use case.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import type { RoleRepository } from '../../domain/repositories/role.repository.interface';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';

export interface UpdateRolePermissionsCommand {
  roleId: string;
  permissions: Permission[];
}

import { Permission } from '../../../auth/permission.enum';

@Injectable()
export class RolePermissionsUpdateApplicationService {
  private readonly logger = new Logger(
    RolePermissionsUpdateApplicationService.name,
  );

  constructor(
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
  ) {}

  async updatePermissions(
    command: UpdateRolePermissionsCommand,
  ): Promise<Role> {
    const { roleId, permissions } = command;

    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    role.updatePermissions({ permissions });
    await this.roleRepository.save(role);

    this.logger.log(`Role permissions updated: ${role.id} (${role.name})`);

    return role;
  }
}
