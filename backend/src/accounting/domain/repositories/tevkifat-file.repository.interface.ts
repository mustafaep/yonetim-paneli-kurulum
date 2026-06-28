/**
 * TevkifatFile Repository Interface (Port)
 */
import { TevkifatFile } from '../entities/tevkifat-file.entity';
import { ApprovalStatus } from '@prisma/client';

export interface TevkifatFileRepository {
  findById(id: string): Promise<TevkifatFile | null>;
  findAll(filters?: {
    year?: number;
    month?: number;
    tevkifatCenterId?: string;
    status?: ApprovalStatus;
  }): Promise<TevkifatFile[]>;
  findDuplicate(data: {
    tevkifatCenterId: string;
    year: number;
    month: number;
    positionTitle?: string | null;
  }): Promise<TevkifatFile | null>;
  save(file: TevkifatFile): Promise<void>;
  create(file: TevkifatFile): Promise<TevkifatFile>;
}
