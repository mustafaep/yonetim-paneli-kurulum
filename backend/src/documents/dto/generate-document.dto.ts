import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateDocumentDto {
  @ApiProperty({ description: 'Üye ID' })
  @IsString()
  memberId: string;

  @ApiProperty({ description: 'Şablon ID' })
  @IsString()
  templateId: string;

  @ApiPropertyOptional({ description: 'Ek değişkenler (key-value pairs)' })
  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Oluşturulacak PDF dosya adı (uzantısız veya .pdf ile)',
  })
  @IsString()
  @IsOptional()
  fileName?: string;
}
