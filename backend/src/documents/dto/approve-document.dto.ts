import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveDocumentDto {
  @ApiProperty({
    description: 'Admin notu (opsiyonel)',
    example: 'Doküman uygun görülmüştür.',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
