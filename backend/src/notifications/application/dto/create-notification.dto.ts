import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { NotificationType, NotificationTargetType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Bildirim başlığı', example: 'Yeni Duyuru' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Bildirim mesajı',
    example: 'Bu bir test bildirimidir.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Bildirim tipi',
    enum: NotificationType,
    example: NotificationType.EMAIL,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Hedef tip',
    enum: NotificationTargetType,
    example: NotificationTargetType.ALL_MEMBERS,
  })
  @IsEnum(NotificationTargetType)
  @IsNotEmpty()
  targetType: NotificationTargetType;

  @ApiProperty({ description: 'Hedef ID (opsiyonel)', required: false })
  @IsString()
  @IsOptional()
  targetId?: string;

  @ApiProperty({ description: 'Ek metadata', required: false, type: Object })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
