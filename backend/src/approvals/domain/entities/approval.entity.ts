/**
 * Approval Domain Entity
 *
 * Domain rules:
 * - Can only approve/reject pending approvals
 * - Entity update happens on approval
 */
import { ApprovalStatus, ApprovalEntityType } from '@prisma/client';

export class Approval {
  public readonly id: string;
  private _entityType: ApprovalEntityType;
  private _entityId: string;
  private _requestedBy: string;
  private _requestData: any;
  private _status: ApprovalStatus;
  private _approvedBy: string | null;
  private _approvalNote: string | null;
  private _approvedAt: Date | null;
  private _rejectedBy: string | null;
  private _rejectionNote: string | null;
  private _rejectedAt: Date | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(data: {
    id: string;
    entityType: ApprovalEntityType;
    entityId: string;
    requestedBy: string;
    requestData: any;
    status: ApprovalStatus;
    approvedBy: string | null;
    approvalNote: string | null;
    approvedAt: Date | null;
    rejectedBy: string | null;
    rejectionNote: string | null;
    rejectedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this._entityType = data.entityType;
    this._entityId = data.entityId;
    this._requestedBy = data.requestedBy;
    this._requestData = data.requestData;
    this._status = data.status;
    this._approvedBy = data.approvedBy;
    this._approvalNote = data.approvalNote;
    this._approvedAt = data.approvedAt;
    this._rejectedBy = data.rejectedBy;
    this._rejectionNote = data.rejectionNote;
    this._rejectedAt = data.rejectedAt;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  static create(data: {
    entityType: ApprovalEntityType;
    entityId: string;
    requestedBy: string;
    requestData: any;
  }): Approval {
    return new Approval({
      id: '', // Will be set by repository
      entityType: data.entityType,
      entityId: data.entityId,
      requestedBy: data.requestedBy,
      requestData: data.requestData,
      status: ApprovalStatus.PENDING,
      approvedBy: null,
      approvalNote: null,
      approvedAt: null,
      rejectedBy: null,
      rejectionNote: null,
      rejectedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPrisma(data: any): Approval {
    return new Approval({
      id: data.id,
      entityType: data.entityType,
      entityId: data.entityId,
      requestedBy: data.requestedBy,
      requestData: data.requestData,
      status: data.status,
      approvedBy: data.approvedBy,
      approvalNote: data.approvalNote,
      approvedAt: data.approvedAt,
      rejectedBy: data.rejectedBy,
      rejectionNote: data.rejectionNote,
      rejectedAt: data.rejectedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  approve(approvedBy: string, approvalNote?: string): void {
    if (this._status !== ApprovalStatus.PENDING) {
      throw new Error('Sadece bekleyen onaylar onaylanabilir');
    }

    this._status = ApprovalStatus.APPROVED;
    this._approvedBy = approvedBy;
    this._approvalNote = approvalNote || null;
    this._approvedAt = new Date();
    this._updatedAt = new Date();
  }

  reject(rejectedBy: string, rejectionNote?: string): void {
    if (this._status !== ApprovalStatus.PENDING) {
      throw new Error('Sadece bekleyen onaylar reddedilebilir');
    }

    this._status = ApprovalStatus.REJECTED;
    this._rejectedBy = rejectedBy;
    this._rejectionNote = rejectionNote || null;
    this._rejectedAt = new Date();
    this._updatedAt = new Date();
  }

  // Getters
  get entityType(): ApprovalEntityType {
    return this._entityType;
  }

  get entityId(): string {
    return this._entityId;
  }

  get requestedBy(): string {
    return this._requestedBy;
  }

  get requestData(): any {
    return this._requestData;
  }

  get status(): ApprovalStatus {
    return this._status;
  }

  get approvedBy(): string | null {
    return this._approvedBy;
  }

  get approvalNote(): string | null {
    return this._approvalNote;
  }

  get approvedAt(): Date | null {
    return this._approvedAt;
  }

  get rejectedBy(): string | null {
    return this._rejectedBy;
  }

  get rejectionNote(): string | null {
    return this._rejectionNote;
  }

  get rejectedAt(): Date | null {
    return this._rejectedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  toPrismaCreateData(): any {
    return {
      entityType: this._entityType,
      entityId: this._entityId,
      requestedBy: this._requestedBy,
      requestData: this._requestData,
      status: this._status,
    };
  }

  toPrismaUpdateData(): any {
    return {
      status: this._status,
      approvedBy: this._approvedBy,
      approvalNote: this._approvalNote,
      approvedAt: this._approvedAt,
      rejectedBy: this._rejectedBy,
      rejectionNote: this._rejectionNote,
      rejectedAt: this._rejectedAt,
      updatedAt: this._updatedAt,
    };
  }
}
