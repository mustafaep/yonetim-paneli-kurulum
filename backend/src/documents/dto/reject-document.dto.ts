import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectDocumentDto {
  @ApiProperty({
    description: 'Red nedeni (zorunlu)',
    example: 'Doküman eksik veya hatalı bilgiler içermektedir.',
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  rejectionReason: string;
}
