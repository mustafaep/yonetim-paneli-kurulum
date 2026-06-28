import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../../auth/permission.enum';

export class RoleScopeResponseDto {
  @ApiProperty({
    description: 'Scope ID',
    example: 'scope-uuid-123',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'İl ID',
    example: 'province-uuid-123',
  })
  provinceId?: string;

  @ApiPropertyOptional({
    description: 'İl bilgisi',
  })
  province?: {
    id: string;
    name: string;
    code?: string;
  };

  @ApiPropertyOptional({
    description: 'İlçe ID',
    example: 'district-uuid-123',
  })
  districtId?: string;

  @ApiPropertyOptional({
    description: 'İlçe bilgisi',
  })
  district?: {
    id: string;
    name: string;
    provinceId: string;
  };
}

export class RoleResponseDto {
  @ApiProperty({
    description: 'Rol ID',
    example: 'role-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Rol adı',
    example: 'Muhasebe Uzmanı',
  })
  name: string;

  @ApiProperty({
    description: 'Rol açıklaması',
    example: 'Muhasebe işlemlerini yönetebilir',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Rol aktif mi?',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Rol izinleri',
    example: [Permission.MEMBER_LIST, Permission.MEMBER_VIEW],
    enum: Permission,
    isArray: true,
  })
  permissions: Permission[];

  @ApiProperty({
    description: 'Oluşturulma tarihi',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Güncellenme tarihi',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Bu role il/ilçe bazlı yetki alanı eklenecek mi?',
    example: false,
  })
  hasScopeRestriction: boolean;

  @ApiPropertyOptional({
    description: 'Yetki alanları (hasScopeRestriction true ise)',
    type: [RoleScopeResponseDto],
    isArray: true,
  })
  scopes?: RoleScopeResponseDto[];
}

export class SystemRoleResponseDto {
  @ApiProperty({
    description: 'Sistem rolü adı',
    example: 'ADMIN',
  })
  name: string;

  @ApiProperty({
    description: 'Rol izinleri',
    enum: Permission,
    isArray: true,
  })
  permissions: Permission[];

  @ApiProperty({
    description: 'Sistem rolü mü?',
    example: true,
  })
  isSystemRole: boolean;
}
