/**
 * Role Mapper
 *
 * Maps between Domain Entities and DTOs.
 */
import { Role } from '../../domain/entities/role.entity';
import { Permission } from '../../../auth/permission.enum';
import { ALL_PERMISSIONS } from '../../../auth/role-permissions.map';

export interface RoleResponseDto {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  permissions: Permission[];
  hasScopeRestriction: boolean;
  createdAt: Date;
  updatedAt: Date;
  users?: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }>;
}

export class RoleMapper {
  static toResponseDto(
    role: Role,
    users?: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    }>,
  ): RoleResponseDto {
    const permissions = role.isAdmin() ? ALL_PERMISSIONS : role.permissions;

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      permissions,
      hasScopeRestriction: role.hasScopeRestriction,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      users,
    };
  }

  static toResponseDtoList(roles: Role[]): RoleResponseDto[] {
    return roles.map((role) => this.toResponseDto(role));
  }
}
