/**
 * User Mapper
 *
 * Maps between Domain Entities and DTOs.
 */
import { User } from '../../domain/entities/user.entity';

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    phone: string | null;
    email: string | null;
    status: string;
    registrationNumber: string | null;
  } | null;
}

export class UserMapper {
  static toResponseDto(
    user: User,
    roles?: Array<{ name: string }>,
    permissions?: string[],
    member?: any,
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: roles?.map((r) => r.name) || [],
      permissions: permissions || [],
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      deletedAt: user.deletedAt?.toISOString() || null,
      member: member
        ? {
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            nationalId: member.nationalId,
            phone: member.phone,
            email: member.email,
            status: member.status,
            registrationNumber: member.registrationNumber,
          }
        : null,
    };
  }

  static toResponseDtoList(
    users: User[],
    rolesMap?: Map<string, Array<{ name: string }>>,
    permissionsMap?: Map<string, string[]>,
  ): UserResponseDto[] {
    return users.map((user) => {
      const roles = rolesMap?.get(user.id);
      const permissions = permissionsMap?.get(user.id);
      return this.toResponseDto(user, roles, permissions);
    });
  }
}
