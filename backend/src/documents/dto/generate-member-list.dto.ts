import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateMemberListDocumentDto {
  @ApiProperty({ description: 'Üye ID listesi', type: [String] })
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];

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
