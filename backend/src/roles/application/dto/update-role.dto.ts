import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleScopeDto } from './role-scope.dto';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Rol adı',
    example: 'Muhasebe Uzmanı',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

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
    description: 'Rol aktif mi?',
    example: true,
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Bu role il/ilçe bazlı yetki alanı eklenecek mi?',
    example: false,
    type: Boolean,
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
