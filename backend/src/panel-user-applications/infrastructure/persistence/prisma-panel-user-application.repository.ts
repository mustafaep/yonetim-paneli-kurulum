/**
 * Prisma PanelUserApplication Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PanelUserApplicationRepository } from '../../domain/repositories/panel-user-application.repository.interface';
import {
  PanelUserApplication,
  PanelUserApplicationStatus,
} from '../../domain/entities/panel-user-application.entity';

@Injectable()
export class PrismaPanelUserApplicationRepository implements PanelUserApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PanelUserApplication | null> {
    const data = await this.prisma.panelUserApplication.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }

    return PanelUserApplication.fromPrisma(data);
  }

  async findByMemberId(memberId: string): Promise<PanelUserApplication | null> {
    const data = await this.prisma.panelUserApplication.findUnique({
      where: { memberId },
    });

    if (!data) {
      return null;
    }

    return PanelUserApplication.fromPrisma(data);
  }

  async findAll(
    status?: PanelUserApplicationStatus,
  ): Promise<PanelUserApplication[]> {
    const where = status ? { status: status as any } : undefined;

    const data = await this.prisma.panelUserApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return data.map((item) => PanelUserApplication.fromPrisma(item));
  }

  async save(application: PanelUserApplication): Promise<void> {
    const updateData = application.toPrismaUpdateData();

    await this.prisma.panelUserApplication.update({
      where: { id: application.id },
      data: updateData,
    });
  }

  async create(
    application: PanelUserApplication,
  ): Promise<PanelUserApplication> {
    const createData = application.toPrismaCreateData();

    const created = await this.prisma.panelUserApplication.create({
      data: createData,
    });

    return PanelUserApplication.fromPrisma(created);
  }
}
