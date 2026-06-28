import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateTevkifatTitleDto {
  @ApiProperty({ description: 'Tevkifat unvanı adı', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Aktiflik durumu', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
