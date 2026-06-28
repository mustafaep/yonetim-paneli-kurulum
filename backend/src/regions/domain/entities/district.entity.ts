/**
 * District Domain Entity
 *
 * Encapsulates District business logic and state.
 */
import { DistrictProvinceMismatchException } from '../exceptions/region-domain.exception';

export interface CreateDistrictData {
  name: string;
  provinceId: string;
}

export class District {
  private _id: string;
  private _name: string;
  private _provinceId: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(data: CreateDistrictData, id: string = ''): District {
    const district = new District();
    district._id = id;
    district._name = data.name.trim();
    district._provinceId = data.provinceId;
    district._createdAt = new Date();
    district._updatedAt = new Date();
    return district;
  }

  static fromPersistence(data: any): District {
    const district = new District();
    district._id = data.id;
    district._name = data.name;
    district._provinceId = data.provinceId;
    district._createdAt = new Date(data.createdAt);
    district._updatedAt = new Date(data.updatedAt);
    return district;
  }

  update(data: CreateDistrictData): void {
    this._name = data.name.trim();
    this._provinceId = data.provinceId;
    this._updatedAt = new Date();
  }

  validateProvinceRelation(provinceId: string): void {
    if (this._provinceId !== provinceId) {
      throw new DistrictProvinceMismatchException();
    }
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get provinceId(): string {
    return this._provinceId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
