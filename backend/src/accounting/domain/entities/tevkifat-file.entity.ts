/**
 * TevkifatFile Domain Entity
 *
 * Domain rules:
 * - Cannot upload duplicate file for same center/month/year/positionTitle
 * - Can only approve/reject pending files
 */
import { ApprovalStatus } from '@prisma/client';

export class TevkifatFile {
  public readonly id: string;
  private _tevkifatCenterId: string;
  private _totalAmount: number;
  private _memberCount: number;
  private _month: number;
  private _year: number;
  private _positionTitle: string | null;
  private _fileName: string;
  private _fileUrl: string;
  private _fileSize: number | null;
  private _status: ApprovalStatus;
  private _uploadedBy: string;
  private _approvedBy: string | null;
  private _approvedAt: Date | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(data: {
    id: string;
    tevkifatCenterId: string;
    totalAmount: number;
    memberCount: number;
    month: number;
    year: number;
    positionTitle: string | null;
    fileName: string;
    fileUrl: string;
    fileSize: number | null;
    status: ApprovalStatus;
    uploadedBy: string;
    approvedBy: string | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this._tevkifatCenterId = data.tevkifatCenterId;
    this._totalAmount = data.totalAmount;
    this._memberCount = data.memberCount;
    this._month = data.month;
    this._year = data.year;
    this._positionTitle = data.positionTitle;
    this._fileName = data.fileName;
    this._fileUrl = data.fileUrl;
    this._fileSize = data.fileSize;
    this._status = data.status;
    this._uploadedBy = data.uploadedBy;
    this._approvedBy = data.approvedBy;
    this._approvedAt = data.approvedAt;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  static create(data: {
    tevkifatCenterId: string;
    totalAmount: number;
    memberCount: number;
    month: number;
    year: number;
    positionTitle?: string | null;
    fileName: string;
    fileUrl: string;
    fileSize?: number | null;
    uploadedBy: string;
  }): TevkifatFile {
    if (!data.tevkifatCenterId) {
      throw new Error('Tevkifat merkezi zorunludur');
    }

    if (data.month < 1 || data.month > 12) {
      throw new Error('Ay 1-12 arasında olmalıdır');
    }

    if (data.year < 2000 || data.year > 2100) {
      throw new Error('Geçerli bir yıl giriniz');
    }

    if (data.memberCount < 0) {
      throw new Error('Üye sayısı negatif olamaz');
    }

    if (data.totalAmount < 0) {
      throw new Error('Toplam tutar negatif olamaz');
    }

    return new TevkifatFile({
      id: '', // Will be set by repository
      tevkifatCenterId: data.tevkifatCenterId,
      totalAmount: data.totalAmount,
      memberCount: data.memberCount,
      month: data.month,
      year: data.year,
      positionTitle: data.positionTitle || null,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize || null,
      status: ApprovalStatus.PENDING,
      uploadedBy: data.uploadedBy,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPrisma(data: any): TevkifatFile {
    return new TevkifatFile({
      id: data.id,
      tevkifatCenterId: data.tevkifatCenterId,
      totalAmount: Number(data.totalAmount),
      memberCount: data.memberCount,
      month: data.month,
      year: data.year,
      positionTitle: data.positionTitle,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      status: data.status,
      uploadedBy: data.uploadedBy,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  approve(approvedBy: string): void {
    if (this._status !== ApprovalStatus.PENDING) {
      throw new Error('Sadece bekleyen dosyalar onaylanabilir');
    }

    this._status = ApprovalStatus.APPROVED;
    this._approvedBy = approvedBy;
    this._approvedAt = new Date();
    this._updatedAt = new Date();
  }

  reject(): void {
    if (this._status !== ApprovalStatus.PENDING) {
      throw new Error('Sadece bekleyen dosyalar reddedilebilir');
    }

    this._status = ApprovalStatus.REJECTED;
    this._updatedAt = new Date();
  }

  // Getters
  get tevkifatCenterId(): string {
    return this._tevkifatCenterId;
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get memberCount(): number {
    return this._memberCount;
  }

  get month(): number {
    return this._month;
  }

  get year(): number {
    return this._year;
  }

  get positionTitle(): string | null {
    return this._positionTitle;
  }

  get fileName(): string {
    return this._fileName;
  }

  get fileUrl(): string {
    return this._fileUrl;
  }

  get fileSize(): number | null {
    return this._fileSize;
  }

  get status(): ApprovalStatus {
    return this._status;
  }

  get uploadedBy(): string {
    return this._uploadedBy;
  }

  get approvedBy(): string | null {
    return this._approvedBy;
  }

  get approvedAt(): Date | null {
    return this._approvedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  toPrismaCreateData(): any {
    return {
      tevkifatCenterId: this._tevkifatCenterId,
      totalAmount: this._totalAmount,
      memberCount: this._memberCount,
      month: this._month,
      year: this._year,
      positionTitle: this._positionTitle,
      fileName: this._fileName,
      fileUrl: this._fileUrl,
      fileSize: this._fileSize,
      status: this._status,
      uploadedBy: this._uploadedBy,
    };
  }

  toPrismaUpdateData(): any {
    return {
      status: this._status,
      approvedBy: this._approvedBy,
      approvedAt: this._approvedAt,
      updatedAt: this._updatedAt,
    };
  }
}
