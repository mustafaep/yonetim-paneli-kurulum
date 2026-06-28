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
  IsEnum,
} from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceDto {
  @ApiProperty({
    description: 'Fatura numarası',
    required: false,
  })
  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @ApiProperty({
    description: 'Alıcı adı / unvanı',
    required: false,
  })
  @IsString()
  @IsOptional()
  recipient?: string;

  @ApiProperty({
    description: 'Düzenleme tarihi (ISO string)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiProperty({
    description: 'Vade tarihi (ISO string)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    description: 'Fatura dönemi ay (1-12)',
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiProperty({
    description: 'Fatura dönemi yıl',
    required: false,
  })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Fatura tutarı',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Tutar formatı geçersiz. Örnek: 1250.00',
  })
  amount?: string;

  @ApiProperty({
    description: 'Fatura durumu',
    enum: InvoiceStatus,
    required: false,
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiProperty({
    description: 'Açıklama (opsiyonel)',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Yeni PDF URL\'i',
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
