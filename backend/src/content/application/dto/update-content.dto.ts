import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ContentType, ContentStatus } from '@prisma/client';

export class UpdateContentDto {
  @ApiProperty({ description: 'Başlık', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'İçerik', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'İçerik tipi',
    enum: ContentType,
    required: false,
  })
  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType;

  @ApiProperty({ description: 'Durum', enum: ContentStatus, required: false })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;
}
