import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteMemberDto {
  @ApiProperty({
    description: 'Üyeye ait Kesinti kayıtlarını da sil (true) veya koru (false)',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  deletePayments?: boolean;

  @ApiProperty({
    description:
      'Üyeye ait döküman kayıtlarını da sil (true) veya koru (false)',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  deleteDocuments?: boolean;
}
