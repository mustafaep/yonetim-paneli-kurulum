import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignUserScopeDto {
  @ApiProperty({
    description: 'Kullanıcı ID',
    example: 'user-uuid-123',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'İl ID (İl Başkanı için)',
    example: 'province-uuid-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiProperty({
    description: 'İlçe ID (İlçe Temsilcisi için)',
    example: 'district-uuid-456',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  districtId?: string;
}
