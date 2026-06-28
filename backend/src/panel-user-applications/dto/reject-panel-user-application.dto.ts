import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPanelUserApplicationDto {
  @ApiProperty({
    description: 'Red nedeni',
    example: 'Başvuru gereksinimleri karşılanmıyor',
  })
  @IsString()
  @IsNotEmpty()
  reviewNote: string;
}
