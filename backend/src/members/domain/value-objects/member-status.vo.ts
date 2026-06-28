/**
 * MemberStatus Value Object
 *
 * Domain rule: Member status transitions
 * - PENDING → APPROVED (via approve)
 * - APPROVED → ACTIVE (via activate)
 * - PENDING/APPROVED → REJECTED (via reject)
 *
 * Bu Value Object, status'un business rule'larını encapsulate eder.
 */
export enum MemberStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESIGNED = 'RESIGNED',
  EXPELLED = 'EXPELLED',
  REJECTED = 'REJECTED',
}

export class MemberStatus {
  private constructor(private readonly value: MemberStatusEnum) {}

  // Factory methods - Domain language kullanıyoruz
  static pending(): MemberStatus {
    return new MemberStatus(MemberStatusEnum.PENDING);
  }

  static approved(): MemberStatus {
    return new MemberStatus(MemberStatusEnum.APPROVED);
  }

  static active(): MemberStatus {
    return new MemberStatus(MemberStatusEnum.ACTIVE);
  }

  static rejected(): MemberStatus {
    return new MemberStatus(MemberStatusEnum.REJECTED);
  }

  static resigned(): MemberStatus {
    return new MemberStatus(MemberStatusEnum.RESIGNED);
  }

  static expelled(): MemberStatus {
    return new MemberStatus(MemberStatusEnum.EXPELLED);
  }

  static inactive(): MemberStatus {
    return new MemberStatus(MemberStatusEnum.INACTIVE);
  }

  static fromString(value: string): MemberStatus {
    const status = Object.values(MemberStatusEnum).find((s) => s === value);
    if (!status) {
      throw new Error(`Invalid member status: ${value}`);
    }
    return new MemberStatus(status);
  }

  // Business methods - Domain rule'ları burada
  isPending(): boolean {
    return this.value === MemberStatusEnum.PENDING;
  }

  isApproved(): boolean {
    return this.value === MemberStatusEnum.APPROVED;
  }

  isActive(): boolean {
    return this.value === MemberStatusEnum.ACTIVE;
  }

  isResigned(): boolean {
    return this.value === MemberStatusEnum.RESIGNED;
  }

  isExpelled(): boolean {
    return this.value === MemberStatusEnum.EXPELLED;
  }

  isInactive(): boolean {
    return this.value === MemberStatusEnum.INACTIVE;
  }

  canBeApproved(): boolean {
    // Business rule: Sadece PENDING approve edilebilir
    return this.isPending();
  }

  canBeActivated(): boolean {
    // Business rule: Sadece APPROVED activate edilebilir
    return this.isApproved();
  }

  canBeRejected(): boolean {
    // Business rule: PENDING veya APPROVED reject edilebilir
    return this.isPending() || this.isApproved();
  }

  canBeCancelled(): boolean {
    // Business rule: Sadece ACTIVE üyelerin üyeliği iptal edilebilir
    return this.isActive();
  }

  // Prisma enum'a dönüştürme (infrastructure için)
  toPrisma(): string {
    return this.value;
  }

  // Equality check
  equals(other: MemberStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
