/**
 * TevkifatCenter Domain Entity
 *
 * Domain rules:
 * - Name must be unique
 * - Province and district must be valid (if provided)
 * - Cannot delete if has active members
 */
export class TevkifatCenter {
  public readonly id: string;
  private _name: string;
  private _isActive: boolean;
  private _provinceId: string | null;
  private _districtId: string | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(data: {
    id: string;
    name: string;
    isActive: boolean;
    provinceId: string | null;
    districtId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this._name = data.name;
    this._isActive = data.isActive;
    this._provinceId = data.provinceId;
    this._districtId = data.districtId;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  static create(data: {
    name: string;
    provinceId?: string | null;
    districtId?: string | null;
  }): TevkifatCenter {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Tevkifat merkezi adı zorunludur');
    }

    return new TevkifatCenter({
      id: '', // Will be set by repository
      name: data.name.trim(),
      isActive: true,
      provinceId: data.provinceId || null,
      districtId: data.districtId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPrisma(data: any): TevkifatCenter {
    return new TevkifatCenter({
      id: data.id,
      name: data.name,
      isActive: data.isActive,
      provinceId: data.provinceId,
      districtId: data.districtId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  update(data: {
    name?: string;
    provinceId?: string | null;
    districtId?: string | null;
    isActive?: boolean;
  }): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Tevkifat merkezi adı zorunludur');
      }
      this._name = data.name.trim();
    }

    if (data.provinceId !== undefined) {
      this._provinceId = data.provinceId;
    }

    if (data.districtId !== undefined) {
      this._districtId = data.districtId;
    }

    if (data.isActive !== undefined) {
      this._isActive = data.isActive;
    }

    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get provinceId(): string | null {
    return this._provinceId;
  }

  get districtId(): string | null {
    return this._districtId;
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
      provinceId: this._provinceId,
      districtId: this._districtId,
    };
  }

  toPrismaUpdateData(): any {
    return {
      name: this._name,
      isActive: this._isActive,
      provinceId: this._provinceId,
      districtId: this._districtId,
      updatedAt: this._updatedAt,
    };
  }
}
