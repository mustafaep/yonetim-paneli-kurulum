import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateInstitutionDto {
  @ApiProperty({ description: 'Kurum adı', example: 'ABC Kurumu' })
  @IsString()
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
    description: 'İlçe ID',
    example: 'district-uuid-456',
    required: false,
  })
  @IsString()
  @IsOptional()
  districtId?: string;
}

export class UpdateInstitutionDto extends CreateInstitutionDto {
  @ApiProperty({ description: 'Aktif mi?', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
