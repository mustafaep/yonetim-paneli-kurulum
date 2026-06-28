/**
 * Role Domain Entity
 *
 * Encapsulates Role business logic and state.
 */
import { RoleName } from '../value-objects/role-name.vo';
import { Permission } from '../../../auth/permission.enum';
import {
  AdminRoleCannotBeModifiedException,
  AdminRoleCannotBeDeletedException,
  RoleHasAssignedUsersException,
} from '../exceptions/role-domain.exception';

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: Permission[];
  hasScopeRestriction?: boolean;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  isActive?: boolean;
  hasScopeRestriction?: boolean;
}

export interface UpdateRolePermissionsData {
  permissions: Permission[];
}

export class Role {
  private _id: string;
  private _name: RoleName;
  private _description?: string;
  private _permissions: Permission[];
  private _isActive: boolean;
  private _hasScopeRestriction: boolean;
  private _deletedAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(data: CreateRoleData, id: string = ''): Role {
    const role = new Role();
    role._id = id;
    role._name = RoleName.create(data.name);
    role._description = data.description?.trim();
    role._permissions = [...data.permissions];
    role._isActive = true;
    role._hasScopeRestriction = data.hasScopeRestriction ?? false;
    role._createdAt = new Date();
    role._updatedAt = new Date();
    return role;
  }

  static fromPersistence(data: any): Role {
    const role = new Role();
    role._id = data.id;
    role._name =
      data.name === 'ADMIN' ? RoleName.admin() : RoleName.create(data.name);
    role._description = data.description;
    role._permissions = data.permissions?.map((p: any) => p.permission) || [];
    role._isActive = data.isActive ?? true;
    role._hasScopeRestriction = data.hasScopeRestriction ?? false;
    role._deletedAt = data.deletedAt ? new Date(data.deletedAt) : undefined;
    role._createdAt = new Date(data.createdAt);
    role._updatedAt = new Date(data.updatedAt);
    return role;
  }

  update(data: UpdateRoleData): void {
    if (this._name.isAdmin()) {
      throw new AdminRoleCannotBeModifiedException();
    }

    if (data.name !== undefined && data.name !== this._name.value) {
      this._name = RoleName.create(data.name);
    }

    if (data.description !== undefined) {
      this._description = data.description.trim() || undefined;
    }

    if (data.isActive !== undefined) {
      this._isActive = data.isActive;
    }

    if (data.hasScopeRestriction !== undefined) {
      this._hasScopeRestriction = data.hasScopeRestriction;
    }

    this._updatedAt = new Date();
  }

  updatePermissions(data: UpdateRolePermissionsData): void {
    if (this._name.isAdmin()) {
      throw new AdminRoleCannotBeModifiedException();
    }

    this._permissions = [...data.permissions];
    this._updatedAt = new Date();
  }

  delete(userCount: number = 0): void {
    if (this._name.isAdmin()) {
      throw new AdminRoleCannotBeDeletedException();
    }

    if (userCount > 0) {
      throw new RoleHasAssignedUsersException(userCount);
    }

    this._deletedAt = new Date();
    this._isActive = false;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    if (this._name.isAdmin()) {
      throw new AdminRoleCannotBeModifiedException();
    }
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
    return this._name.value;
  }

  get description(): string | undefined {
    return this._description;
  }

  get permissions(): Permission[] {
    return [...this._permissions];
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get hasScopeRestriction(): boolean {
    return this._hasScopeRestriction;
  }

  get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isAdmin(): boolean {
    return this._name.isAdmin();
  }
}
