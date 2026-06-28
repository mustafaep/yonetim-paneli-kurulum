/**
 * Content Repository Interface (Port)
 */
import { Content } from '../entities/content.entity';
import { ContentType, ContentStatus } from '@prisma/client';

export interface ContentRepository {
  findById(id: string): Promise<Content | null>;
  findAll(params?: {
    type?: ContentType;
    status?: ContentStatus;
  }): Promise<Content[]>;
  save(content: Content): Promise<void>;
  create(content: Content): Promise<Content>;
  delete(id: string): Promise<void>;
}
