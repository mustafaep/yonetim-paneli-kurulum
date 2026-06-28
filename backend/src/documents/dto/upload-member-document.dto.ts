import { ApiProperty } from '@nestjs/swagger';

export class UploadMemberDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'PDF dosyası' })
  file: Express.Multer.File;

  @ApiProperty({ description: 'Doküman tipi' })
  documentType: string;

  @ApiProperty({ description: 'Açıklama (opsiyonel)', required: false })
  description?: string;

  @ApiProperty({
    description: 'Özel dosya adı (opsiyonel, uzantı otomatik eklenir)',
    required: false,
  })
  fileName?: string;
}
