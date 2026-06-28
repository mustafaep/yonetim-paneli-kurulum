/**
 * Prisma Member Membership Period Repository
 *
 * Üyelik dönemleri için infrastructure implementasyonu.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MemberStatus } from '@prisma/client';
import type {
  MemberMembershipPeriodRepository,
  MemberMembershipPeriodRecord,
  CreateMembershipPeriodData,
} from '../../domain/repositories/member-membership-period.repository.interface';

@Injectable()
export class PrismaMemberMembershipPeriodRepository implements MemberMembershipPeriodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateMembershipPeriodData,
  ): Promise<MemberMembershipPeriodRecord> {
    const row = await this.prisma.memberMembershipPeriod.create({
      data: {
        memberId: data.memberId,
        registrationNumber: data.registrationNumber,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd ?? null,
        status: data.status as MemberStatus,
        cancellationReason: data.cancellationReason ?? null,
        cancelledAt: data.cancelledAt ?? null,
        approvedAt: data.approvedAt ?? null,
        approvedByUserId: data.approvedByUserId ?? null,
        cancelledByUserId: data.cancelledByUserId ?? null,
      },
    });
    return this.toRecord(row);
  }

  async findByMemberId(
    memberId: string,
  ): Promise<MemberMembershipPeriodRecord[]> {
    const rows = await this.prisma.memberMembershipPeriod.findMany({
      where: { memberId },
      orderBy: { periodStart: 'desc' },
    });
    return rows.map((r) => this.toRecord(r));
  }

  private toRecord(row: {
    id: string;
    memberId: string;
    registrationNumber: string;
    periodStart: Date;
    periodEnd: Date | null;
    status: string;
    cancellationReason: string | null;
    cancelledAt: Date | null;
    approvedAt: Date | null;
    createdAt: Date;
  }): MemberMembershipPeriodRecord {
    return {
      id: row.id,
      memberId: row.memberId,
      registrationNumber: row.registrationNumber,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      status: row.status,
      cancellationReason: row.cancellationReason,
      cancelledAt: row.cancelledAt,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
    };
  }
}
