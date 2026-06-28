import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateProfessionDto {
  @ApiProperty({
    description: 'Meslek/Unvan adı',
    example: 'Öğretmen',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
