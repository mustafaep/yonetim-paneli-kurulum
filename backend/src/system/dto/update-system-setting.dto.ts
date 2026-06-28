import { PartialType } from '@nestjs/swagger';
import { CreateSystemSettingDto } from './create-system-setting.dto';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSystemSettingDto extends PartialType(
  CreateSystemSettingDto,
) {
  @ApiProperty({ description: 'Ayar değeri', required: false })
  @IsString()
  @IsOptional()
  value?: string;
}
