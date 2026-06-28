// src/types/member.ts

export type MemberStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'RESIGNED'
  | 'EXPELLED'
  | 'REJECTED';

export interface MemberListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  nationalId?: string | null;
  status: MemberStatus;
  registrationNumber?: string | null;
  positionTitle?: string | null;
  province?: { id: string; name: string } | null;
  district?: { id: string; name: string } | null;
  workingProvince: { id: string; name: string };
  workingDistrict: { id: string; name: string };
  institution: { id: string; name: string };
  branch: { id: string; name: string; code?: string | null };
  memberGroup?: { id: string; name: string } | null;
  tevkifatCenter?: { id: string; name: string } | null;
  duesPlan?: {
    id: string;
    name: string;
    amount: number | string;
  } | null;
  createdAt?: string;
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  cancelledBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}

export interface MemberDetail extends MemberListItem {
  nationalId: string;
  source?: 'DIRECT' | 'OTHER';
  membershipInfoOption?: { id: string; label: string; value: string } | null;
  memberGroup?: { id: string; name: string } | null;
  boardDecisionDate?: string | null;
  boardDecisionBookNo?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  birthDate?: string | null;
  birthplace?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  educationStatus?: 'PRIMARY' | 'HIGH_SCHOOL' | 'COLLEGE' | null;
  institutionRegNo?: string | null;
  workUnit?: string | null;
  workUnitAddress?: string | null;
  dutyUnit?: string | null;
  institutionAddress?: string | null;
  institutionProvince?: { id: string; name: string } | null;
  institutionDistrict?: { id: string; name: string } | null;
  profession?: { id: string; name: string } | null;
  staffTitleCode?: string | null;
  tevkifatCenter?: { id: string; name: string; title?: string | null } | null;
  tevkifatTitle?: { id: string; name: string } | null;
  duesPlan?: {
    id: string;
    name: string;
    amount: number | string;
  } | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  previousCancelledMember?: {
    id: string;
    firstName: string;
    lastName: string;
    cancelledAt: string | null;
    cancellationReason: string | null;
    status: MemberStatus;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    customRoles?: Array<{
      name: string;
    }>;
  } | null;
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  approvedAt?: string | null;
  cancelledBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  } | null;
  membershipPeriods?: MemberMembershipPeriod[];
  advances?: MemberAdvanceSummary[];
}

/** Üyelik dönemi (istifa/ihraç geçmişi, yeniden üyelik) */
export interface MemberMembershipPeriod {
  id: string;
  memberId: string;
  registrationNumber: string;
  periodStart: string;
  periodEnd: string | null;
  status: MemberStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  cancelledBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface MemberAdvanceSummary {
  id: string;
  amount: number | string;
  advanceDate: string;
  month: number;
  year: number;
  description?: string | null;
  documentUrl?: string | null;
  createdAt: string;
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface MemberHistory {
  id: string;
  memberId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  deletedFields?: string[] | null;
  updatedFields?: Record<string, { old: any; new: any }> | null;
  changedBy: string;
  changedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

// 🔹 Üye başvurusu listesi (GET /members/applications)
export interface MemberApplicationRow {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  status: MemberStatus; // genelde PENDING
  createdAt: string;
  province?: { id: string; name: string } | null;
  district?: { id: string; name: string } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  approvedAt?: string | null;
  branch?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  memberGroup?: {
    id: string;
    name: string;
  } | null;
}
