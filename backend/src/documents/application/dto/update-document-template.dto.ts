import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { DocumentTemplateType } from '@prisma/client';

export class UpdateDocumentTemplateDto {
  @ApiProperty({ description: 'Şablon adı', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Açıklama', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'HTML şablon içeriği', required: false })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiProperty({
    description: 'Şablon tipi',
    enum: DocumentTemplateType,
    required: false,
  })
  @IsEnum(DocumentTemplateType)
  @IsOptional()
  type?: DocumentTemplateType;

  @ApiProperty({ description: 'Aktif mi?', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
