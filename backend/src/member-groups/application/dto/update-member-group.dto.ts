import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateMemberGroupDto {
  @ApiProperty({
    description: 'Üye grubu adı',
    example: 'Öğretmenler',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Açıklama',
    example: 'Öğretmen üyeler',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Aktif mi?',
    example: true,
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Sıra numarası',
    example: 1,
    type: Number,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;
}
