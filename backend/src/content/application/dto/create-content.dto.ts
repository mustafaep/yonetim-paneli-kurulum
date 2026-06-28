import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ContentType, ContentStatus } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty({ description: 'Başlık', example: 'Örnek İçerik' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'İçerik', example: 'İçerik metni...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'İçerik tipi',
    enum: ContentType,
    example: ContentType.ANNOUNCEMENT,
  })
  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @ApiProperty({
    description: 'Durum',
    enum: ContentStatus,
    required: false,
    example: ContentStatus.DRAFT,
  })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;
}
