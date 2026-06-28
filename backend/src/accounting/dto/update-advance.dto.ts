import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDateString,
  Matches,
  IsBoolean,
} from 'class-validator';

export class UpdateAdvanceDto {
  @ApiProperty({
    description: 'Avans tarihi (işlem tarihi)',
    example: '2026-02-20T10:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  advanceDate?: string;

  @ApiProperty({
    description: 'Avans dönemi ay (1-12)',
    example: 2,
    minimum: 1,
    maximum: 12,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiProperty({
    description: 'Avans dönemi yıl',
    example: 2026,
    minimum: 2020,
    maximum: 2100,
    required: false,
  })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Avans tutarı',
    example: '450.00',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tutar formatı geçersiz. Örnek: 450.00',
  })
  amount?: string;

  @ApiProperty({
    description: 'Açıklama (opsiyonel)',
    example: 'Güncellenmiş açıklama',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description:
      'Yeni PDF URL’i (POST /accounting/advances/upload-document çıktısı)',
    required: false,
  })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiProperty({
    description: 'true ise mevcut PDF kaldırılır',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  clearDocument?: boolean;
}

