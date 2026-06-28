/**
 * Approval Application Service
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { ApprovalRepository } from '../../domain/repositories/approval.repository.interface';
import { Approval } from '../../domain/entities/approval.entity';
import {
  ApprovalStatus,
  ApprovalEntityType,
  MemberStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApprovalApplicationService {
  constructor(
    @Inject('ApprovalRepository')
    private readonly repository: ApprovalRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createApproval(data: {
    entityType: ApprovalEntityType;
    entityId: string;
    requestedBy: string;
    requestData: any;
  }): Promise<Approval> {
    const approval = Approval.create(data);
    return await this.repository.create(approval);
  }

  async approve(
    id: string,
    approvedBy: string,
    approvalNote?: string,
  ): Promise<Approval> {
    const approval = await this.repository.findById(id);
    if (!approval) {
      throw new NotFoundException('Onay isteği bulunamadı');
    }

    approval.approve(approvedBy, approvalNote);
    await this.repository.save(approval);

    // Update entity based on approval
    await this.updateEntity(
      approval.entityType,
      approval.entityId,
      approval.requestData,
      true,
    );

    return approval;
  }

  async reject(
    id: string,
    rejectedBy: string,
    rejectionNote?: string,
  ): Promise<Approval> {
    const approval = await this.repository.findById(id);
    if (!approval) {
      throw new NotFoundException('Onay isteği bulunamadı');
    }

    approval.reject(rejectedBy, rejectionNote);
    await this.repository.save(approval);

    return approval;
  }

  async findPending(): Promise<Approval[]> {
    return await this.repository.findAll({ status: ApprovalStatus.PENDING });
  }

  async findByUser(userId: string): Promise<Approval[]> {
    return await this.repository.findAll({ requestedBy: userId });
  }

  private async updateEntity(
    entityType: ApprovalEntityType,
    entityId: string,
    requestData: any,
    approved: boolean,
  ): Promise<void> {
    if (!approved) {
      return;
    }

    switch (entityType) {
      case ApprovalEntityType.INSTITUTION:
        await this.prisma.institution.update({
          where: { id: entityId },
          data: {
            isActive: true,
            approvedAt: new Date(),
            approvedBy: requestData.approvedBy,
          },
        });
        break;

      case ApprovalEntityType.MEMBER_CREATE:
        await this.prisma.member.update({
          where: { id: entityId },
          data: {
            status: MemberStatus.ACTIVE,
            approvedAt: new Date(),
            approvedByUserId: requestData.approvedBy,
          },
        });
        break;

      case ApprovalEntityType.MEMBER_UPDATE:
        if (requestData.updateData) {
          await this.prisma.member.update({
            where: { id: entityId },
            data: requestData.updateData,
          });
        }
        break;

      case ApprovalEntityType.MEMBER_DELETE:
        await this.prisma.member.update({
          where: { id: entityId },
          data: {
            deletedAt: new Date(),
            isActive: false,
          },
        });
        break;
    }
  }
}
