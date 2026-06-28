import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ description: 'Şube adı', example: 'İstanbul Şubesi' })
  @IsString()
  @IsNotEmpty()
  name: string;

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
