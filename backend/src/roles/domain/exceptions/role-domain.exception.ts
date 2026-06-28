/**
 * Role Domain Exceptions
 *
 * Domain-specific exceptions for Role entity business rules.
 */
export class RoleNotFoundException extends Error {
  constructor(public readonly roleId?: string) {
    super(`Role not found${roleId ? `: ${roleId}` : ''}`);
    this.name = 'RoleNotFoundException';
  }
}

export class RoleNameAlreadyExistsException extends Error {
  constructor(public readonly name: string) {
    super(`Role with name ${name} already exists`);
    this.name = 'RoleNameAlreadyExistsException';
  }
}

export class AdminRoleCannotBeCreatedException extends Error {
  constructor() {
    super('ADMIN role cannot be created. It is a system role.');
    this.name = 'AdminRoleCannotBeCreatedException';
  }
}

export class AdminRoleCannotBeModifiedException extends Error {
  constructor() {
    super('ADMIN role cannot be modified. It is a system role.');
    this.name = 'AdminRoleCannotBeModifiedException';
  }
}

export class AdminRoleCannotBeDeletedException extends Error {
  constructor() {
    super('ADMIN role cannot be deleted. It is a system role.');
    this.name = 'AdminRoleCannotBeDeletedException';
  }
}

export class RoleHasAssignedUsersException extends Error {
  constructor(public readonly userCount: number) {
    super(
      `Role has ${userCount} assigned user(s). Remove users before deleting.`,
    );
    this.name = 'RoleHasAssignedUsersException';
  }
}
