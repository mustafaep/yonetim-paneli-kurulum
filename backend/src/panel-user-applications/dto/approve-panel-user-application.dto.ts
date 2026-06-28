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

export class ApprovePanelUserApplicationDto {
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
    description: 'Onay notu',
    example: 'Başvuru onaylandı',
  })
  @IsString()
  @IsOptional()
  reviewNote?: string;

  @ApiPropertyOptional({
    description:
      'Yetki alanları (role hasScopeRestriction true ise zorunlu, admin değiştirebilir)',
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
