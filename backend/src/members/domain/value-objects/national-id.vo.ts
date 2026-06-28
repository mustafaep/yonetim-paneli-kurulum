/**
 * NationalId Value Object
 *
 * Domain rule: TC Kimlik numarası validation
 */
export class NationalId {
  private constructor(private readonly value: string) {}

  static create(value: string): NationalId {
    if (!value || value.trim().length === 0) {
      throw new Error('TC Kimlik Numarası zorunludur');
    }

    const trimmed = value.trim();

    if (!/^\d{11}$/.test(trimmed)) {
      throw new Error('TC Kimlik Numarası 11 haneli ve sadece rakam olmalıdır');
    }

    return new NationalId(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: NationalId | null): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
