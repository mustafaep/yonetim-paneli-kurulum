/**
 * Prisma Member Group Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MemberGroupRepository } from '../../domain/repositories/member-group.repository.interface';
import { MemberGroup } from '../../domain/entities/member-group.entity';

@Injectable()
export class PrismaMemberGroupRepository implements MemberGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MemberGroup | null> {
    const data = await this.prisma.memberGroup.findUnique({
      where: { id },
    });
    return data ? MemberGroup.fromPersistence(data) : null;
  }

  async findByName(name: string): Promise<MemberGroup | null> {
    const data = await this.prisma.memberGroup.findUnique({
      where: { name },
    });
    return data ? MemberGroup.fromPersistence(data) : null;
  }

  async findAll(includeInactive: boolean = false): Promise<MemberGroup[]> {
    const where = includeInactive ? {} : { isActive: true };
    const data = await this.prisma.memberGroup.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return data.map((item) => MemberGroup.fromPersistence(item));
  }

  async findMaxOrder(): Promise<number> {
    const result = await this.prisma.memberGroup.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return result ? result.order : -1;
  }

  async save(memberGroup: MemberGroup): Promise<void> {
    await this.prisma.memberGroup.update({
      where: { id: memberGroup.id },
      data: {
        name: memberGroup.name,
        description: memberGroup.description,
        order: memberGroup.order,
        isActive: memberGroup.isActive,
      },
    });
  }

  async create(memberGroup: MemberGroup): Promise<MemberGroup> {
    const createData: any = {
      name: memberGroup.name,
      description: memberGroup.description,
      order: memberGroup.order,
    };
    delete createData.id;
    const created = await this.prisma.memberGroup.create({
      data: createData,
    });
    return MemberGroup.fromPersistence(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.memberGroup.delete({
      where: { id },
    });
  }

  async countMembersByMemberGroupId(memberGroupId: string): Promise<number> {
    return await this.prisma.member.count({
      where: { memberGroupId },
    });
  }
}
