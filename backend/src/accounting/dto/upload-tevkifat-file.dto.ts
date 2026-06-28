import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { PositionTitle } from '@prisma/client';

export class UploadTevkifatFileDto {
  @ApiProperty({
    description: 'Tevkifat merkezi ID',
    example: 'tevkifat-uuid-123',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  tevkifatCenterId: string;

  @ApiProperty({
    description: 'Gelen tutar toplamı',
    example: 50000.0,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @ApiProperty({
    description: 'Üye sayısı',
    example: 100,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  memberCount: number;

  @ApiProperty({
    description: 'Ay (1-12)',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Yıl',
    example: 2025,
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  year: number;

  @ApiProperty({
    description: 'Kadro (seçmeli)',
    example: PositionTitle.KADRO_657,
    enum: PositionTitle,
    required: false,
  })
  @IsOptional()
  @IsEnum(PositionTitle)
  positionTitle?: PositionTitle;

  @ApiProperty({
    description: "Dosya URL (yüklenmiş dosyanın URL'i)",
    example: 'uploads/tevkifat/file.pdf',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({
    description: 'Dosya adı',
    example: 'tevkifat-2025-01.pdf',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'Dosya boyutu (byte)',
    example: 1024000,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  fileSize?: number;
}
