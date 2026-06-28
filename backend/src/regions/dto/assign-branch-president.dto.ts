import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AssignBranchPresidentDto {
  @ApiProperty({ description: 'Başkan kullanıcı ID', example: 'user-uuid-123' })
  @IsString()
  @IsNotEmpty()
  presidentId: string;
}
