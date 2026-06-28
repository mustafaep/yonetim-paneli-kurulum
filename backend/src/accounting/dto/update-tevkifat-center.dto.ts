import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateTevkifatCenterDto {
  @ApiProperty({ description: 'Tevkifat merkezi adı', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Aktiflik durumu', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'İl ID (opsiyonel)', required: false })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiProperty({ description: 'İlçe ID (opsiyonel)', required: false })
  @IsString()
  @IsOptional()
  districtId?: string;
}
