/**
 * Province Domain Entity
 *
 * Encapsulates Province business logic and state.
 */
export interface CreateProvinceData {
  name: string;
  code?: string;
}

export class Province {
  private _id: string;
  private _name: string;
  private _code?: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(data: CreateProvinceData, id: string = ''): Province {
    const province = new Province();
    province._id = id;
    province._name = data.name.trim();
    province._code = data.code?.trim();
    province._createdAt = new Date();
    province._updatedAt = new Date();
    return province;
  }

  static fromPersistence(data: any): Province {
    const province = new Province();
    province._id = data.id;
    province._name = data.name;
    province._code = data.code;
    province._createdAt = new Date(data.createdAt);
    province._updatedAt = new Date(data.updatedAt);
    return province;
  }

  update(data: CreateProvinceData): void {
    this._name = data.name.trim();
    this._code = data.code?.trim();
    this._updatedAt = new Date();
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get code(): string | undefined {
    return this._code;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
