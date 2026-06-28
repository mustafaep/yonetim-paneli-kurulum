/**
 * Role Name Value Object
 *
 * Encapsulates role name validation logic.
 */
import { AdminRoleCannotBeCreatedException } from '../exceptions/role-domain.exception';

export class RoleName {
  private static readonly ADMIN_ROLE_NAME = 'ADMIN';

  private constructor(private readonly _value: string) {
    if (!this.isValid(_value)) {
      throw new Error('Invalid role name');
    }
  }

  static create(value: string): RoleName {
    const trimmed = value.trim();
    if (trimmed === this.ADMIN_ROLE_NAME) {
      throw new AdminRoleCannotBeCreatedException();
    }
    return new RoleName(trimmed);
  }

  static admin(): RoleName {
    return new RoleName(this.ADMIN_ROLE_NAME);
  }

  get value(): string {
    return this._value;
  }

  isAdmin(): boolean {
    return this._value === RoleName.ADMIN_ROLE_NAME;
  }

  private isValid(name: string): boolean {
    return name.length > 0 && name.length <= 100;
  }

  equals(other: RoleName): boolean {
    return this._value === other._value;
  }
}
