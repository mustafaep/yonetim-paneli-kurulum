import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateMemberGroupDto {
  @ApiProperty({
    description: 'Üye grubu adı',
    example: 'Öğretmenler',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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
