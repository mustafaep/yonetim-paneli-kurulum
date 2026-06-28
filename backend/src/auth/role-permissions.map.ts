import { Permission } from './permission.enum';

export const ALL_PERMISSIONS = Object.values(Permission);

// Artık tüm roller CustomRole üzerinden yönetiliyor
// Bu fonksiyon sadece CustomRole'lerden gelen izinleri birleştirir
export const getPermissionsForCustomRoles = (
  customRolePermissions: Permission[],
): Permission[] => {
  const set = new Set<Permission>();

  // Custom rolleri için izinleri ekle
  customRolePermissions.forEach((p) => set.add(p));

  return Array.from(set);
};
