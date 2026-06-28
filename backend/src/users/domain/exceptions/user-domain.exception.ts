/**
 * User Domain Exceptions
 *
 * Domain-specific exceptions for User entity business rules.
 */
export class UserNotFoundException extends Error {
  constructor(public readonly userId?: string) {
    super(`User not found${userId ? `: ${userId}` : ''}`);
    this.name = 'UserNotFoundException';
  }
}

export class UserEmailAlreadyExistsException extends Error {
  constructor(public readonly email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserEmailAlreadyExistsException';
  }
}

export class UserMemberAlreadyLinkedException extends Error {
  constructor(public readonly memberId: string) {
    super(`Member ${memberId} is already linked to a user`);
    this.name = 'UserMemberAlreadyLinkedException';
  }
}

export class UserMemberRequiredException extends Error {
  constructor() {
    super('Non-admin users must be linked to a member');
    this.name = 'UserMemberRequiredException';
  }
}

export class UserScopeRequiredException extends Error {
  constructor(public readonly roleName: string) {
    super(`Role ${roleName} requires scope selection`);
    this.name = 'UserScopeRequiredException';
  }
}

export class UserInvalidScopeException extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'UserInvalidScopeException';
  }
}
