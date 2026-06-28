/**
 * Region Domain Exceptions
 *
 * Domain-specific exceptions for Region entities business rules.
 */
export class ProvinceNotFoundException extends Error {
  constructor(public readonly provinceId?: string) {
    super(`Province not found${provinceId ? `: ${provinceId}` : ''}`);
    this.name = 'ProvinceNotFoundException';
  }
}

export class DistrictNotFoundException extends Error {
  constructor(public readonly districtId?: string) {
    super(`District not found${districtId ? `: ${districtId}` : ''}`);
    this.name = 'DistrictNotFoundException';
  }
}

export class BranchNotFoundException extends Error {
  constructor(public readonly branchId?: string) {
    super(`Branch not found${branchId ? `: ${branchId}` : ''}`);
    this.name = 'BranchNotFoundException';
  }
}

export class InstitutionNotFoundException extends Error {
  constructor(public readonly institutionId?: string) {
    super(`Institution not found${institutionId ? `: ${institutionId}` : ''}`);
    this.name = 'InstitutionNotFoundException';
  }
}

export class UserScopeNotFoundException extends Error {
  constructor(public readonly scopeId?: string) {
    super(`User scope not found${scopeId ? `: ${scopeId}` : ''}`);
    this.name = 'UserScopeNotFoundException';
  }
}

export class DistrictProvinceMismatchException extends Error {
  constructor() {
    super('District does not belong to the specified province');
    this.name = 'DistrictProvinceMismatchException';
  }
}

export class DuplicateUserScopeException extends Error {
  constructor() {
    super('User already has this scope assigned');
    this.name = 'DuplicateUserScopeException';
  }
}

export class InvalidScopeException extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'InvalidScopeException';
  }
}

export class LastBranchCannotBeDeletedException extends Error {
  constructor() {
    super(
      'System must have at least one branch. Cannot delete the last branch.',
    );
    this.name = 'LastBranchCannotBeDeletedException';
  }
}
