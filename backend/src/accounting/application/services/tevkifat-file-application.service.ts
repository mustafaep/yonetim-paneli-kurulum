/**
 * TevkifatFile Application Service
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { TevkifatFileRepository } from '../../domain/repositories/tevkifat-file.repository.interface';
import { TevkifatFile } from '../../domain/entities/tevkifat-file.entity';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class TevkifatFileApplicationService {
  constructor(
    @Inject('TevkifatFileRepository')
    private readonly repository: TevkifatFileRepository,
  ) {}

  async uploadFile(data: {
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
  }): Promise<TevkifatFile> {
    // Check for duplicate
    const duplicate = await this.repository.findDuplicate({
      tevkifatCenterId: data.tevkifatCenterId,
      year: data.year,
      month: data.month,
      positionTitle: data.positionTitle,
    });

    if (duplicate) {
      throw new BadRequestException('Bu ay/yıl için zaten bir dosya yüklenmiş');
    }

    const file = TevkifatFile.create(data);
    return await this.repository.create(file);
  }

  async approveFile(id: string, approvedBy: string): Promise<TevkifatFile> {
    const file = await this.repository.findById(id);
    if (!file) {
      throw new NotFoundException('Tevkifat dosyası bulunamadı');
    }

    file.approve(approvedBy);
    await this.repository.save(file);
    return file;
  }

  async rejectFile(id: string): Promise<TevkifatFile> {
    const file = await this.repository.findById(id);
    if (!file) {
      throw new NotFoundException('Tevkifat dosyası bulunamadı');
    }

    file.reject();
    await this.repository.save(file);
    return file;
  }

  async listFiles(filters?: {
    year?: number;
    month?: number;
    tevkifatCenterId?: string;
    status?: ApprovalStatus;
  }): Promise<TevkifatFile[]> {
    return await this.repository.findAll(filters);
  }

  async getFileById(id: string): Promise<TevkifatFile> {
    const file = await this.repository.findById(id);
    if (!file) {
      throw new NotFoundException('Tevkifat dosyası bulunamadı');
    }
    return file;
  }
}
