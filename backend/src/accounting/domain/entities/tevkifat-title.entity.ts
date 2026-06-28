/**
 * TevkifatTitle Domain Entity
 *
 * Domain rules:
 * - Name must be unique
 */
export class TevkifatTitle {
  public readonly id: string;
  private _name: string;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(data: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this._name = data.name;
    this._isActive = data.isActive;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  static create(data: { name: string }): TevkifatTitle {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Tevkifat unvanı adı zorunludur');
    }

    return new TevkifatTitle({
      id: '', // Will be set by repository
      name: data.name.trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPrisma(data: any): TevkifatTitle {
    return new TevkifatTitle({
      id: data.id,
      name: data.name,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  update(data: { name?: string; isActive?: boolean }): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Tevkifat unvanı adı zorunludur');
      }
      this._name = data.name.trim();
    }

    if (data.isActive !== undefined) {
      this._isActive = data.isActive;
    }

    this._updatedAt = new Date();
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  toPrismaCreateData(): any {
    return {
      name: this._name,
      isActive: this._isActive,
    };
  }

  toPrismaUpdateData(): any {
    return {
      name: this._name,
      isActive: this._isActive,
      updatedAt: this._updatedAt,
    };
  }
}
