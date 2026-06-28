import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoleScopeDto } from '../../roles/application/dto/role-scope.dto';

export class DirectPromotePanelUserDto {
  @ApiProperty({
    description: 'İstenen rol ID',
    example: 'role-id-123',
  })
  @IsString()
  @IsNotEmpty()
  requestedRoleId: string;

  @ApiProperty({
    description: 'Kullanıcı email adresi',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Kullanıcı şifresi (minimum 8 karakter)',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'İşlem notu',
    example: 'Üye panel kullanıcısına terfi ettirildi.',
  })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({
    description: 'Yetki alanları (role hasScopeRestriction true ise zorunlu)',
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
