/**
 * Prisma Province Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProvinceRepository } from '../../domain/repositories/region.repository.interface';
import { Province } from '../../domain/entities/province.entity';

@Injectable()
export class PrismaProvinceRepository implements ProvinceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Province | null> {
    const data = await this.prisma.province.findUnique({
      where: { id },
    });
    return data ? Province.fromPersistence(data) : null;
  }

  async findAll(): Promise<Province[]> {
    const data = await this.prisma.province.findMany({
      orderBy: { name: 'asc' },
    });
    return data.map((item) => Province.fromPersistence(item));
  }

  async save(province: Province): Promise<void> {
    await this.prisma.province.update({
      where: { id: province.id },
      data: {
        name: province.name,
        code: province.code,
      },
    });
  }

  async create(province: Province): Promise<Province> {
    const createData: any = {
      name: province.name,
      code: province.code,
    };
    delete createData.id;

    const created = await this.prisma.province.create({
      data: createData,
    });

    return Province.fromPersistence(created);
  }
}
