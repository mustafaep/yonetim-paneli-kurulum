import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MemberActionOnTevkifatCenterDelete {
  /** Üyelerin tevkifat merkezi bilgisini kaldır (tevkifatCenterId = null) */
  REMOVE_TEVKIFAT_CENTER = 'REMOVE_TEVKIFAT_CENTER',
  /** Üyeleri başka bir tevkifat merkezine taşı */
  TRANSFER_TO_TEVKIFAT_CENTER = 'TRANSFER_TO_TEVKIFAT_CENTER',
  /** Üyelerin tevkifat merkezi bilgisini kaldır ve pasif et */
  REMOVE_AND_DEACTIVATE = 'REMOVE_AND_DEACTIVATE',
  /** Üyeleri başka bir tevkifat merkezine taşı ve pasif et */
  TRANSFER_AND_DEACTIVATE = 'TRANSFER_AND_DEACTIVATE',
  /** Üyeleri başka bir tevkifat merkezine taşı ve iptal et */
  TRANSFER_AND_CANCEL = 'TRANSFER_AND_CANCEL',
}

export class DeleteTevkifatCenterDto {
  @ApiProperty({
    description: 'Tevkifat merkezi silinirken üyelere ne yapılacak',
    enum: MemberActionOnTevkifatCenterDelete,
    example: MemberActionOnTevkifatCenterDelete.REMOVE_TEVKIFAT_CENTER,
    default: MemberActionOnTevkifatCenterDelete.REMOVE_TEVKIFAT_CENTER,
  })
  @IsEnum(MemberActionOnTevkifatCenterDelete)
  memberActionType: MemberActionOnTevkifatCenterDelete;

  @ApiProperty({
    description:
      'TRANSFER_TO_TEVKIFAT_CENTER, TRANSFER_AND_DEACTIVATE veya TRANSFER_AND_CANCEL seçildiğinde üyelerin taşınacağı tevkifat merkezi ID',
    example: 'tevkifat-center-uuid-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  targetTevkifatCenterId?: string;
}
