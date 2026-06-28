import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberGroupDto } from './application/dto/create-member-group.dto';
import { UpdateMemberGroupDto } from './application/dto/update-member-group.dto';
import { MemberGroupApplicationService } from './application/services/member-group-application.service';

@Injectable()
export class MemberGroupsService {
  constructor(
    private prisma: PrismaService,
    private memberGroupApplicationService: MemberGroupApplicationService,
  ) {}

  /**
   * Üye grubu listesini getir (sadece aktif olanlar)
   */
  async listMemberGroups() {
    return this.prisma.memberGroup.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Tüm üye gruplarını getir (aktif ve pasif)
   */
  async listAllMemberGroups() {
    return this.prisma.memberGroup.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Üye grubu detayını getir
   */
  async getMemberGroupById(id: string) {
    const memberGroup = await this.prisma.memberGroup.findUnique({
      where: { id },
    });

    if (!memberGroup) {
      throw new NotFoundException('Üye grubu bulunamadı');
    }

    return memberGroup;
  }

  /**
   * Üye grubu oluştur
   */
  async createMemberGroup(dto: CreateMemberGroupDto) {
    const memberGroup =
      await this.memberGroupApplicationService.createMemberGroup({ dto });
    return await this.prisma.memberGroup.findUnique({
      where: { id: memberGroup.id },
    });
  }

  async updateMemberGroup(id: string, dto: UpdateMemberGroupDto) {
    const memberGroup =
      await this.memberGroupApplicationService.updateMemberGroup({
        memberGroupId: id,
        dto,
      });
    return await this.prisma.memberGroup.findUnique({
      where: { id: memberGroup.id },
    });
  }

  async moveMemberGroup(id: string, direction: 'up' | 'down') {
    const memberGroup =
      await this.memberGroupApplicationService.moveMemberGroup({
        memberGroupId: id,
        direction,
      });
    return await this.prisma.memberGroup.findUnique({
      where: { id: memberGroup.id },
    });
  }

  async deleteMemberGroup(id: string) {
    await this.memberGroupApplicationService.deleteMemberGroup({
      memberGroupId: id,
    });
    return await this.prisma.memberGroup.findUnique({ where: { id } });
  }
}
