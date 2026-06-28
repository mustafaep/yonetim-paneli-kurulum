import React from 'react';
import { useAuth } from '../../../app/providers/AuthContext';

interface PermissionGuardProps {
  permissions?: string | string[];
  roles?: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions,
  roles,
  children,
  fallback = null,
}) => {
  const { user } = useAuth();

  // Role check
  if (roles) {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const hasRole = user?.roles.some((role) => roleArray.includes(role));
    if (!hasRole) {
      return <>{fallback}</>;
    }
  }

  // Permission check
  if (permissions) {
    if (!user) {
      return <>{fallback}</>;
    }
    const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
    const hasPermission = permissionArray.some((perm) => {
      // Admin her şeye erişebilir
      if (user.roles?.includes('ADMIN')) return true;
      return user.permissions?.includes(perm) ?? false;
    });
    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default PermissionGuard;
