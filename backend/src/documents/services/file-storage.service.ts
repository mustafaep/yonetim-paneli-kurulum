import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfigService } from '../../config/config.service';

/**
 * File Upload Configuration (sabit değerler — dinamik limit için ConfigService kullanılır)
 */
export const FILE_UPLOAD_CONFIG = {
  defaultMaxFileSizeMB: 10,
  allowedMimeTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
  stagingDir: 'uploads/staging/documents',
  permanentDir: 'uploads/documents',
  stagingRetentionDays: 30,
};

/**
 * Secure File Storage Service
 * Handles file storage with staging and permanent storage separation
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(private readonly configService: ConfigService) {}

  private get maxFileSizeBytes(): number {
    const mb = this.configService.getSystemSettingNumber(
      'MAINTENANCE_MAX_UPLOAD_SIZE_MB',
      FILE_UPLOAD_CONFIG.defaultMaxFileSizeMB,
    );
    return mb * 1024 * 1024;
  }

  /**
   * Generate a secure filename using timestamp, UUID, and content hash
   * Format: {timestamp}-{uuid}-{contentHash}.{extension}
   */
  generateSecureFileName(originalName: string, fileBuffer: Buffer): string {
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const contentHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex')
      .substring(0, 32); // First 32 chars of hash

    // Extract and validate extension
    const ext = path.extname(originalName).toLowerCase() || '.pdf';
    const safeExt = FILE_UPLOAD_CONFIG.allowedExtensions.includes(ext)
      ? ext
      : '.pdf';

    return `${timestamp}-${uuid}-${contentHash}${safeExt}`;
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Dosya yüklenmedi');
    }

    // Check file size
    if (file.size > this.maxFileSizeBytes) {
      const maxMB = this.configService.getSystemSettingNumber(
        'MAINTENANCE_MAX_UPLOAD_SIZE_MB',
        FILE_UPLOAD_CONFIG.defaultMaxFileSizeMB,
      );
      throw new BadRequestException(
        `Dosya boyutu çok büyük. Maksimum: ${maxMB}MB`,
      );
    }

    // Check MIME type
    if (!FILE_UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Geçersiz dosya tipi. İzin verilen tipler: ${FILE_UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FILE_UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Geçersiz dosya uzantısı. İzin verilen uzantılar: ${FILE_UPLOAD_CONFIG.allowedExtensions.join(', ')}`,
      );
    }
  }

  /**
   * Ensure directory exists, create if not
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Get absolute path for staging directory
   */
  private getStagingDir(): string {
    const stagingPath = path.resolve(
      process.cwd(),
      FILE_UPLOAD_CONFIG.stagingDir,
    );
    this.ensureDirectoryExists(stagingPath);
    return stagingPath;
  }

  /**
   * Get absolute path for permanent directory
   */
  private getPermanentDir(): string {
    const permanentPath = path.resolve(
      process.cwd(),
      FILE_UPLOAD_CONFIG.permanentDir,
    );
    this.ensureDirectoryExists(permanentPath);
    return permanentPath;
  }

  /**
   * Save file to staging area
   * Returns the absolute path to the saved file
   */
  saveToStaging(fileBuffer: Buffer, secureFileName: string): string {
    const stagingDir = this.getStagingDir();
    const filePath = path.join(stagingDir, secureFileName);

    // Security check: ensure filePath is within stagingDir (prevent path traversal)
    const resolvedPath = path.resolve(filePath);
    const resolvedStagingDir = path.resolve(stagingDir);
    if (!resolvedPath.startsWith(resolvedStagingDir)) {
      throw new BadRequestException('Geçersiz dosya yolu');
    }

    // Write file
    fs.writeFileSync(filePath, fileBuffer);
    this.logger.log(`File saved to staging: ${filePath}`);

    return resolvedPath;
  }

  /**
   * Move file from staging to permanent storage
   * Returns the absolute path to the permanent file
   */
  moveToPermanent(stagingPath: string, secureFileName: string): string {
    // Validate staging path exists
    if (!fs.existsSync(stagingPath)) {
      throw new BadRequestException('Staging dosyası bulunamadı');
    }

    const permanentDir = this.getPermanentDir();
    const permanentPath = path.join(permanentDir, secureFileName);

    // Security check: ensure permanentPath is within permanentDir
    const resolvedPermanentPath = path.resolve(permanentPath);
    const resolvedPermanentDir = path.resolve(permanentDir);
    if (!resolvedPermanentPath.startsWith(resolvedPermanentDir)) {
      throw new BadRequestException('Geçersiz dosya yolu');
    }

    // Move file
    fs.renameSync(stagingPath, permanentPath);
    this.logger.log(`File moved to permanent: ${permanentPath}`);

    return resolvedPermanentPath;
  }

  /**
   * Delete file from staging
   */
  deleteFromStaging(stagingPath: string): void {
    if (!stagingPath) {
      return;
    }

    try {
      if (fs.existsSync(stagingPath)) {
        fs.unlinkSync(stagingPath);
        this.logger.log(`File deleted from staging: ${stagingPath}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting staging file: ${stagingPath}`, error);
      // Don't throw - file might already be deleted
    }
  }

  /**
   * Sil: dosya yolu mutlaka `process.cwd()/uploads/` altında olmalı (advances, payments, documents, …)
   */
  deleteFileUnderUploadsRoot(absolutePath: string): void {
    if (!absolutePath) {
      return;
    }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(absolutePath);
    if (!resolvedPath.startsWith(uploadsRoot)) {
      this.logger.warn(
        `Rejected delete outside uploads root: ${absolutePath}`,
      );
      return;
    }

    try {
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
        this.logger.log(`File deleted under uploads: ${resolvedPath}`);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting file under uploads: ${resolvedPath}`,
        error,
      );
    }
  }

  /**
   * Delete file from permanent storage (path must be within permanent dir)
   */
  deleteFromPermanent(permanentPath: string): void {
    if (!permanentPath) {
      return;
    }

    const permanentDir = this.getPermanentDir();
    const resolvedPath = path.resolve(permanentPath);
    const resolvedDir = path.resolve(permanentDir);
    if (!resolvedPath.startsWith(resolvedDir)) {
      this.logger.warn(
        `Rejected delete outside permanent dir: ${permanentPath}`,
      );
      return;
    }

    try {
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
        this.logger.log(`File deleted from permanent: ${resolvedPath}`);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting permanent file: ${resolvedPath}`,
        error,
      );
      // Don't throw - file might already be deleted
    }
  }

  /**
   * Get file URL for serving
   * Returns relative URL path
   */
  getFileUrl(filePath: string, isPermanent: boolean): string | null {
    if (!filePath) {
      return null;
    }

    const baseDir = isPermanent
      ? FILE_UPLOAD_CONFIG.permanentDir
      : FILE_UPLOAD_CONFIG.stagingDir;
    const fileName = path.basename(filePath);

    // Return relative URL (will be served by static assets)
    return `/${baseDir}/${fileName}`;
  }

  /**
   * Check if file exists
   */
  fileExists(filePath: string): boolean {
    if (!filePath) {
      return false;
    }
    return fs.existsSync(filePath);
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath: string): number {
    if (!filePath || !fs.existsSync(filePath)) {
      return 0;
    }
    const stats = fs.statSync(filePath);
    return stats.size;
  }
}
