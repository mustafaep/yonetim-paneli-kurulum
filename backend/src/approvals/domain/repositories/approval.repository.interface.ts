/**
 * Approval Repository Interface (Port)
 */
import { Approval } from '../entities/approval.entity';
import { ApprovalStatus, ApprovalEntityType } from '@prisma/client';

export interface ApprovalRepository {
  findById(id: string): Promise<Approval | null>;
  findAll(filters?: {
    status?: ApprovalStatus;
    entityType?: ApprovalEntityType;
    requestedBy?: string;
  }): Promise<Approval[]>;
  save(approval: Approval): Promise<void>;
  create(approval: Approval): Promise<Approval>;
}
