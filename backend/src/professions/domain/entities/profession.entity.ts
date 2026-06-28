/**
 * Profession Domain Entity
 */
export interface CreateProfessionData {
  name: string;
}

export interface UpdateProfessionData {
  name?: string;
  isActive?: boolean;
}

export class Profession {
  private _id: string;
  private _name: string;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(data: CreateProfessionData, id: string = ''): Profession {
    const profession = new Profession();
    profession._id = id;
    profession._name = data.name.trim();
    profession._isActive = true;
    profession._createdAt = new Date();
    profession._updatedAt = new Date();
    return profession;
  }

  static fromPersistence(data: any): Profession {
    const profession = new Profession();
    profession._id = data.id;
    profession._name = data.name;
    profession._isActive = data.isActive ?? true;
    profession._createdAt = new Date(data.createdAt);
    profession._updatedAt = new Date(data.updatedAt);
    return profession;
  }

  update(data: UpdateProfessionData): void {
    if (data.name !== undefined) {
      this._name = data.name.trim();
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

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  get id(): string {
    return this._id;
  }

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
}
