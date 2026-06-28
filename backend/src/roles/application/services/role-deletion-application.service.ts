/**
 * Role Deletion Application Service
 *
 * Orchestrates role deletion use case.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { RoleRepository } from '../../domain/repositories/role.repository.interface';

export interface DeleteRoleCommand {
  roleId: string;
}

@Injectable()
export class RoleDeletionApplicationService {
  private readonly logger = new Logger(RoleDeletionApplicationService.name);

  constructor(
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
  ) {}

  async deleteRole(command: DeleteRoleCommand): Promise<void> {
    const { roleId } = command;

    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    const userCount = await this.roleRepository.countUsersByRoleId(roleId);
    role.delete(userCount);

    await this.roleRepository.save(role);

    this.logger.log(`Role deleted: ${role.id} (${role.name})`);
  }
}
