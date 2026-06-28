/**
 * RegistrationNumber Value Object
 *
 * Domain rule: Üye kayıt numarası validation ve business rule'ları
 */
export class RegistrationNumber {
  private constructor(private readonly value: string) {}

  static create(value: string): RegistrationNumber {
    if (!value || value.trim().length === 0) {
      throw new Error('Üye Numarası zorunludur');
    }

    const trimmed = value.trim();

    // Business rule: Geçici numaralar (TEMP- ile başlayanlar) geçersiz
    if (trimmed.startsWith('TEMP-')) {
      throw new Error('Geçici üye numarası kullanılamaz');
    }

    return new RegistrationNumber(trimmed);
  }

  static fromNullable(
    value: string | null | undefined,
  ): RegistrationNumber | null {
    if (!value) {
      return null;
    }
    return RegistrationNumber.create(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: RegistrationNumber | null): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
