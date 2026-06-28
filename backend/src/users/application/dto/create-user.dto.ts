import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEmail,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleScopeDto } from '../../../roles/application/dto/role-scope.dto';

export class CreateUserDto {
  @ApiProperty({
    description: 'Kullanıcı e-posta adresi',
    example: 'user@example.com',
    type: String,
  })
  email: string;

  @ApiProperty({
    description: 'Kullanıcı şifresi',
    example: 'password123',
    type: String,
    format: 'password',
    minLength: 6,
  })
  password: string;

  @ApiProperty({
    description: 'Kullanıcı adı',
    example: 'Ahmet',
    type: String,
  })
  firstName: string;

  @ApiProperty({
    description: 'Kullanıcı soyadı',
    example: 'Yılmaz',
    type: String,
  })
  lastName: string;

  @ApiProperty({
    description: "Kullanıcı özel rol ID'leri",
    example: ['role-id-1', 'role-id-2'],
    type: [String],
    required: false,
  })
  customRoleIds?: string[];

  @ApiPropertyOptional({
    description:
      'Yetki alanları (çoklu il/ilçe seçimi - hasScopeRestriction olan roller için zorunlu)',
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

  @ApiPropertyOptional({
    description:
      'İl ID (geriye uyumluluk için - scopes kullanılması tercih edilir)',
    example: 'province-uuid-123',
    type: String,
    required: false,
    deprecated: true,
  })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiPropertyOptional({
    description:
      'İlçe ID (geriye uyumluluk için - scopes kullanılması tercih edilir)',
    example: 'district-uuid-123',
    type: String,
    required: false,
    deprecated: true,
  })
  @IsString()
  @IsOptional()
  districtId?: string;
}

export class UpdateUserRolesDto {
  @ApiProperty({
    description: "Kullanıcı özel rol ID'leri",
    example: ['role-id-1', 'role-id-2'],
    type: [String],
  })
  @IsArray()
  customRoleIds: string[];
}

export class UpdateUserAccountDto {
  @ApiProperty({
    description: 'Kullanıcı e-posta adresi',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Yeni şifre (girilirse güncellenir)',
    example: 'NewPassword123!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
