import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from '../../roles.service';
import { CreateRoleDto } from '../../application/dto/create-role.dto';
import { UpdateRoleDto } from '../../application/dto/update-role.dto';
import { UpdateRolePermissionsDto } from '../../application/dto/update-role-permissions.dto';
import { RoleResponseDto } from '../../dto/role-response.dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { RoleQueryApplicationService } from '../../application/services/role-query-application.service';
import { RoleCreationApplicationService } from '../../application/services/role-creation-application.service';
import { RoleUpdateApplicationService } from '../../application/services/role-update-application.service';
import { RolePermissionsUpdateApplicationService } from '../../application/services/role-permissions-update-application.service';
import { RoleDeletionApplicationService } from '../../application/services/role-deletion-application.service';
import { RoleMapper } from '../../application/mappers/role.mapper';
import { RoleExceptionFilter } from '../filters/role-exception.filter';
import { RoleValidationPipe } from '../pipes/role-validation.pipe';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
@UseFilters(RoleExceptionFilter)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly roleQueryService: RoleQueryApplicationService,
    private readonly roleCreationService: RoleCreationApplicationService,
    private readonly roleUpdateService: RoleUpdateApplicationService,
    private readonly rolePermissionsUpdateService: RolePermissionsUpdateApplicationService,
    private readonly roleDeletionService: RoleDeletionApplicationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Permissions(Permission.ROLE_LIST)
  @ApiOperation({
    summary: 'Tüm rolleri listele',
    description: 'Sistem rolleri ve custom rolleri birlikte listeler',
  })
  @ApiResponse({
    status: 200,
    description: 'Rol listesi',
    type: [RoleResponseDto],
  })
  async listRoles() {
    const roles = await this.rolesService.listRoles();
    return roles;
  }

  @Get(':id')
  @Permissions(Permission.ROLE_VIEW)
  @ApiOperation({
    summary: 'Rol detayını getir',
    description: 'ID ile rol bilgilerini ve izinlerini getirir',
  })
  @ApiParam({ name: 'id', description: 'Rol ID', example: 'role-uuid-123' })
  @ApiResponse({
    status: 200,
    description: 'Rol bilgileri',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rol bulunamadı' })
  async getRoleById(@Param('id') id: string) {
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
      return this.rolesService.getRoleById(id);
    }

    return RoleMapper.toResponseDto(role, prismaRole.users);
  }

  @Post()
  @UsePipes(RoleValidationPipe)
  @Permissions(Permission.ROLE_CREATE)
  @ApiOperation({
    summary: 'Yeni rol oluştur',
    description: 'Yeni bir custom rol ve izinlerini oluşturur',
  })
  @ApiResponse({
    status: 201,
    description: 'Rol başarıyla oluşturuldu',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Bu isimde bir rol zaten mevcut' })
  async createRole(@Body() dto: CreateRoleDto) {
    const role = await this.roleCreationService.createRole({ dto });
    return RoleMapper.toResponseDto(role);
  }

  @Put(':id')
  @UsePipes(RoleValidationPipe)
  @Permissions(Permission.ROLE_UPDATE)
  @ApiOperation({
    summary: 'Rol bilgilerini güncelle',
    description: 'Rol adı, açıklaması ve aktiflik durumunu günceller',
  })
  @ApiParam({ name: 'id', description: 'Rol ID', example: 'role-uuid-123' })
  @ApiResponse({
    status: 200,
    description: 'Rol başarıyla güncellendi',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rol bulunamadı' })
  @ApiResponse({ status: 409, description: 'Bu isimde bir rol zaten mevcut' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const role = await this.roleUpdateService.updateRole({
      roleId: id,
      updateData: dto,
    });
    return RoleMapper.toResponseDto(role);
  }

  @Delete(':id')
  @Permissions(Permission.ROLE_DELETE)
  @ApiOperation({
    summary: 'Rolü sil',
    description: 'Rolü soft delete yapar. Kullanıcılara atanmışsa silinemez.',
  })
  @ApiParam({ name: 'id', description: 'Rol ID', example: 'role-uuid-123' })
  @ApiResponse({
    status: 200,
    description: 'Rol başarıyla silindi',
  })
  @ApiResponse({ status: 404, description: 'Rol bulunamadı' })
  @ApiResponse({
    status: 400,
    description: 'Rol kullanıcılara atanmış, silinemez',
  })
  async deleteRole(@Param('id') id: string) {
    await this.roleDeletionService.deleteRole({ roleId: id });
    return { message: 'Rol başarıyla silindi' };
  }

  @Put(':id/permissions')
  @UsePipes(RoleValidationPipe)
  @Permissions(Permission.ROLE_MANAGE_PERMISSIONS)
  @ApiOperation({
    summary: 'Rol izinlerini güncelle',
    description: 'Rolün izinlerini tamamen değiştirir',
  })
  @ApiParam({ name: 'id', description: 'Rol ID', example: 'role-uuid-123' })
  @ApiResponse({
    status: 200,
    description: 'Rol izinleri başarıyla güncellendi',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rol bulunamadı' })
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    const role = await this.rolePermissionsUpdateService.updatePermissions({
      roleId: id,
      permissions: dto.permissions,
    });
    return RoleMapper.toResponseDto(role);
  }
}
