import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { DocumentTemplateType } from '@prisma/client';

export class CreateDocumentTemplateDto {
  @ApiProperty({ description: 'Şablon adı', example: 'Üye Kayıt Belgesi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Açıklama', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'HTML şablon içeriği',
    example: '<html>...</html>',
  })
  @IsString()
  @IsNotEmpty()
  template: string;

  @ApiProperty({ description: 'Şablon tipi', enum: DocumentTemplateType })
  @IsEnum(DocumentTemplateType)
  @IsNotEmpty()
  type: DocumentTemplateType;

  @ApiProperty({ description: 'Aktif mi?', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
