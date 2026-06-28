/**
 * Profession Domain Exceptions
 */
export class ProfessionNotFoundException extends Error {
  constructor(public readonly professionId?: string) {
    super(`Profession not found${professionId ? `: ${professionId}` : ''}`);
    this.name = 'ProfessionNotFoundException';
  }
}

export class ProfessionNameAlreadyExistsException extends Error {
  constructor(public readonly name: string) {
    super(`Profession with name ${name} already exists`);
    this.name = 'ProfessionNameAlreadyExistsException';
  }
}

export class ProfessionInUseException extends Error {
  constructor(public readonly memberCount: number) {
    super(`Profession is used by ${memberCount} member(s). Cannot be deleted.`);
    this.name = 'ProfessionInUseException';
  }
}
