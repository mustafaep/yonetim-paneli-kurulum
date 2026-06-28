/**
 * Base Entity
 *
 * Shared Domain: Tüm domain entity'ler için base class
 */
export abstract class BaseEntity {
  public readonly id: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(id: string, createdAt: Date, updatedAt: Date) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Equality check by ID
   */
  equals(other: BaseEntity): boolean {
    return this.id === other.id;
  }
}
