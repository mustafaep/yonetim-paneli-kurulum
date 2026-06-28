import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Body,
  NotFoundException,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from '../../users.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { UserQueryApplicationService } from '../../application/services/user-query-application.service';
import { UserUpdateRolesApplicationService } from '../../application/services/user-update-roles-application.service';
import { UserDemotionApplicationService } from '../../application/services/user-demotion-application.service';
import { UserMapper } from '../../application/mappers/user.mapper';
import { UserExceptionFilter } from '../filters/user-exception.filter';
import { UserValidationPipe } from '../pipes/user-validation.pipe';
import {
  UpdateUserRolesDto,
  UpdateUserAccountDto,
} from '../../application/dto/create-user.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseFilters(UserExceptionFilter)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userQueryService: UserQueryApplicationService,
    private readonly userUpdateRolesService: UserUpdateRolesApplicationService,
    private readonly userDemotionService: UserDemotionApplicationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Mevcut kullanıcı bilgilerini getir',
    description: "JWT token'dan kullanıcı bilgilerini döner",
  })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı bilgileri',
  })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  async getMe(@CurrentUser() user: CurrentUserData) {
    const dbUser = await this.usersService.findById(user.userId);

    if (!dbUser) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const userWithRoles = dbUser as typeof dbUser & {
      customRoles?: Array<{
        name: string;
        hasScopeRestriction: boolean;
        permissions: Array<{ permission: string }>;
      }>;
    };

    const permissions: string[] = [];
    if (userWithRoles.customRoles) {
      userWithRoles.customRoles.forEach((role) => {
        role.permissions.forEach((perm) => {
          if (!permissions.includes(perm.permission)) {
            permissions.push(perm.permission);
          }
        });
      });
    }

    const userWithMember = dbUser as typeof dbUser & {
      member?: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
    };

    const scopeRestricted =
      userWithRoles.customRoles?.some((r) => r.hasScopeRestriction) ?? false;

    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      roles: userWithRoles.customRoles?.map((r) => r.name) || [],
      permissions,
      scopeRestricted,
      member: userWithMember.member
        ? {
            id: userWithMember.member.id,
            firstName: userWithMember.member.firstName,
            lastName: userWithMember.member.lastName,
          }
        : null,
    };
  }

  @Permissions(Permission.USER_LIST)
  @Get()
  @ApiOperation({
    summary: 'Tüm kullanıcıları listele',
    description: 'Sadece USER_LIST yetkisi olan kullanıcılar erişebilir',
  })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı listesi',
  })
  async getAllUsers() {
    const users = await this.usersService.findAll();
    return users.map((u) => {
      const userWithRoles = u as typeof u & {
        customRoles?: Array<{ name: string }>;
        member?: { id: string } | null;
      };
      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        roles: userWithRoles.customRoles?.map((r) => r.name) || [],
        isActive: u.isActive,
        memberId: userWithRoles.member?.id ?? null,
      };
    });
  }

  @Permissions(Permission.USER_VIEW)
  @Get(':id')
  @ApiOperation({
    summary: 'Kullanıcı detayını getir',
    description: 'ID ile kullanıcı bilgilerini getirir',
  })
  @ApiParam({
    name: 'id',
    description: 'Kullanıcı ID',
    example: 'user-uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı bilgileri',
  })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  async getById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const userWithRoles = user as typeof user & {
      customRoles?: Array<{
        name: string;
        permissions: Array<{ permission: string }>;
      }>;
    };

    const permissions: string[] = [];
    if (userWithRoles.customRoles) {
      userWithRoles.customRoles.forEach((role) => {
        role.permissions.forEach((perm) => {
          if (!permissions.includes(perm.permission)) {
            permissions.push(perm.permission);
          }
        });
      });
    }

    const userWithMember = user as typeof user & {
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
    };

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: userWithRoles.customRoles?.map((r) => r.name) || [],
      permissions,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      deletedAt: user.deletedAt?.toISOString() || null,
      member: userWithMember.member
        ? {
            id: userWithMember.member.id,
            firstName: userWithMember.member.firstName,
            lastName: userWithMember.member.lastName,
            nationalId: userWithMember.member.nationalId,
            phone: userWithMember.member.phone,
            email: userWithMember.member.email,
            status: userWithMember.member.status,
            registrationNumber: userWithMember.member.registrationNumber,
          }
        : null,
    };
  }

  @Permissions(
    Permission.USER_SOFT_DELETE,
    Permission.PANEL_USER_APPLICATION_APPROVE,
  )
  @Post(':id/demote-to-member')
  @ApiOperation({
    summary: 'Panel kullanıcısını tekrar yalnız üyeliğe düşür',
    description:
      'Üyeye bağlı panel hesabını kapatır; üye yeniden panel başvurusu yapabilir.',
  })
  @ApiParam({ name: 'id', description: 'Kullanıcı ID' })
  @ApiResponse({ status: 200, description: 'İşlem tamamlandı' })
  @ApiResponse({
    status: 400,
    description: 'Üyeye bağlı değil veya ADMIN',
  })
  async demoteToMember(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.userDemotionService.demoteMemberLinkedPanelUser(
      id,
      user.userId,
    );
    return { success: true };
  }

  @Permissions(Permission.USER_ASSIGN_ROLE)
  @Patch(':id/roles')
  @UsePipes(UserValidationPipe)
  @ApiOperation({
    summary: 'Kullanıcı rollerini güncelle',
    description: 'Kullanıcıya özel roller atar',
  })
  @ApiParam({
    name: 'id',
    description: 'Kullanıcı ID',
    example: 'user-uuid-123',
  })
  @ApiBody({ type: UpdateUserRolesDto })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı rolleri başarıyla güncellendi',
  })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  async updateUserRoles(
    @Param('id') id: string,
    @Body() body: UpdateUserRolesDto,
  ) {
    const user = await this.userUpdateRolesService.updateRoles({
      userId: id,
      customRoleIds: body.customRoleIds,
    });

    const prismaUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!prismaUser) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const userWithRoles = prismaUser as typeof prismaUser & {
      customRoles?: Array<{
        name: string;
        permissions: Array<{ permission: string }>;
      }>;
    };

    return {
      id: prismaUser.id,
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      roles: userWithRoles.customRoles?.map((r) => r.name) || [],
      permissions:
        userWithRoles.customRoles?.flatMap((r) =>
          r.permissions.map((p) => p.permission),
        ) || [],
      isActive: prismaUser.isActive,
    };
  }

  @Permissions(Permission.PANEL_USER_APPLICATION_APPROVE)
  @Patch(':id/account')
  @ApiOperation({
    summary: 'Panel kullanıcı hesap bilgilerini güncelle',
    description: 'Email ve opsiyonel olarak şifreyi günceller',
  })
  @ApiParam({
    name: 'id',
    description: 'Kullanıcı ID',
    example: 'user-uuid-123',
  })
  @ApiBody({ type: UpdateUserAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı hesap bilgileri güncellendi',
  })
  async updateUserAccount(
    @Param('id') id: string,
    @Body() body: UpdateUserAccountDto,
  ) {
    const updated = await this.usersService.updateAccount(id, {
      email: body.email,
      password: body.password,
    });

    if (!updated) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const userWithRoles = updated as typeof updated & {
      customRoles?: Array<{
        name: string;
        permissions: Array<{ permission: string }>;
      }>;
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
    };

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      roles: userWithRoles.customRoles?.map((r) => r.name) || [],
      permissions:
        userWithRoles.customRoles?.flatMap((r) =>
          r.permissions.map((p) => p.permission),
        ) || [],
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      deletedAt: updated.deletedAt?.toISOString() || null,
      member: userWithRoles.member
        ? {
            id: userWithRoles.member.id,
            firstName: userWithRoles.member.firstName,
            lastName: userWithRoles.member.lastName,
            nationalId: userWithRoles.member.nationalId,
            phone: userWithRoles.member.phone,
            email: userWithRoles.member.email,
            status: userWithRoles.member.status,
            registrationNumber: userWithRoles.member.registrationNumber,
          }
        : null,
    };
  }
}
