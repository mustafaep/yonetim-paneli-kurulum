import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MemberActionOnInstitutionDelete {
  /** Üyelerin kurum bilgisini kaldır (başka bir kuruma taşınır - sistemde kurum zorunlu olduğundan ilk bulunan kurum kullanılır) */
  REMOVE_INSTITUTION = 'REMOVE_INSTITUTION',
  /** Üyeleri başka bir kuruma taşı */
  TRANSFER_TO_INSTITUTION = 'TRANSFER_TO_INSTITUTION',
  /** Üyelerin kurum bilgisini kaldır ve pasif et */
  REMOVE_AND_DEACTIVATE = 'REMOVE_AND_DEACTIVATE',
  /** Üyeleri başka bir kuruma taşı ve pasif et */
  TRANSFER_AND_DEACTIVATE = 'TRANSFER_AND_DEACTIVATE',
  /** Üyeleri başka bir kuruma taşı ve iptal et */
  TRANSFER_AND_CANCEL = 'TRANSFER_AND_CANCEL',
}

export class DeleteInstitutionDto {
  @ApiProperty({
    description: 'Kurum silinirken üyelere ne yapılacak',
    enum: MemberActionOnInstitutionDelete,
    example: MemberActionOnInstitutionDelete.REMOVE_INSTITUTION,
    default: MemberActionOnInstitutionDelete.REMOVE_INSTITUTION,
  })
  @IsEnum(MemberActionOnInstitutionDelete)
  memberActionType: MemberActionOnInstitutionDelete;

  @ApiProperty({
    description:
      'TRANSFER_TO_INSTITUTION, TRANSFER_AND_DEACTIVATE veya TRANSFER_AND_CANCEL seçildiğinde üyelerin taşınacağı kurum ID',
    example: 'institution-uuid-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  targetInstitutionId?: string;
}
