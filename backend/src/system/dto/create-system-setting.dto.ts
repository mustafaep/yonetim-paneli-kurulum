import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SystemSettingCategory } from '@prisma/client';

export class CreateSystemSettingDto {
  @ApiProperty({ description: 'Ayar anahtarı' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Ayar değeri' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ description: 'Ayar açıklaması', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Ayar kategorisi', enum: SystemSettingCategory })
  @IsEnum(SystemSettingCategory)
  category: SystemSettingCategory;

  @ApiProperty({ description: 'Düzenlenebilir mi?', default: true })
  @IsBoolean()
  @IsOptional()
  isEditable?: boolean;
}
