import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class ApproveMemberDto {
  @ApiProperty({
    description: 'Üye kayıt numarası',
    example: 'UYE-00001',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiProperty({
    description: 'Yönetim kurulu karar tarihi',
    example: '2025-01-15',
    type: String,
    format: 'date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  boardDecisionDate?: string;

  @ApiProperty({
    description: 'Yönetim kurulu karar defter no',
    example: '2025/01',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  boardDecisionBookNo?: string;

  @ApiProperty({
    description: 'Tevkifat merkezi ID',
    example: 'tevkifat-center-id-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  tevkifatCenterId?: string;

  @ApiProperty({
    description: 'Tevkifat ünvanı ID',
    example: 'tevkifat-title-id-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  tevkifatTitleId?: string;

  @ApiProperty({
    description: 'Şube ID',
    example: 'branch-id-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({
    description: 'Üye grubu ID',
    example: 'member-group-id-123',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  memberGroupId?: string;
}
