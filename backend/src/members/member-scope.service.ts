import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/permission.enum';

type CustomRoleWithPermsAndScopes = {
  name: string;
  hasScopeRestriction: boolean;
  roleScopes?: Array<{
    provinceId?: string | null;
    districtId?: string | null;
  }>;
  permissions?: Array<{ permission: string }>;
};

@Injectable()
export class MemberScopeService {
  constructor(private prisma: PrismaService) {}

  private isAdminRoleName(roles: string[]): boolean {
    return roles.includes('ADMIN');
  }

  private rolesHaveMemberListByProvince(
    customRoles: CustomRoleWithPermsAndScopes[] | undefined,
  ): boolean {
    return (
      customRoles?.some((role) =>
        role.permissions?.some(
          (p) => p.permission === Permission.MEMBER_LIST_BY_PROVINCE,
        ),
      ) ?? false
    );
  }

  /**
   * MEMBER_LIST_BY_PROVINCE + hasScopeRestriction + dolu roleScopes ile il/ilçe id'leri.
   */
  private roleHasScopedGeography(role: CustomRoleWithPermsAndScopes): boolean {
    return !!(
      role.hasScopeRestriction &&
      role.roleScopes &&
      role.roleScopes.length > 0 &&
      role.permissions?.some(
        (p) =>
          p.permission === Permission.MEMBER_LIST_BY_PROVINCE ||
          p.permission === Permission.MEMBER_APPLICATIONS_VIEW ||
          p.permission === Permission.MEMBER_HISTORY_VIEW,
      )
    );
  }

  /** MEMBER_APPLICATIONS_VIEW + rol il/ilçe kapsamı (MEMBER_LIST_BY_PROVINCE olmadan) */
  private rolesHaveScopedApplicationsView(
    customRoles: CustomRoleWithPermsAndScopes[] | undefined,
  ): boolean {
    return (
      customRoles?.some(
        (role) =>
          role.permissions?.some(
            (p) => p.permission === Permission.MEMBER_APPLICATIONS_VIEW,
          ) && this.roleHasScopedGeography(role),
      ) ?? false
    );
  }

  /** MEMBER_HISTORY_VIEW + rol il/ilçe kapsamı */
  private rolesHaveScopedHistoryView(
    customRoles: CustomRoleWithPermsAndScopes[] | undefined,
  ): boolean {
    return (
      customRoles?.some(
        (role) =>
          role.permissions?.some(
            (p) => p.permission === Permission.MEMBER_HISTORY_VIEW,
          ) && this.roleHasScopedGeography(role),
      ) ?? false
    );
  }

  private collectIdsFromScopedCustomRoles(
    customRoles: CustomRoleWithPermsAndScopes[] | undefined,
  ): { districtIds: string[]; provinceIds: string[] } {
    const districtIds: string[] = [];
    const provinceIds: string[] = [];

    const scoped =
      customRoles?.filter((role) => this.roleHasScopedGeography(role)) ?? [];

    for (const role of scoped) {
      for (const scope of role.roleScopes ?? []) {
        if (scope.districtId) {
          districtIds.push(scope.districtId);
        } else if (scope.provinceId) {
          provinceIds.push(scope.provinceId);
        }
      }
    }
    return { districtIds, provinceIds };
  }

  async buildMemberWhereForUser(
    user: CurrentUserData,
  ): Promise<Prisma.MemberWhereInput> {
    const jwtRoles = user.roles || [];

    if (this.isAdminRoleName(jwtRoles)) {
      return {};
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          include: {
            permissions: true,
            roleScopes: {
              where: {
                deletedAt: null,
              },
              include: {
                province: true,
                district: true,
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return { id: '' };
    }

    const customRoles =
      (dbUser as User & { customRoles?: CustomRoleWithPermsAndScopes[] })
        .customRoles ?? [];

    const customNames = customRoles.map((r) => r.name);
    if (this.isAdminRoleName(customNames)) {
      return {};
    }

    const scopes = await this.prisma.userScope.findMany({
      where: {
        userId: user.userId,
        deletedAt: null,
      },
    });

    const hasMbp = this.rolesHaveMemberListByProvince(customRoles);
    const hasUserScopes = scopes.length > 0;
    const hasScopedAppView = this.rolesHaveScopedApplicationsView(customRoles);
    const hasScopedHistoryView = this.rolesHaveScopedHistoryView(customRoles);

    // Coğrafi kısıt yok: tüm üyeler (endpoint izinleriyle korunur)
    if (!hasMbp && !hasUserScopes && !hasScopedAppView && !hasScopedHistoryView) {
      return {};
    }

    const parts: Prisma.MemberWhereInput[] = [];

    const { districtIds: crDistricts, provinceIds: crProvinces } =
      this.collectIdsFromScopedCustomRoles(customRoles);

    if (crDistricts.length > 0) {
      parts.push({
        districtId: { in: [...new Set(crDistricts)] },
      });
    } else if (crProvinces.length > 0) {
      parts.push({
        provinceId: { in: [...new Set(crProvinces)] },
      });
    }

    if (hasUserScopes) {
      const usDistricts = scopes
        .map((s) => s.districtId)
        .filter((id): id is string => id != null);
      const usProvinces = scopes
        .filter((s) => s.provinceId && !s.districtId)
        .map((s) => s.provinceId)
        .filter((id): id is string => id != null);

      if (usDistricts.length > 0) {
        parts.push({
          districtId: { in: [...new Set(usDistricts)] },
        });
      }
      if (usProvinces.length > 0) {
        parts.push({
          provinceId: { in: [...new Set(usProvinces)] },
        });
      }
    }

    if (parts.length === 0) {
      return { id: '' };
    }
    if (parts.length === 1) {
      return parts[0]!;
    }
    return { OR: parts };
  }

  async getUserScopeIds(
    user: CurrentUserData,
  ): Promise<{ provinceId?: string; districtId?: string }> {
    const jwtRoles = user.roles || [];

    if (this.isAdminRoleName(jwtRoles)) {
      return {};
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          include: {
            permissions: true,
            roleScopes: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return {};
    }

    const customRoles =
      (dbUser as User & { customRoles?: CustomRoleWithPermsAndScopes[] })
        .customRoles ?? [];

    const customNames = customRoles.map((r) => r.name);
    if (this.isAdminRoleName(customNames)) {
      return {};
    }

    const scopes = await this.prisma.userScope.findMany({
      where: {
        userId: user.userId,
        deletedAt: null,
      },
    });

    const hasMbp = this.rolesHaveMemberListByProvince(customRoles);
    const hasScopedAppView = this.rolesHaveScopedApplicationsView(customRoles);
    const hasScopedHistoryView = this.rolesHaveScopedHistoryView(customRoles);
    const hasUserScopes = scopes.length > 0;

    if (
      !hasMbp &&
      !hasUserScopes &&
      !hasScopedAppView &&
      !hasScopedHistoryView
    ) {
      return {};
    }

    const scopedRoles = customRoles.filter((role) =>
      this.roleHasScopedGeography(role),
    );

    if (scopedRoles.length > 0) {
      const firstRole = scopedRoles[0];
      if (firstRole.roleScopes && firstRole.roleScopes.length > 0) {
        const firstScope = firstRole.roleScopes[0];
        if (firstScope.districtId) {
          return {
            provinceId: firstScope.provinceId || undefined,
            districtId: firstScope.districtId,
          };
        }
        if (firstScope.provinceId) {
          return { provinceId: firstScope.provinceId };
        }
      }
    }

    if (hasUserScopes) {
      const firstScope = scopes[0];
      if (firstScope.districtId) {
        return {
          provinceId: firstScope.provinceId || undefined,
          districtId: firstScope.districtId,
        };
      }
      if (firstScope.provinceId) {
        return { provinceId: firstScope.provinceId };
      }
    }

    return {};
  }
}
