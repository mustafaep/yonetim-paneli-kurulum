import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDistrictDto {
  @ApiProperty({
    description: 'İlçe adı',
    example: 'Kadıköy',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Bağlı olduğu il ID',
    example: 'province-uuid-123',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  provinceId: string;
}
