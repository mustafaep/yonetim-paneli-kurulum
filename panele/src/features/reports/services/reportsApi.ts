import httpClient from '../../../shared/services/httpClient';

// ── Filter Params ──

export interface ReportFilterParams {
  provinceId?: string;
  districtId?: string;
  branchId?: string;
  institutionId?: string;
}

function buildFilterQuery(filters?: ReportFilterParams): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.provinceId) params.provinceId = filters.provinceId;
  if (filters?.districtId) params.districtId = filters.districtId;
  if (filters?.branchId) params.branchId = filters.branchId;
  if (filters?.institutionId) params.institutionId = filters.institutionId;
  return params;
}

// ── Response Types ──

export interface GlobalReport {
  totalMembers: number;
  activeMembers: number;
  cancelledMembers: number;
  totalUsers: number;
  totalRoles: number;
  totalDuesPlans: number;
  totalPayments: number;
  totalDebt: number;
  byProvince: ProvinceStats[];
  byStatus: StatusCount[];
}

export interface ProvinceStats {
  provinceId: string;
  provinceName: string;
  memberCount: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface MemberStatusReport {
  status: string;
  count: number;
  percentage: number;
  members: unknown[];
}

export interface MemberGrowthMonth {
  month: string;
  year: number;
  newMembers: number;
  leftMembers: number;
  net: number;
}

export interface TrendStat {
  current: number;
  previous: number;
  change: number;
  percentage: number;
}

export interface TrendStats {
  members: TrendStat;
  payments: TrendStat;
  users: TrendStat;
}

export interface QuickAlerts {
  membersWithoutPayment: number;
  pendingApplications: number;
  provincesWithMemberLoss: number;
}

export interface DuesMonthData {
  year: number;
  month: number;
  total: number;
  count: number;
}

export interface DuesReport {
  totalPayments: number;
  totalDebt: number;
  paidMembers: number;
  unpaidMembers: number;
  byMonth: DuesMonthData[];
  byPlan: unknown[];
}

export interface RegionReport {
  regionId: string;
  regionName: string;
  memberCount: number;
  activeMembers: number;
  cancelledMembers: number;
  totalPayments: number;
  totalDebt: number;
}

// ── API Calls ──

export const fetchGlobalReport = async (filters?: ReportFilterParams): Promise<GlobalReport> => {
  const { data } = await httpClient.get<GlobalReport>('/reports/global', { params: buildFilterQuery(filters) });
  return data;
};

export const fetchMemberStatusReport = async (filters?: ReportFilterParams): Promise<MemberStatusReport[]> => {
  const { data } = await httpClient.get<MemberStatusReport[]>('/reports/member-status', { params: buildFilterQuery(filters) });
  return data;
};

export const fetchMemberGrowthStats = async (filters?: ReportFilterParams): Promise<MemberGrowthMonth[]> => {
  const { data } = await httpClient.get<MemberGrowthMonth[]>('/reports/member-growth', { params: buildFilterQuery(filters) });
  return data;
};

export const fetchTrendStats = async (filters?: ReportFilterParams): Promise<TrendStats> => {
  const { data } = await httpClient.get<TrendStats>('/reports/trends', { params: buildFilterQuery(filters) });
  return data;
};

export const fetchQuickAlerts = async (filters?: ReportFilterParams): Promise<QuickAlerts> => {
  const { data } = await httpClient.get<QuickAlerts>('/reports/alerts', { params: buildFilterQuery(filters) });
  return data;
};

export const fetchDuesReport = async (filters?: ReportFilterParams, year?: number, month?: number): Promise<DuesReport> => {
  const params: Record<string, string> = { ...buildFilterQuery(filters) };
  if (year) params.year = String(year);
  if (month) params.month = String(month);
  const { data } = await httpClient.get<DuesReport>('/reports/dues', { params });
  return data;
};

export const fetchRegionReport = async (regionId?: string): Promise<RegionReport[] | RegionReport> => {
  const params: Record<string, string> = {};
  if (regionId) params.regionId = regionId;
  const { data } = await httpClient.get<RegionReport[] | RegionReport>('/reports/region', { params });
  return data;
};
