import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProvinceDto {
  @ApiProperty({
    description: 'İl adı',
    example: 'İstanbul',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'İl kodu',
    example: '34',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;
}
