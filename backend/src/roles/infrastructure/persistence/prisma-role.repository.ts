/**
 * Prisma Role Repository Implementation
 *
 * Infrastructure layer: Implements Role repository interface.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RoleRepository } from '../../domain/repositories/role.repository.interface';
import { Role } from '../../domain/entities/role.entity';

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Role | null> {
    const data = await this.prisma.customRole.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: true,
      },
    });

    if (!data) {
      return null;
    }

    return Role.fromPersistence(data);
  }

  async findByName(name: string): Promise<Role | null> {
    const data = await this.prisma.customRole.findFirst({
      where: {
        name,
        deletedAt: null,
      },
      include: {
        permissions: true,
      },
    });

    if (!data) {
      return null;
    }

    return Role.fromPersistence(data);
  }

  async findAll(): Promise<Role[]> {
    const data = await this.prisma.customRole.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        permissions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return data.map((item) => Role.fromPersistence(item));
  }

  async save(role: Role): Promise<void> {
    await this.prisma.customRole.update({
      where: { id: role.id },
      data: {
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        hasScopeRestriction: role.hasScopeRestriction,
        deletedAt: role.deletedAt,
        updatedAt: role.updatedAt,
      },
    });

    if (role.permissions.length > 0) {
      await this.prisma.customRolePermission.deleteMany({
        where: { roleId: role.id },
      });

      await this.prisma.customRolePermission.createMany({
        data: role.permissions.map((permission) => ({
          roleId: role.id,
          permission,
        })),
      });
    }
  }

  async create(role: Role): Promise<Role> {
    const createData: any = {
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      hasScopeRestriction: role.hasScopeRestriction,
      permissions: {
        create: role.permissions.map((permission) => ({
          permission,
        })),
      },
    };

    delete createData.id;

    const created = await this.prisma.customRole.create({
      data: createData,
      include: {
        permissions: true,
      },
    });

    return Role.fromPersistence(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customRole.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async countUsersByRoleId(roleId: string): Promise<number> {
    return await this.prisma.user.count({
      where: {
        customRoles: {
          some: {
            id: roleId,
          },
        },
        deletedAt: null,
        isActive: true,
      },
    });
  }
}
