import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { MemberStatus } from '@prisma/client';

export class CancelMemberDto {
  @ApiProperty({
    description: 'Üyeliğin iptal edilme nedeni',
    example: 'İstifa talebi',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  cancellationReason: string;

  @ApiProperty({
    description: 'Yeni üye durumu',
    example: 'RESIGNED',
    enum: ['RESIGNED', 'EXPELLED', 'INACTIVE'],
    required: false,
  })
  @IsEnum(MemberStatus)
  @IsNotEmpty()
  status: 'RESIGNED' | 'EXPELLED' | 'INACTIVE';
}
