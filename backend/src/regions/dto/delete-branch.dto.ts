import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum MemberActionOnBranchDelete {
  /** Üyeleri başka bir şubeye taşı (sadece şube değişir) */
  TRANSFER_TO_BRANCH = 'TRANSFER_TO_BRANCH',
  /** Üyeleri başka bir şubeye taşı ve pasif et (status = INACTIVE) */
  TRANSFER_AND_DEACTIVATE = 'TRANSFER_AND_DEACTIVATE',
  /** Üyeleri başka bir şubeye taşı ve iptal et (status = RESIGNED) */
  TRANSFER_AND_CANCEL = 'TRANSFER_AND_CANCEL',
  /** Üyeleri başka bir şubeye taşı, pasif et ve iptal et (status = RESIGNED, isActive = false) */
  TRANSFER_DEACTIVATE_AND_CANCEL = 'TRANSFER_DEACTIVATE_AND_CANCEL',
}

export class DeleteBranchDto {
  @ApiProperty({
    description:
      'Şube silinirken üyelere ne yapılacak (tüm seçenekler üyeleri başka bir şubeye taşır)',
    enum: MemberActionOnBranchDelete,
    example: MemberActionOnBranchDelete.TRANSFER_TO_BRANCH,
    default: MemberActionOnBranchDelete.TRANSFER_TO_BRANCH,
  })
  @IsEnum(MemberActionOnBranchDelete)
  memberActionType: MemberActionOnBranchDelete;

  @ApiProperty({
    description: 'Üyelerin taşınacağı şube ID (zorunlu)',
    example: 'branch-uuid-123',
  })
  @IsString()
  targetBranchId: string;
}
