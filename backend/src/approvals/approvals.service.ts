import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApprovalStatus,
  ApprovalEntityType,
  MemberStatus,
} from '@prisma/client';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Yeni onay isteği oluştur
   */
  async createApproval(
    entityType: ApprovalEntityType,
    entityId: string,
    requestedBy: string,
    requestData: any,
  ) {
    return this.prisma.approval.create({
      data: {
        entityType,
        entityId,
        requestedBy,
        requestData,
        status: ApprovalStatus.PENDING,
      },
      include: {
        requestedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Onay isteğini onayla
   */
  async approve(id: string, approvedBy: string, approvalNote?: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new NotFoundException('Onay isteği bulunamadı');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Bu onay isteği zaten işlenmiş');
    }

    // Entity'yi güncelle
    await this.updateEntity(
      approval.entityType,
      approval.entityId,
      approval.requestData,
      true,
    );

    return this.prisma.approval.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedBy,
        approvalNote,
        approvedAt: new Date(),
      },
      include: {
        requestedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Onay isteğini reddet
   */
  async reject(id: string, rejectedBy: string, rejectionNote?: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new NotFoundException('Onay isteği bulunamadı');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Bu onay isteği zaten işlenmiş');
    }

    return this.prisma.approval.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        rejectedBy,
        rejectionNote,
        rejectedAt: new Date(),
      },
      include: {
        requestedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        rejectedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Bekleyen onayları listele
   */
  async findPending() {
    return this.prisma.approval.findMany({
      where: {
        status: ApprovalStatus.PENDING,
      },
      include: {
        requestedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Kullanıcının onaylarını listele
   */
  async findByUser(userId: string) {
    return this.prisma.approval.findMany({
      where: {
        requestedBy: userId,
      },
      include: {
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        rejectedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Entity'yi güncelle (onaylandığında)
   */
  private async updateEntity(
    entityType: ApprovalEntityType,
    entityId: string,
    requestData: any,
    approved: boolean,
  ) {
    switch (entityType) {
      case ApprovalEntityType.INSTITUTION:
        if (approved) {
          await this.prisma.institution.update({
            where: { id: entityId },
            data: {
              isActive: true,
              approvedAt: new Date(),
              approvedBy: requestData.approvedBy,
            },
          });
        }
        break;
      case ApprovalEntityType.MEMBER_CREATE:
        // Member oluşturma zaten yapılmış, sadece onayla
        if (approved) {
          await this.prisma.member.update({
            where: { id: entityId },
            data: {
              status: MemberStatus.ACTIVE,
              approvedAt: new Date(),
              approvedByUserId: requestData.approvedBy,
            },
          });
        }
        break;
      case ApprovalEntityType.MEMBER_UPDATE:
        // Member güncelleme
        if (approved && requestData.updateData) {
          await this.prisma.member.update({
            where: { id: entityId },
            data: requestData.updateData,
          });
        }
        break;
      case ApprovalEntityType.MEMBER_DELETE:
        // Member silme
        if (approved) {
          await this.prisma.member.update({
            where: { id: entityId },
            data: {
              deletedAt: new Date(),
              isActive: false,
            },
          });
        }
        break;
    }
  }
}
