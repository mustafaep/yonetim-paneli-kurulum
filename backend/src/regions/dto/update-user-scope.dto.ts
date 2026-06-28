import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUserScopeDto {
  @ApiProperty({
    description: 'İl ID (İl Başkanı için)',
    example: 'province-uuid-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiProperty({
    description: 'İlçe ID (İlçe Temsilcisi için)',
    example: 'district-uuid-456',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  districtId?: string;
}
