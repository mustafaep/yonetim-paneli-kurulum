import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Artık CustomRole isimleri (string) kullanılıyor
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
