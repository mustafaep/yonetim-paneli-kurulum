import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoleScopeDto } from '../../roles/application/dto/role-scope.dto';

export class CreatePanelUserApplicationDto {
  @ApiProperty({ description: 'İstenen rol ID', example: 'role-id-123' })
  @IsString()
  @IsNotEmpty()
  requestedRoleId: string;

  @ApiPropertyOptional({
    description: 'Başvuru notu',
    example: 'Üye panel kullanıcısı olmak istiyor',
  })
  @IsString()
  @IsOptional()
  requestNote?: string;

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
