import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PublicMembershipLookupDto {
  @ApiProperty({
    description: 'TC Kimlik Numarası (11 hane)',
    example: '12345678901',
  })
  @IsString()
  nationalId: string;
}
