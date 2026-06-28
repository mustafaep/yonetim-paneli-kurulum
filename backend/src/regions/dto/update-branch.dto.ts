import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateBranchDto {
  @ApiProperty({
    description: 'Şube adı',
    example: 'İstanbul Şubesi',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Aktif mi?', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'İl ID (opsiyonel)',
    example: 'province-uuid-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiProperty({
    description: 'İlçe ID (opsiyonel)',
    example: 'district-uuid-456',
    required: false,
  })
  @IsString()
  @IsOptional()
  districtId?: string;
}
