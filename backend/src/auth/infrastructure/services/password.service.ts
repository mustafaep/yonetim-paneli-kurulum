/**
 * PasswordService – Şifre hash, doğrulama ve politika kontrolü.
 * Auth (compare), user oluşturma/güncelleme (hash) ve politika (validatePolicy) tek yerden yönetilir.
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '../../../config/config.service';

const SALT_ROUNDS = 10;

@Injectable()
export class PasswordService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Şifrenin sistem güvenlik politikasına uygunluğunu kontrol eder.
   * Uyumsuzluk varsa BadRequestException fırlatır.
   */
  validatePolicy(password: string): void {
    const minLength = this.configService.getSystemSettingNumber(
      'SECURITY_PASSWORD_MIN_LENGTH',
      8,
    );
    if (password.length < minLength) {
      throw new BadRequestException(
        `Şifre en az ${minLength} karakter olmalıdır.`,
      );
    }

    const requireUppercase = this.configService.getSystemSettingBoolean(
      'SECURITY_PASSWORD_REQUIRE_UPPERCASE',
      true,
    );
    if (requireUppercase && !/[A-Z]/.test(password)) {
      throw new BadRequestException(
        'Şifre en az bir büyük harf içermelidir.',
      );
    }

    const requireLowercase = this.configService.getSystemSettingBoolean(
      'SECURITY_PASSWORD_REQUIRE_LOWERCASE',
      true,
    );
    if (requireLowercase && !/[a-z]/.test(password)) {
      throw new BadRequestException(
        'Şifre en az bir küçük harf içermelidir.',
      );
    }

    const requireNumber = this.configService.getSystemSettingBoolean(
      'SECURITY_PASSWORD_REQUIRE_NUMBER',
      true,
    );
    if (requireNumber && !/[0-9]/.test(password)) {
      throw new BadRequestException(
        'Şifre en az bir rakam içermelidir.',
      );
    }

    const requireSpecial = this.configService.getSystemSettingBoolean(
      'SECURITY_PASSWORD_REQUIRE_SPECIAL',
      false,
    );
    if (requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException(
        'Şifre en az bir özel karakter içermelidir (örn. !@#$%^&*).',
      );
    }
  }

  /**
   * Düz metin şifreyi politika kontrolünden geçirip hash'ler.
   */
  async hashWithPolicy(plainPassword: string): Promise<string> {
    this.validatePolicy(plainPassword);
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  /**
   * Düz metin şifreyi hash'ler (politika kontrolü olmadan – yalnızca sistem içi kullanım için).
   */
  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  /**
   * Düz metin şifre ile hash'i karşılaştırır (login'de kullanılır).
   */
  async compare(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
