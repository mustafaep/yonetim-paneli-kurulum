/**
 * Prisma TevkifatTitle Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TevkifatTitleRepository } from '../../domain/repositories/tevkifat-title.repository.interface';
import { TevkifatTitle } from '../../domain/entities/tevkifat-title.entity';

@Injectable()
export class PrismaTevkifatTitleRepository implements TevkifatTitleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TevkifatTitle | null> {
    const data = await this.prisma.tevkifatTitle.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }

    return TevkifatTitle.fromPrisma(data);
  }

  async findByName(name: string): Promise<TevkifatTitle | null> {
    const data = await this.prisma.tevkifatTitle.findUnique({
      where: { name },
    });

    if (!data) {
      return null;
    }

    return TevkifatTitle.fromPrisma(data);
  }

  async findAll(): Promise<TevkifatTitle[]> {
    const data = await this.prisma.tevkifatTitle.findMany({
      orderBy: { name: 'asc' },
    });

    return data.map((item) => TevkifatTitle.fromPrisma(item));
  }

  async save(title: TevkifatTitle): Promise<void> {
    const updateData = title.toPrismaUpdateData();

    await this.prisma.tevkifatTitle.update({
      where: { id: title.id },
      data: updateData,
    });
  }

  async create(title: TevkifatTitle): Promise<TevkifatTitle> {
    const createData = title.toPrismaCreateData();

    const created = await this.prisma.tevkifatTitle.create({
      data: createData,
    });

    return TevkifatTitle.fromPrisma(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tevkifatTitle.delete({
      where: { id },
    });
  }
}
