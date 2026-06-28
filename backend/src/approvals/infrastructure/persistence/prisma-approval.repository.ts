/**
 * Prisma Approval Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalRepository } from '../../domain/repositories/approval.repository.interface';
import { Approval } from '../../domain/entities/approval.entity';
import { ApprovalStatus, ApprovalEntityType } from '@prisma/client';

@Injectable()
export class PrismaApprovalRepository implements ApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Approval | null> {
    const data = await this.prisma.approval.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }

    return Approval.fromPrisma(data);
  }

  async findAll(filters?: {
    status?: ApprovalStatus;
    entityType?: ApprovalEntityType;
    requestedBy?: string;
  }): Promise<Approval[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.requestedBy) {
      where.requestedBy = filters.requestedBy;
    }

    const data = await this.prisma.approval.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return data.map((item) => Approval.fromPrisma(item));
  }

  async save(approval: Approval): Promise<void> {
    const updateData = approval.toPrismaUpdateData();

    await this.prisma.approval.update({
      where: { id: approval.id },
      data: updateData,
    });
  }

  async create(approval: Approval): Promise<Approval> {
    const createData = approval.toPrismaCreateData();

    const created = await this.prisma.approval.create({
      data: createData,
    });

    return Approval.fromPrisma(created);
  }
}
