import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Kullanıcı e-posta adresi',
    example: 'admin@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @IsNotEmpty({ message: 'E-posta adresi gereklidir' })
  email: string;

  @ApiProperty({
    description: 'Kullanıcı şifresi',
    example: 'password123',
    type: String,
    format: 'password',
  })
  @IsString({ message: 'Şifre bir string olmalıdır' })
  @IsNotEmpty({ message: 'Şifre gereklidir' })
  password: string;
}
