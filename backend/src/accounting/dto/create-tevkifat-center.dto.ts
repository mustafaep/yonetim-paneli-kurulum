import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateTevkifatCenterDto {
  @ApiProperty({
    description: 'Tevkifat merkezi adı',
    example: 'Sağlık Bakanlığı Tevkifat Merkezi',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'İl ID (opsiyonel)', required: false })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiProperty({ description: 'İlçe ID (opsiyonel)', required: false })
  @IsString()
  @IsOptional()
  districtId?: string;
}
