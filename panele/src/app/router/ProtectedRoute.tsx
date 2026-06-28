// src/app/router/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';

interface ProtectedRouteProps {
  /** En az biri yeterli (OR) */
  requiredPermission?: string;
  alternativePermission?: string;
  alternativePermission2?: string;
  alternativePermission3?: string;
  /** Hepsi gerekli (AND); örn. rol düzenleme: ROLE_UPDATE + ROLE_MANAGE_PERMISSIONS */
  requiredAllOf?: string[];
  /** Listeden en az bir izin (OR); çoklu alternatif için tercih edilir */
  requiredAnyOf?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  alternativePermission,
  alternativePermission2,
  alternativePermission3,
  requiredAllOf,
  requiredAnyOf,
}) => {
  const { isAuthenticated, hasPermission, isLoading } = useAuth();

  // Token kontrolü tamamlanana kadar bekle
  if (isLoading) {
    return null; // veya bir loading spinner gösterilebilir
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredAllOf && requiredAllOf.length > 0) {
    const allOk = requiredAllOf.every((p) => hasPermission(p));
    if (!allOk) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  if (requiredAnyOf && requiredAnyOf.length > 0) {
    const anyOk = requiredAnyOf.some((p) => hasPermission(p));
    if (!anyOk) {
      return <Navigate to="/forbidden" replace />;
    }
    return <Outlet />;
  }

  if (requiredPermission) {
    const hasRequired = hasPermission(requiredPermission);
    const hasAlternative = alternativePermission ? hasPermission(alternativePermission) : false;
    const hasAlternative2 = alternativePermission2 ? hasPermission(alternativePermission2) : false;
    const hasAlternative3 = alternativePermission3 ? hasPermission(alternativePermission3) : false;
    
    if (!hasRequired && !hasAlternative && !hasAlternative2 && !hasAlternative3) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
