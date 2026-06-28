/**
 * Document Repository Interface (Port)
 */
import { DocumentTemplate } from '../entities/document-template.entity';
import { DocumentUploadStatus } from '@prisma/client';

export interface DocumentTemplateRepository {
  findById(id: string): Promise<DocumentTemplate | null>;
  findAll(includeInactive?: boolean): Promise<DocumentTemplate[]>;
  save(template: DocumentTemplate): Promise<void>;
  create(template: DocumentTemplate): Promise<DocumentTemplate>;
  delete(id: string): Promise<void>;
}

export interface MemberDocumentRepository {
  findByMemberId(memberId: string): Promise<any[]>;
  findByStatus(status: DocumentUploadStatus): Promise<any[]>;
  findPendingReview(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  save(document: any): Promise<void>;
  create(document: any): Promise<any>;
  updateFileName(id: string, fileName: string, fileUrl: string): Promise<void>;
}
