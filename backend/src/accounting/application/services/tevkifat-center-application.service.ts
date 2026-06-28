/**
 * TevkifatCenter Application Service
 *
 * Use cases:
 * - Create tevkifat center
 * - Update tevkifat center
 * - Delete tevkifat center (with member handling)
 * - List tevkifat centers
 * - Get tevkifat center by ID
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { TevkifatCenterRepository } from '../../domain/repositories/tevkifat-center.repository.interface';
import { TevkifatCenter } from '../../domain/entities/tevkifat-center.entity';
import { PrismaService } from '../../../prisma/prisma.service';
import { MemberActionOnTevkifatCenterDelete } from '../../dto/delete-tevkifat-center.dto';

@Injectable()
export class TevkifatCenterApplicationService {
  constructor(
    @Inject('TevkifatCenterRepository')
    private readonly repository: TevkifatCenterRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createCenter(data: {
    name: string;
    provinceId?: string | null;
    districtId?: string | null;
  }): Promise<TevkifatCenter> {
    // Check if name already exists
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new ConflictException(
        'Bu isimde bir tevkifat merkezi zaten mevcut',
      );
    }

    const center = TevkifatCenter.create(data);
    return await this.repository.create(center);
  }

  async updateCenter(
    id: string,
    data: {
      name?: string;
      provinceId?: string | null;
      districtId?: string | null;
      isActive?: boolean;
    },
  ): Promise<TevkifatCenter> {
    const center = await this.repository.findById(id);
    if (!center) {
      throw new NotFoundException('Tevkifat merkezi bulunamadı');
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name !== center.name) {
      const existing = await this.repository.findByName(data.name);
      if (existing) {
        throw new ConflictException(
          'Bu isimde bir tevkifat merkezi zaten mevcut',
        );
      }
    }

    center.update(data);
    await this.repository.save(center);
    return center;
  }

  async deleteCenter(
    id: string,
    memberAction: MemberActionOnTevkifatCenterDelete,
    targetCenterId?: string,
  ): Promise<void> {
    const center = await this.repository.findById(id);
    if (!center) {
      throw new NotFoundException('Tevkifat merkezi bulunamadı');
    }

    // Handle members based on action type
    await this.handleMemberActions(id, memberAction, targetCenterId);

    // Deactivate center
    center.deactivate();
    await this.repository.save(center);
  }

  private async handleMemberActions(
    centerId: string,
    action: MemberActionOnTevkifatCenterDelete,
    targetCenterId?: string,
  ): Promise<void> {
    switch (action) {
      case MemberActionOnTevkifatCenterDelete.REMOVE_TEVKIFAT_CENTER:
        await this.prisma.member.updateMany({
          where: { tevkifatCenterId: centerId },
          data: { tevkifatCenterId: null },
        });
        break;

      case MemberActionOnTevkifatCenterDelete.TRANSFER_TO_TEVKIFAT_CENTER:
        if (!targetCenterId) {
          throw new BadRequestException(
            'TRANSFER_TO_TEVKIFAT_CENTER seçeneği için targetTevkifatCenterId gereklidir',
          );
        }
        const targetCenter = await this.repository.findById(targetCenterId);
        if (!targetCenter) {
          throw new NotFoundException('Hedef tevkifat merkezi bulunamadı');
        }
        await this.prisma.member.updateMany({
          where: { tevkifatCenterId: centerId },
          data: { tevkifatCenterId: targetCenterId },
        });
        break;

      case MemberActionOnTevkifatCenterDelete.REMOVE_AND_DEACTIVATE:
        await this.prisma.member.updateMany({
          where: { tevkifatCenterId: centerId },
          data: {
            tevkifatCenterId: null,
            status: 'INACTIVE',
            isActive: false,
          },
        });
        break;

      case MemberActionOnTevkifatCenterDelete.TRANSFER_AND_DEACTIVATE:
        if (!targetCenterId) {
          throw new BadRequestException(
            'TRANSFER_AND_DEACTIVATE seçeneği için targetTevkifatCenterId gereklidir',
          );
        }
        const targetCenter2 = await this.repository.findById(targetCenterId);
        if (!targetCenter2) {
          throw new NotFoundException('Hedef tevkifat merkezi bulunamadı');
        }
        await this.prisma.member.updateMany({
          where: { tevkifatCenterId: centerId },
          data: {
            tevkifatCenterId: targetCenterId,
            status: 'INACTIVE',
            isActive: false,
          },
        });
        break;

      case MemberActionOnTevkifatCenterDelete.TRANSFER_AND_CANCEL:
        if (!targetCenterId) {
          throw new BadRequestException(
            'TRANSFER_AND_CANCEL seçeneği için targetTevkifatCenterId gereklidir',
          );
        }
        const targetCenter3 = await this.repository.findById(targetCenterId);
        if (!targetCenter3) {
          throw new NotFoundException('Hedef tevkifat merkezi bulunamadı');
        }
        await this.prisma.member.updateMany({
          where: { tevkifatCenterId: centerId },
          data: {
            tevkifatCenterId: targetCenterId,
            status: 'RESIGNED',
          },
        });
        break;
    }
  }

  async getCenterById(id: string): Promise<TevkifatCenter> {
    const center = await this.repository.findById(id);
    if (!center) {
      throw new NotFoundException('Tevkifat merkezi bulunamadı');
    }
    return center;
  }

  async listCenters(filters?: {
    provinceId?: string;
    districtId?: string;
  }): Promise<TevkifatCenter[]> {
    return await this.repository.findAll(filters);
  }
}
