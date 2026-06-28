/**
 * Member Group Domain Entity
 */
export interface CreateMemberGroupData {
  name: string;
  description?: string;
  order?: number;
}

export interface UpdateMemberGroupData {
  name?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export class MemberGroup {
  private _id: string;
  private _name: string;
  private _description?: string;
  private _order: number;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(data: CreateMemberGroupData, id: string = ''): MemberGroup {
    const memberGroup = new MemberGroup();
    memberGroup._id = id;
    memberGroup._name = data.name.trim();
    memberGroup._description = data.description?.trim();
    memberGroup._order = data.order ?? 0;
    memberGroup._isActive = true;
    memberGroup._createdAt = new Date();
    memberGroup._updatedAt = new Date();
    return memberGroup;
  }

  static fromPersistence(data: any): MemberGroup {
    const memberGroup = new MemberGroup();
    memberGroup._id = data.id;
    memberGroup._name = data.name;
    memberGroup._description = data.description;
    memberGroup._order = data.order ?? 0;
    memberGroup._isActive = data.isActive ?? true;
    memberGroup._createdAt = new Date(data.createdAt);
    memberGroup._updatedAt = new Date(data.updatedAt);
    return memberGroup;
  }

  update(data: UpdateMemberGroupData): void {
    if (data.name !== undefined) {
      this._name = data.name.trim();
    }
    if (data.description !== undefined) {
      this._description = data.description?.trim();
    }
    if (data.isActive !== undefined) {
      this._isActive = data.isActive;
    }
    if (data.order !== undefined) {
      this._order = data.order;
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

  changeOrder(newOrder: number): void {
    this._order = newOrder;
    this._updatedAt = new Date();
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get order(): number {
    return this._order;
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
