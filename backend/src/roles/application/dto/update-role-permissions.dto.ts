import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { Permission } from '../../../auth/permission.enum';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Rol izinleri',
    example: [Permission.MEMBER_LIST, Permission.MEMBER_VIEW],
    enum: Permission,
    isArray: true,
  })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
