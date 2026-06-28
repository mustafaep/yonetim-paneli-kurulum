/**
 * Prisma District Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DistrictRepository } from '../../domain/repositories/region.repository.interface';
import { District } from '../../domain/entities/district.entity';

@Injectable()
export class PrismaDistrictRepository implements DistrictRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<District | null> {
    const data = await this.prisma.district.findUnique({
      where: { id },
    });
    return data ? District.fromPersistence(data) : null;
  }

  async findByProvinceId(provinceId: string): Promise<District[]> {
    const data = await this.prisma.district.findMany({
      where: { provinceId },
      orderBy: { name: 'asc' },
    });
    return data.map((item) => District.fromPersistence(item));
  }

  async findAll(): Promise<District[]> {
    const data = await this.prisma.district.findMany({
      orderBy: { name: 'asc' },
    });
    return data.map((item) => District.fromPersistence(item));
  }

  async save(district: District): Promise<void> {
    await this.prisma.district.update({
      where: { id: district.id },
      data: {
        name: district.name,
        provinceId: district.provinceId,
      },
    });
  }

  async create(district: District): Promise<District> {
    const createData: any = {
      name: district.name,
      provinceId: district.provinceId,
    };
    delete createData.id;

    const created = await this.prisma.district.create({
      data: createData,
    });

    return District.fromPersistence(created);
  }
}
