/**
 * Email Value Object
 *
 * Encapsulates email validation logic.
 */
export class Email {
  private constructor(private readonly _value: string) {
    if (!this.isValid(_value)) {
      throw new Error('Invalid email format');
    }
  }

  static create(value: string): Email {
    return new Email(value.trim().toLowerCase());
  }

  get value(): string {
    return this._value;
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }
}
