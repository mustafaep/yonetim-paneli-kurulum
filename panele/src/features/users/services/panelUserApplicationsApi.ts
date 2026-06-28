// src/features/users/services/panelUserApplicationsApi.ts
import httpClient from '../../../shared/services/httpClient';

export interface PanelUserApplication {
  id: string;
  memberId: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    email?: string;
    phone?: string;
    branch: { id: string; name: string };
    institution: { id: string; name: string };
  };
  requestedRoleId: string;
  requestedRole: {
    id: string;
    name: string;
    description?: string;
    permissions?: Array<{ permission: string }>;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestNote?: string;
  reviewedBy?: string;
  reviewedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewedAt?: string;
  reviewNote?: string;
  createdUserId?: string;
  createdUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  applicationScopes?: Array<{
    id: string;
    provinceId?: string;
    districtId?: string;
    province?: { id: string; name: string };
    district?: { id: string; name: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface RoleScopeDto {
  provinceId?: string;
  districtId?: string;
}

export interface CreatePanelUserApplicationDto {
  requestedRoleId: string;
  requestNote?: string;
  scopes?: RoleScopeDto[];
}

export interface ApprovePanelUserApplicationDto {
  email: string;
  password: string;
  reviewNote?: string;
  scopes?: RoleScopeDto[];
}

export interface RejectPanelUserApplicationDto {
  reviewNote: string;
}

export const createPanelUserApplication = async (
  memberId: string,
  dto: CreatePanelUserApplicationDto,
): Promise<PanelUserApplication> => {
  const res = await httpClient.post<PanelUserApplication>(
    `/panel-user-applications/members/${memberId}`,
    dto,
  );
  return res.data;
};

export const getPanelUserApplications = async (
  status?: 'PENDING' | 'APPROVED' | 'REJECTED',
): Promise<PanelUserApplication[]> => {
  const res = await httpClient.get<PanelUserApplication[]>(
    '/panel-user-applications',
    { params: status ? { status } : undefined },
  );
  return res.data;
};

export const getPanelUserApplicationById = async (
  id: string,
): Promise<PanelUserApplication> => {
  const res = await httpClient.get<PanelUserApplication>(
    `/panel-user-applications/${id}`,
  );
  return res.data;
};

export const approvePanelUserApplication = async (
  id: string,
  dto: ApprovePanelUserApplicationDto,
): Promise<PanelUserApplication> => {
  const res = await httpClient.post<PanelUserApplication>(
    `/panel-user-applications/${id}/approve`,
    dto,
  );
  return res.data;
};

export const rejectPanelUserApplication = async (
  id: string,
  dto: RejectPanelUserApplicationDto,
): Promise<PanelUserApplication> => {
  const res = await httpClient.post<PanelUserApplication>(
    `/panel-user-applications/${id}/reject`,
    dto,
  );
  return res.data;
};

export interface DirectPromotePanelUserDto {
  requestedRoleId: string;
  email: string;
  password: string;
  note?: string;
  scopes?: RoleScopeDto[];
}

export interface DirectPromoteResult {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const directPromoteMemberToPanelUser = async (
  memberId: string,
  dto: DirectPromotePanelUserDto,
): Promise<DirectPromoteResult> => {
  const res = await httpClient.post<DirectPromoteResult>(
    `/panel-user-applications/members/${memberId}/direct`,
    dto,
  );
  return res.data;
};

