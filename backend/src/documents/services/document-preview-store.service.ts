import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RedisService } from '../../redis/redis.service';

export type DocumentPreviewMode = 'SINGLE' | 'LIST' | 'BULK';

export interface DocumentPreviewRecord {
  previewId: string;
  mode: DocumentPreviewMode;
  generatedBy: string;
  memberId?: string;
  memberIds?: string[];
  /** Toplu üye bazlı PDF: dosya adı öneki (her üye için _ad_soyad eklenir) */
  bulkFileNamePrefix?: string;
  templateId: string;
  variables?: Record<string, string>;
  fileName: string;
  filePath: string;
  createdAt: string;
  expiresAt: string;
}

@Injectable()
export class DocumentPreviewStoreService {
  private readonly logger = new Logger(DocumentPreviewStoreService.name);
  private readonly keyPrefix = 'document:preview:';
  private readonly metadataDir = path.join(
    process.cwd(),
    'uploads',
    'temp',
    'document-previews',
    'metadata',
  );
  private readonly fileDir = path.join(
    process.cwd(),
    'uploads',
    'temp',
    'document-previews',
    'files',
  );

  constructor(private readonly redisService: RedisService) {
    if (!fs.existsSync(this.metadataDir)) {
      fs.mkdirSync(this.metadataDir, { recursive: true });
    }
    if (!fs.existsSync(this.fileDir)) {
      fs.mkdirSync(this.fileDir, { recursive: true });
    }
  }

  getPreviewFilePath(fileName: string): string {
    return path.join(this.fileDir, fileName);
  }

  private getMetadataPath(previewId: string): string {
    return path.join(this.metadataDir, `${previewId}.json`);
  }

  async set(record: DocumentPreviewRecord, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(record);
    fs.writeFileSync(this.getMetadataPath(record.previewId), serialized, 'utf8');

    if (this.redisService.isConnected) {
      try {
        await this.redisService.set(
          `${this.keyPrefix}${record.previewId}`,
          serialized,
          ttlSeconds,
        );
      } catch (error) {
        this.logger.warn(
          `Redis preview write failed, disk fallback active: ${(error as Error).message}`,
        );
      }
    } else {
      this.logger.warn('Redis not connected, preview record stored on disk only');
    }
  }

  async get(previewId: string): Promise<DocumentPreviewRecord | null> {
    let raw: string | null = null;

    if (this.redisService.isConnected) {
      try {
        raw = await this.redisService.get(`${this.keyPrefix}${previewId}`);
      } catch {
        raw = null;
      }
    }

    if (!raw) {
      const metadataPath = this.getMetadataPath(previewId);
      if (fs.existsSync(metadataPath)) {
        raw = fs.readFileSync(metadataPath, 'utf8');
      }
    }

    if (!raw) {
      return null;
    }

    const record = JSON.parse(raw) as DocumentPreviewRecord;
    const now = Date.now();
    const expiresAt = new Date(record.expiresAt).getTime();
    if (Number.isFinite(expiresAt) && expiresAt <= now) {
      await this.delete(previewId, record.filePath);
      return null;
    }

    return record;
  }

  async delete(previewId: string, filePath?: string): Promise<void> {
    if (this.redisService.isConnected) {
      try {
        await this.redisService.del(`${this.keyPrefix}${previewId}`);
      } catch {
        // no-op
      }
    }

    const metadataPath = this.getMetadataPath(previewId);
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
