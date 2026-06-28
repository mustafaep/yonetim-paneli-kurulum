import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../permission.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private hasPermissionWithLegacySupport(
    userPermissions: Permission[],
    requiredPermission: Permission,
  ): boolean {
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Backward compatibility for renamed tevkifat permissions
    if (
      requiredPermission === Permission.TEVKIFAT_VIEW &&
      userPermissions.includes('ACCOUNTING_VIEW' as Permission)
    ) {
      return true;
    }
    if (
      requiredPermission === Permission.TEVKIFAT_EXPORT &&
      userPermissions.includes('ACCOUNTING_EXPORT' as Permission)
    ) {
      return true;
    }

    // Eski ADVANCE_ADD: tüm avans mutasyon izinlerine eşdeğer
    if (userPermissions.includes(Permission.ADVANCE_ADD)) {
      const advanceMutations: Permission[] = [
        Permission.ADVANCE_CREATE,
        Permission.ADVANCE_UPDATE,
        Permission.ADVANCE_DELETE,
        Permission.ADVANCE_DOCUMENT,
      ];
      if (advanceMutations.includes(requiredPermission)) {
        return true;
      }
    }

    // Eski WHATSAPP_ACCESS → tüm WhatsApp alt izinleri
    if (userPermissions.includes(Permission.WHATSAPP_ACCESS)) {
      const waGranular: Permission[] = [
        Permission.WHATSAPP_CHAT_VIEW,
        Permission.WHATSAPP_CHAT_SEND,
        Permission.WHATSAPP_CHAT_MANAGE,
        Permission.WHATSAPP_BULK_SEND,
        Permission.WHATSAPP_TEMPLATE_VIEW,
        Permission.WHATSAPP_TEMPLATE_MANAGE,
        Permission.WHATSAPP_INSTANCE_MANAGE,
      ];
      if (waGranular.includes(requiredPermission)) {
        return true;
      }
    }

    // Eski bildirim kapsamları → WhatsApp sohbet / şablon okuma (API öncesi davranış)
    const notifyChatScope =
      userPermissions.includes(Permission.NOTIFY_ALL_MEMBERS) ||
      userPermissions.includes(Permission.NOTIFY_REGION) ||
      userPermissions.includes(Permission.NOTIFY_OWN_SCOPE);
    if (notifyChatScope) {
      if (
        requiredPermission === Permission.WHATSAPP_CHAT_VIEW ||
        requiredPermission === Permission.WHATSAPP_CHAT_SEND ||
        requiredPermission === Permission.WHATSAPP_CHAT_MANAGE ||
        requiredPermission === Permission.WHATSAPP_TEMPLATE_VIEW
      ) {
        return true;
      }
    }
    if (userPermissions.includes(Permission.NOTIFY_ALL_MEMBERS)) {
      if (
        requiredPermission === Permission.WHATSAPP_BULK_SEND ||
        requiredPermission === Permission.WHATSAPP_TEMPLATE_MANAGE ||
        requiredPermission === Permission.WHATSAPP_INSTANCE_MANAGE
      ) {
        return true;
      }
    }

    // Üst izin alt okumayı kapsar
    if (
      requiredPermission === Permission.WHATSAPP_CHAT_VIEW &&
      (userPermissions.includes(Permission.WHATSAPP_CHAT_SEND) ||
        userPermissions.includes(Permission.WHATSAPP_CHAT_MANAGE))
    ) {
      return true;
    }
    if (
      requiredPermission === Permission.WHATSAPP_TEMPLATE_VIEW &&
      userPermissions.includes(Permission.WHATSAPP_TEMPLATE_MANAGE)
    ) {
      return true;
    }

    return false;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    // Endpoint'e @Permissions konmadıysa → sadece JWT yeterli
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // ADMIN rolü kontrolü - ADMIN ise tüm permission'lara sahip
    if (
      user.roles &&
      Array.isArray(user.roles) &&
      user.roles.includes('ADMIN')
    ) {
      return true;
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      return false;
    }

    const userPermissions: Permission[] = user.permissions;
    return requiredPermissions.some((p) =>
      this.hasPermissionWithLegacySupport(userPermissions, p),
    );
  }
}
