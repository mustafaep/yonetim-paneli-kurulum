/**
 * Prisma Profession Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProfessionRepository } from '../../domain/repositories/profession.repository.interface';
import { Profession } from '../../domain/entities/profession.entity';

@Injectable()
export class PrismaProfessionRepository implements ProfessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Profession | null> {
    const data = await this.prisma.profession.findUnique({
      where: { id },
    });
    return data ? Profession.fromPersistence(data) : null;
  }

  async findByName(name: string): Promise<Profession | null> {
    const data = await this.prisma.profession.findUnique({
      where: { name },
    });
    return data ? Profession.fromPersistence(data) : null;
  }

  async findAll(includeInactive: boolean = false): Promise<Profession[]> {
    const where = includeInactive ? {} : { isActive: true };
    const data = await this.prisma.profession.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return data.map((item) => Profession.fromPersistence(item));
  }

  async save(profession: Profession): Promise<void> {
    await this.prisma.profession.update({
      where: { id: profession.id },
      data: {
        name: profession.name,
        isActive: profession.isActive,
      },
    });
  }

  async create(profession: Profession): Promise<Profession> {
    const createData: any = {
      name: profession.name,
    };
    delete createData.id;
    const created = await this.prisma.profession.create({
      data: createData,
    });
    return Profession.fromPersistence(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.profession.delete({
      where: { id },
    });
  }

  async countMembersByProfessionId(professionId: string): Promise<number> {
    return await this.prisma.member.count({
      where: { professionId },
    });
  }
}
