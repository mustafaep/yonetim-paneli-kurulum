import { ApiProperty } from '@nestjs/swagger';
import { PaymentType } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsDateString,
  Matches,
} from 'class-validator';

export class UpdateMemberPaymentDto {
  @ApiProperty({
    description: 'Üye ID',
    example: 'member-uuid-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiProperty({
    description: 'Kesinti tarihi (sisteme işlendiği tarih)',
    example: '2025-01-15T10:00:00Z',
    type: String,
    required: false,
  })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiProperty({
    description: 'Kesinti dönemi ay (1-12)',
    example: 1,
    type: Number,
    minimum: 1,
    maximum: 12,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  paymentPeriodMonth?: number;

  @ApiProperty({
    description: 'Kesinti dönemi yıl',
    example: 2025,
    type: Number,
    minimum: 2020,
    maximum: 2100,
    required: false,
  })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsOptional()
  paymentPeriodYear?: number;

  @ApiProperty({
    description: 'Ödenen tutar',
    example: '250.00',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tutar formatı geçersiz. Örnek: 250.00',
  })
  amount?: string;

  @ApiProperty({
    description: 'Kesinti türü',
    example: PaymentType.ELDEN,
    enum: PaymentType,
    required: false,
  })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @ApiProperty({
    description: 'Tevkifat merkezi ID',
    example: 'tevkifat-uuid-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  tevkifatCenterId?: string;

  @ApiProperty({
    description: 'Tevkifat dosyası ID',
    example: 'tevkifat-file-uuid-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  tevkifatFileId?: string;

  @ApiProperty({
    description: 'Açıklama',
    example: 'Ocak ayı Kesintisi',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Kesinti belgesi URL (PDF/dekont)',
    example: 'uploads/payments/payment-123.pdf',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  documentUrl?: string;
}
