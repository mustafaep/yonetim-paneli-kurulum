/**
 * PanelUserApplication Domain Entity
 */
export enum PanelUserApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class PanelUserApplication {
  public readonly id: string;
  private _memberId: string;
  private _requestedRoleId: string;
  private _requestNote: string | null;
  private _status: PanelUserApplicationStatus;
  private _reviewedBy: string | null;
  private _reviewedAt: Date | null;
  private _reviewNote: string | null;
  private _createdUserId: string | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(data: {
    id: string;
    memberId: string;
    requestedRoleId: string;
    requestNote: string | null;
    status: PanelUserApplicationStatus;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reviewNote: string | null;
    createdUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this._memberId = data.memberId;
    this._requestedRoleId = data.requestedRoleId;
    this._requestNote = data.requestNote;
    this._status = data.status;
    this._reviewedBy = data.reviewedBy;
    this._reviewedAt = data.reviewedAt;
    this._reviewNote = data.reviewNote;
    this._createdUserId = data.createdUserId;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  static create(data: {
    memberId: string;
    requestedRoleId: string;
    requestNote?: string | null;
  }): PanelUserApplication {
    return new PanelUserApplication({
      id: '',
      memberId: data.memberId,
      requestedRoleId: data.requestedRoleId,
      requestNote: data.requestNote || null,
      status: PanelUserApplicationStatus.PENDING,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPrisma(data: any): PanelUserApplication {
    return new PanelUserApplication({
      id: data.id,
      memberId: data.memberId,
      requestedRoleId: data.requestedRoleId,
      requestNote: data.requestNote,
      status: data.status as PanelUserApplicationStatus,
      reviewedBy: data.reviewedBy,
      reviewedAt: data.reviewedAt,
      reviewNote: data.reviewNote,
      createdUserId: data.createdUserId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  approve(
    reviewedBy: string,
    reviewNote?: string | null,
    createdUserId?: string | null,
  ): void {
    if (this._status !== PanelUserApplicationStatus.PENDING) {
      throw new Error('Sadece bekleyen başvurular onaylanabilir');
    }

    this._status = PanelUserApplicationStatus.APPROVED;
    this._reviewedBy = reviewedBy;
    this._reviewedAt = new Date();
    this._reviewNote = reviewNote || null;
    this._createdUserId = createdUserId || null;
    this._updatedAt = new Date();
  }

  reject(reviewedBy: string, reviewNote?: string | null): void {
    if (this._status !== PanelUserApplicationStatus.PENDING) {
      throw new Error('Sadece bekleyen başvurular reddedilebilir');
    }

    this._status = PanelUserApplicationStatus.REJECTED;
    this._reviewedBy = reviewedBy;
    this._reviewedAt = new Date();
    this._reviewNote = reviewNote || null;
    this._updatedAt = new Date();
  }

  // Getters
  get memberId(): string {
    return this._memberId;
  }

  get requestedRoleId(): string {
    return this._requestedRoleId;
  }

  get requestNote(): string | null {
    return this._requestNote;
  }

  get status(): PanelUserApplicationStatus {
    return this._status;
  }

  get reviewedBy(): string | null {
    return this._reviewedBy;
  }

  get reviewedAt(): Date | null {
    return this._reviewedAt;
  }

  get reviewNote(): string | null {
    return this._reviewNote;
  }

  get createdUserId(): string | null {
    return this._createdUserId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  toPrismaCreateData(): any {
    return {
      memberId: this._memberId,
      requestedRoleId: this._requestedRoleId,
      requestNote: this._requestNote,
      status: this._status,
    };
  }

  toPrismaUpdateData(): any {
    return {
      status: this._status,
      reviewedBy: this._reviewedBy,
      reviewedAt: this._reviewedAt,
      reviewNote: this._reviewNote,
      createdUserId: this._createdUserId,
      updatedAt: this._updatedAt,
    };
  }
}
