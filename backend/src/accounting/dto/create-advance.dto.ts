import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateAdvanceDto {
  @ApiProperty({
    description: 'Üye ID',
    example: 'member-uuid-123',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({
    description: 'Avans tarihi (işlem tarihi)',
    example: '2026-02-15T10:00:00Z',
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
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Avans dönemi yıl',
    example: 2026,
    minimum: 2020,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({
    description: 'Avans tutarı',
    example: '401.16',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tutar formatı geçersiz. Örnek: 401.16',
  })
  amount: string;

  @ApiProperty({
    description: 'Açıklama (opsiyonel)',
    example: 'Şubat 2026 avansı',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description:
      'PDF belge URL’i (önce POST /accounting/advances/upload-document ile yükleyin)',
    example: '/uploads/advances/Avans_...pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  documentUrl?: string;
}

