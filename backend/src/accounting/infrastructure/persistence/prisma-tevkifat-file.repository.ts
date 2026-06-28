/**
 * Prisma TevkifatFile Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TevkifatFileRepository } from '../../domain/repositories/tevkifat-file.repository.interface';
import { TevkifatFile } from '../../domain/entities/tevkifat-file.entity';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class PrismaTevkifatFileRepository implements TevkifatFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TevkifatFile | null> {
    const data = await this.prisma.tevkifatFile.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }

    return TevkifatFile.fromPrisma(data);
  }

  async findAll(filters?: {
    year?: number;
    month?: number;
    tevkifatCenterId?: string;
    status?: ApprovalStatus;
  }): Promise<TevkifatFile[]> {
    const where: any = {};

    if (filters?.year) {
      where.year = filters.year;
    }

    if (filters?.month) {
      where.month = filters.month;
    }

    if (filters?.tevkifatCenterId) {
      where.tevkifatCenterId = filters.tevkifatCenterId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const data = await this.prisma.tevkifatFile.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });

    return data.map((item) => TevkifatFile.fromPrisma(item));
  }

  async findDuplicate(data: {
    tevkifatCenterId: string;
    year: number;
    month: number;
    positionTitle?: string | null;
  }): Promise<TevkifatFile | null> {
    const existing = await this.prisma.tevkifatFile.findFirst({
      where: {
        tevkifatCenterId: data.tevkifatCenterId,
        year: data.year,
        month: data.month,
        positionTitle: (data.positionTitle as any) || null,
        status: {
          in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
        },
      },
    });

    if (!existing) {
      return null;
    }

    return TevkifatFile.fromPrisma(existing);
  }

  async save(file: TevkifatFile): Promise<void> {
    const updateData = file.toPrismaUpdateData();

    await this.prisma.tevkifatFile.update({
      where: { id: file.id },
      data: updateData,
    });
  }

  async create(file: TevkifatFile): Promise<TevkifatFile> {
    const createData = file.toPrismaCreateData();

    const created = await this.prisma.tevkifatFile.create({
      data: createData,
    });

    return TevkifatFile.fromPrisma(created);
  }
}
