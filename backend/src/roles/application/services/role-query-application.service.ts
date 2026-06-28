/**
 * Role Query Application Service
 *
 * Handles role query operations.
 */
import { Injectable, Inject } from '@nestjs/common';
import { Role } from '../../domain/entities/role.entity';
import type { RoleRepository } from '../../domain/repositories/role.repository.interface';
import { RoleNotFoundException } from '../../domain/exceptions/role-domain.exception';

@Injectable()
export class RoleQueryApplicationService {
  constructor(
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
  ) {}

  async findById(id: string): Promise<Role> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new RoleNotFoundException(id);
    }
    return role;
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.findAll();
  }
}
