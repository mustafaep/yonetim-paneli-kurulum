/**
 * Role Management Domain Service
 *
 * Encapsulates complex business logic for role management.
 */
import { Injectable, Inject } from '@nestjs/common';
import type { RoleRepository } from '../repositories/role.repository.interface';
import { RoleName } from '../value-objects/role-name.vo';
import {
  RoleNameAlreadyExistsException,
  AdminRoleCannotBeCreatedException,
} from '../exceptions/role-domain.exception';

@Injectable()
export class RoleManagementDomainService {
  constructor(
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
  ) {}

  async validateNameUniqueness(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    try {
      RoleName.create(name);
    } catch (error) {
      if (error instanceof AdminRoleCannotBeCreatedException) {
        throw error;
      }
      throw error;
    }

    const existing = await this.roleRepository.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new RoleNameAlreadyExistsException(name);
    }
  }
}
