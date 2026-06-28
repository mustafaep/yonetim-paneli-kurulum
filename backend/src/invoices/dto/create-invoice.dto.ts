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
  IsEnum,
} from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Fatura numarası (kullanıcı tarafından girilir)',
    example: 'FTR-2026-0001',
  })
  @IsString()
  @IsNotEmpty()
  invoiceNo: string;

  @ApiProperty({
    description: 'Alıcı adı / unvanı',
    example: 'ABC Ltd. Şti.',
  })
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @ApiProperty({
    description: 'Düzenleme tarihi (ISO string)',
    example: '2026-03-22T10:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiProperty({
    description: 'Vade tarihi (ISO string)',
    example: '2026-04-22T10:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    description: 'Fatura dönemi ay (1-12)',
    example: 3,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Fatura dönemi yıl',
    example: 2026,
    minimum: 2020,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({
    description: 'Fatura tutarı',
    example: '1250.00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tutar formatı geçersiz. Örnek: 1250.00',
  })
  amount: string;

  @ApiProperty({
    description: 'Fatura durumu',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
    required: false,
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiProperty({
    description: 'Açıklama (opsiyonel)',
    example: 'Mart 2026 hizmet bedeli',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'PDF belge URL\'i (önce /invoices/upload-document ile yükleyin)',
    required: false,
  })
  @IsString()
  @IsOptional()
  documentUrl?: string;
}
