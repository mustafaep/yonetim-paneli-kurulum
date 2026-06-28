/**
 * Base Value Object
 *
 * Shared Domain: Tüm value object'ler için base class
 */
export abstract class BaseValueObject {
  /**
   * Equality check
   * Her value object kendi equality logic'ini implement etmeli
   */
  abstract equals(other: BaseValueObject): boolean;

  /**
   * String representation
   */
  abstract toString(): string;
}
