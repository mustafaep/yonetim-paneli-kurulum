import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Permission } from '../../../auth/permission.enum';
import { RoleScopeDto } from './role-scope.dto';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Rol adı',
    example: 'Muhasebe Uzmanı',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Rol açıklaması',
    example: 'Muhasebe işlemlerini yönetebilir',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Rol izinleri',
    example: [Permission.MEMBER_LIST, Permission.MEMBER_VIEW],
    enum: Permission,
    isArray: true,
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];

  @ApiPropertyOptional({
    description: 'Bu role il/ilçe bazlı yetki alanı eklenecek mi?',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  hasScopeRestriction?: boolean;

  @ApiPropertyOptional({
    description:
      'Yetki alanları (hasScopeRestriction true ise en az bir tane olmalı)',
    type: [RoleScopeDto],
    example: [
      { provinceId: 'province-uuid-1' },
      { provinceId: 'province-uuid-2', districtId: 'district-uuid-1' },
    ],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RoleScopeDto)
  scopes?: RoleScopeDto[];
}
