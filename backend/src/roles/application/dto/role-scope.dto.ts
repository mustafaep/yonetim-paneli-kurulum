import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RoleScopeDto {
  @ApiPropertyOptional({
    description: 'İl ID',
    example: 'province-uuid-123',
    type: String,
  })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiPropertyOptional({
    description: 'İlçe ID',
    example: 'district-uuid-456',
    type: String,
  })
  @IsString()
  @IsOptional()
  districtId?: string;
}
