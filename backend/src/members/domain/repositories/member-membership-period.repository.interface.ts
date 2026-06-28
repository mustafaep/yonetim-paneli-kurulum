/**
 * Member Membership Period Repository Interface (Port)
 *
 * Üyelik dönemleri (istifa/ihraç geçmişi, yeniden üyelik) için domain port.
 */
export interface MemberMembershipPeriodRecord {
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
}

export interface CreateMembershipPeriodData {
  memberId: string;
  registrationNumber: string;
  periodStart: Date;
  periodEnd?: Date | null;
  status: string;
  cancellationReason?: string | null;
  cancelledAt?: Date | null;
  approvedAt?: Date | null;
  approvedByUserId?: string | null;
  cancelledByUserId?: string | null;
}

export interface MemberMembershipPeriodRepository {
  create(
    data: CreateMembershipPeriodData,
  ): Promise<MemberMembershipPeriodRecord>;

  findByMemberId(memberId: string): Promise<MemberMembershipPeriodRecord[]>;
}
