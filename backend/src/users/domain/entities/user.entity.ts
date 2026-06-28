/**
 * User Domain Entity
 *
 * Encapsulates User business logic and state.
 */
import { Email } from '../value-objects/email.vo';
import {
  UserEmailAlreadyExistsException,
  UserMemberRequiredException,
} from '../exceptions/user-domain.exception';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  memberId?: string;
  customRoleIds?: string[];
  scopes?: Array<{ provinceId?: string; districtId?: string }>;
}

export interface UpdateUserRolesData {
  customRoleIds: string[];
}

export class User {
  private _id: string;
  private _email: Email;
  private _passwordHash: string;
  private _firstName: string;
  private _lastName: string;
  private _isActive: boolean;
  private _memberId?: string;
  private _customRoleIds: string[];
  private _scopes: Array<{ provinceId?: string; districtId?: string }>;
  private _deletedAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(data: CreateUserData, id: string = ''): User {
    const user = new User();
    user._id = id;
    user._email = Email.create(data.email);
    user._passwordHash = data.passwordHash;
    user._firstName = data.firstName.trim();
    user._lastName = data.lastName.trim();
    user._isActive = true;
    user._memberId = data.memberId;
    user._customRoleIds = data.customRoleIds || [];
    user._scopes = data.scopes || [];
    user._createdAt = new Date();
    user._updatedAt = new Date();
    return user;
  }

  static fromPersistence(data: any): User {
    const user = new User();
    user._id = data.id;
    user._email = Email.create(data.email);
    user._passwordHash = data.passwordHash;
    user._firstName = data.firstName;
    user._lastName = data.lastName;
    user._isActive = data.isActive ?? true;
    user._memberId = data.memberId || data.member?.id;
    user._customRoleIds = data.customRoles?.map((r: any) => r.id) || [];
    user._scopes =
      data.scopes?.map((s: any) => ({
        provinceId: s.provinceId,
        districtId: s.districtId,
      })) || [];
    user._deletedAt = data.deletedAt ? new Date(data.deletedAt) : undefined;
    user._createdAt = new Date(data.createdAt);
    user._updatedAt = new Date(data.updatedAt);
    return user;
  }

  updateRoles(data: UpdateUserRolesData): void {
    this._customRoleIds = data.customRoleIds;
    this._updatedAt = new Date();
  }

  linkToMember(memberId: string): void {
    if (this._memberId) {
      throw new Error('User is already linked to a member');
    }
    this._memberId = memberId;
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

  softDelete(): void {
    this._deletedAt = new Date();
    this._isActive = false;
    this._updatedAt = new Date();
  }

  validateMemberRequirement(hasAdminRole: boolean): void {
    if (!hasAdminRole && !this._memberId) {
      throw new UserMemberRequiredException();
    }
  }

  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email.value;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get memberId(): string | undefined {
    return this._memberId;
  }

  get customRoleIds(): string[] {
    return [...this._customRoleIds];
  }

  get scopes(): Array<{ provinceId?: string; districtId?: string }> {
    return [...this._scopes];
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
}
