/**
 * Member Group Domain Exceptions
 */
export class MemberGroupNotFoundException extends Error {
  constructor(public readonly memberGroupId?: string) {
    super(`Member group not found${memberGroupId ? `: ${memberGroupId}` : ''}`);
    this.name = 'MemberGroupNotFoundException';
  }
}

export class MemberGroupNameAlreadyExistsException extends Error {
  constructor(public readonly name: string) {
    super(`Member group with name ${name} already exists`);
    this.name = 'MemberGroupNameAlreadyExistsException';
  }
}

export class MemberGroupInUseException extends Error {
  constructor(public readonly memberCount: number) {
    super(
      `Member group is used by ${memberCount} member(s). Cannot be deleted.`,
    );
    this.name = 'MemberGroupInUseException';
  }
}

export class MemberGroupAlreadyAtTopException extends Error {
  constructor() {
    super('Member group is already at the top');
    this.name = 'MemberGroupAlreadyAtTopException';
  }
}

export class MemberGroupAlreadyAtBottomException extends Error {
  constructor() {
    super('Member group is already at the bottom');
    this.name = 'MemberGroupAlreadyAtBottomException';
  }
}
