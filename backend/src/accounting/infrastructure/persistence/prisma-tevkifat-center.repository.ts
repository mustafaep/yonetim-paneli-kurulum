/**
 * Prisma TevkifatCenter Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TevkifatCenterRepository } from '../../domain/repositories/tevkifat-center.repository.interface';
import { TevkifatCenter } from '../../domain/entities/tevkifat-center.entity';

@Injectable()
export class PrismaTevkifatCenterRepository implements TevkifatCenterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TevkifatCenter | null> {
    const data = await this.prisma.tevkifatCenter.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }

    return TevkifatCenter.fromPrisma(data);
  }

  async findByName(name: string): Promise<TevkifatCenter | null> {
    const data = await this.prisma.tevkifatCenter.findUnique({
      where: { name },
    });

    if (!data) {
      return null;
    }

    return TevkifatCenter.fromPrisma(data);
  }

  async findAll(filters?: {
    provinceId?: string;
    districtId?: string;
  }): Promise<TevkifatCenter[]> {
    const where: any = {};

    if (filters?.districtId) {
      where.districtId = filters.districtId;
    } else if (filters?.provinceId) {
      where.OR = [
        { provinceId: filters.provinceId },
        { district: { provinceId: filters.provinceId } },
      ];
    }

    const data = await this.prisma.tevkifatCenter.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return data.map((item) => TevkifatCenter.fromPrisma(item));
  }

  async save(center: TevkifatCenter): Promise<void> {
    const updateData = center.toPrismaUpdateData();

    await this.prisma.tevkifatCenter.update({
      where: { id: center.id },
      data: updateData,
    });
  }

  async create(center: TevkifatCenter): Promise<TevkifatCenter> {
    const createData = center.toPrismaCreateData();

    const created = await this.prisma.tevkifatCenter.create({
      data: createData,
    });

    return TevkifatCenter.fromPrisma(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tevkifatCenter.delete({
      where: { id },
    });
  }
}
