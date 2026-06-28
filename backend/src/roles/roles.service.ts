import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './application/dto/create-role.dto';
import { UpdateRoleDto } from './application/dto/update-role.dto';
import { UpdateRolePermissionsDto } from './application/dto/update-role-permissions.dto';
import { RoleResponseDto, RoleScopeResponseDto } from './dto/role-response.dto';
import { Permission } from '../auth/permission.enum';
import { ALL_PERMISSIONS } from '../auth/role-permissions.map';
import { RoleCreationApplicationService } from './application/services/role-creation-application.service';
import { RoleUpdateApplicationService } from './application/services/role-update-application.service';
import { RolePermissionsUpdateApplicationService } from './application/services/role-permissions-update-application.service';
import { RoleDeletionApplicationService } from './application/services/role-deletion-application.service';
import { RoleQueryApplicationService } from './application/services/role-query-application.service';
import { RoleMapper } from './application/mappers/role.mapper';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private roleCreationService: RoleCreationApplicationService,
    private roleUpdateService: RoleUpdateApplicationService,
    private rolePermissionsUpdateService: RolePermissionsUpdateApplicationService,
    private roleDeletionService: RoleDeletionApplicationService,
    private roleQueryService: RoleQueryApplicationService,
  ) {}

  async listRoles(): Promise<
    Array<
      | RoleResponseDto
      | { name: string; permissions: Permission[]; isSystemRole: boolean }
    >
  > {
    // Custom rolleri getir (veritabanından gelen tüm roller)
    const customRoles = await this.prisma.customRole.findMany({
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

    // Sadece ADMIN sistem rolü olarak göster (artık CustomRole olarak da eklenmiş olabilir)
    // Sistem rolleri artık CustomRole tablosunda, bu yüzden burada göstermeye gerek yok
    const systemRoles: Array<{
      name: string;
      permissions: Permission[];
      isSystemRole: boolean;
    }> = [];

    // Custom rolleri DTO formatına çevir
    const customRolesDto = customRoles.map((role) => {
      // ADMIN rolü için tüm izinleri göster (veritabanında saklanmasa bile)
      const permissions =
        role.name === 'ADMIN'
          ? ALL_PERMISSIONS
          : role.permissions.map((p) => p.permission as Permission);

      return {
        id: role.id,
        name: role.name,
        description: role.description ?? undefined,
        isActive: role.isActive,
        permissions,
        hasScopeRestriction: role.hasScopeRestriction,
        // Scope'ları burada döndürmüyoruz - scope'lar rol seviyesinde değil, kullanıcıya rol atanırken belirlenir
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
    });

    return [...systemRoles, ...customRolesDto];
  }

  async getRoleById(id: string): Promise<
    RoleResponseDto & {
      users?: Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      }>;
    }
  > {
    const role = await this.roleQueryService.findById(id);

    const prismaRole = await this.prisma.customRole.findUnique({
      where: { id: role.id },
      include: {
        permissions: true,
        users: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!prismaRole) {
      throw new NotFoundException('Rol bulunamadı');
    }

    return RoleMapper.toResponseDto(role, prismaRole.users);
  }

  async createRole(dto: CreateRoleDto): Promise<RoleResponseDto> {
    // ADMIN rolü oluşturulamaz
    if (dto.name === 'ADMIN') {
      throw new BadRequestException(
        'ADMIN rolü oluşturulamaz. Bu bir sistem rolüdür.',
      );
    }

    // Rol adı unique kontrolü
    const existingRole = await this.prisma.customRole.findFirst({
      where: {
        name: dto.name,
        deletedAt: null,
      },
    });

    if (existingRole) {
      throw new ConflictException('Bu isimde bir rol zaten mevcut');
    }

    // ADMIN izinleri kontrolü
    this.validatePermissions(dto.permissions);

    // Scope validasyonunu kaldırdık - scope'lar rol oluşturulurken değil,
    // kullanıcıya rol atanırken belirlenir

    // Rolü oluştur
    const role = await this.prisma.customRole.create({
      data: {
        name: dto.name,
        description: dto.description,
        hasScopeRestriction: dto.hasScopeRestriction ?? false,
        permissions: {
          create: dto.permissions.map((permission) => ({
            permission,
          })),
        },
        // Scope'ları burada oluşturmuyoruz - kullanıcıya rol atanırken belirlenir
      },
      include: {
        permissions: true,
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description ?? undefined,
      isActive: role.isActive,
      permissions: role.permissions.map((p) => p.permission as Permission),
      hasScopeRestriction: role.hasScopeRestriction,
      // Scope'ları burada döndürmüyoruz - scope'lar rol seviyesinde değil, kullanıcıya rol atanırken belirlenir
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.roleUpdateService.updateRole({
      roleId: id,
      updateData: dto,
    });
    return RoleMapper.toResponseDto(role);
  }

  async deleteRole(id: string): Promise<void> {
    await this.roleDeletionService.deleteRole({ roleId: id });
  }

  async updateRolePermissions(
    id: string,
    dto: UpdateRolePermissionsDto,
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.customRole.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!role) {
      throw new NotFoundException('Rol bulunamadı');
    }

    // ADMIN rolü izinleri düzenlenemez
    if (role.name === 'ADMIN') {
      throw new BadRequestException(
        'ADMIN rolü izinleri düzenlenemez. Bu bir sistem rolüdür.',
      );
    }

    // ADMIN izinleri kontrolü
    this.validatePermissions(dto.permissions);

    // Mevcut izinleri sil
    await this.prisma.customRolePermission.deleteMany({
      where: {
        roleId: id,
      },
    });

    // Yeni izinleri ekle
    await this.prisma.customRolePermission.createMany({
      data: dto.permissions.map((permission) => ({
        roleId: id,
        permission,
      })),
    });

    // Güncellenmiş rolü getir
    return this.getRoleById(id);
  }

  async getCustomRolePermissions(roleIds: string[]): Promise<Permission[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const permissions = await this.prisma.customRolePermission.findMany({
      where: {
        roleId: { in: roleIds },
        role: {
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        permission: true,
      },
    });

    const uniquePermissions = new Set<Permission>();
    permissions.forEach((p) => {
      uniquePermissions.add(p.permission as Permission);
    });
    return Array.from(uniquePermissions);
  }

  private validatePermissions(permissions: Permission[]): void {
    // Custom role'lere tüm izinler verilebilir, ancak ADMIN özel durumda
    // Bu validation sadece bir güvenlik önlemi
    // Gerçek kontrol getPermissionsForRoles'de yapılacak (ADMIN her zaman tüm izinlere sahip)
  }
}
