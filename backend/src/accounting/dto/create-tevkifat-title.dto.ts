import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTevkifatTitleDto {
  @ApiProperty({ description: 'Tevkifat unvanı adı', example: 'Müdür' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
