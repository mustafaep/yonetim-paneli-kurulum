// src/features/reports/services/reportsMock.ts
import type { MemberStatus } from '../../../types/member';

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  provinceIds?: string[];
  districtIds?: string[];
  status?: MemberStatus;
}

export interface ReportKPIs {
  totalMembers: number;
  activeMembers: number;
  pendingApplications: number;
  newThisMonth: number;
}

export interface MemberReportRow {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  branch: string;
  province: string;
  district: string;
  status: MemberStatus;
  createdAt: string;
}

export interface RegionReportRow {
  region: string;
  totalMembers: number;
  activeMembers: number;
  pendingApplications: number;
  newThisMonth: number;
}

export interface ApplicationReportRow {
  id: string;
  firstName: string;
  lastName: string;
  branch: string;
  status: MemberStatus;
  applicationDate: string;
  daysPending: number;
}

export interface ReportData {
  kpis: ReportKPIs;
  memberReport: MemberReportRow[];
  regionReport: RegionReportRow[];
  applicationReport: ApplicationReportRow[];
}

/**
 * Mock veri üretici - Backend hazır olduğunda bu fonksiyon kaldırılacak
 * ve gerçek API çağrıları yapılacak
 */
export const getMockReportData = (filters: ReportFilters): ReportData => {
  // Mock KPI'lar
  const kpis: ReportKPIs = {
    totalMembers: 1247,
    activeMembers: 1089,
    pendingApplications: 23,
    newThisMonth: 47,
  };

  // Mock Üye Raporu
  const mockMemberData: MemberReportRow[] = [
    {
      id: '1',
      registrationNumber: 'ÜY-2024-001',
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      branch: 'Merkez Şube',
      province: 'İstanbul',
      district: 'Kadıköy',
      status: 'ACTIVE',
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      registrationNumber: 'ÜY-2024-002',
      firstName: 'Ayşe',
      lastName: 'Demir',
      branch: 'Anadolu Şube',
      province: 'Ankara',
      district: 'Çankaya',
      status: 'ACTIVE',
      createdAt: '2024-01-20T11:30:00Z',
    },
    {
      id: '3',
      registrationNumber: 'ÜY-2024-003',
      firstName: 'Mehmet',
      lastName: 'Kaya',
      branch: 'Ege Şube',
      province: 'İzmir',
      district: 'Karşıyaka',
      status: 'PENDING',
      createdAt: '2024-02-01T09:15:00Z',
    },
    {
      id: '4',
      registrationNumber: 'ÜY-2024-004',
      firstName: 'Fatma',
      lastName: 'Şahin',
      branch: 'Merkez Şube',
      province: 'İstanbul',
      district: 'Beşiktaş',
      status: 'ACTIVE',
      createdAt: '2024-02-05T14:20:00Z',
    },
    {
      id: '5',
      registrationNumber: 'ÜY-2024-005',
      firstName: 'Can',
      lastName: 'Özdemir',
      branch: 'Anadolu Şube',
      province: 'Ankara',
      district: 'Keçiören',
      status: 'APPROVED',
      createdAt: '2024-02-10T16:45:00Z',
    },
    {
      id: '6',
      registrationNumber: 'ÜY-2024-006',
      firstName: 'Zeynep',
      lastName: 'Arslan',
      branch: 'Ege Şube',
      province: 'İzmir',
      district: 'Bornova',
      status: 'ACTIVE',
      createdAt: '2024-02-12T08:30:00Z',
    },
    {
      id: '7',
      registrationNumber: 'ÜY-2024-007',
      firstName: 'Emre',
      lastName: 'Çelik',
      branch: 'Merkez Şube',
      province: 'İstanbul',
      district: 'Üsküdar',
      status: 'INACTIVE',
      createdAt: '2024-01-25T12:10:00Z',
    },
    {
      id: '8',
      registrationNumber: 'ÜY-2024-008',
      firstName: 'Selin',
      lastName: 'Yıldız',
      branch: 'Anadolu Şube',
      province: 'Ankara',
      district: 'Etimesgut',
      status: 'ACTIVE',
      createdAt: '2024-02-08T10:55:00Z',
    },
    {
      id: '9',
      registrationNumber: 'ÜY-2024-009',
      firstName: 'Burak',
      lastName: 'Aydın',
      branch: 'Ege Şube',
      province: 'İzmir',
      district: 'Konak',
      status: 'PENDING',
      createdAt: '2024-02-14T15:20:00Z',
    },
    {
      id: '10',
      registrationNumber: 'ÜY-2024-010',
      firstName: 'Elif',
      lastName: 'Güneş',
      branch: 'Merkez Şube',
      province: 'İstanbul',
      district: 'Şişli',
      status: 'ACTIVE',
      createdAt: '2024-02-15T09:40:00Z',
    },
  ];

  // Mock Bölge Raporu
  const mockRegionData: RegionReportRow[] = [
    {
      region: 'İstanbul - Merkez Şube',
      totalMembers: 485,
      activeMembers: 425,
      pendingApplications: 8,
      newThisMonth: 18,
    },
    {
      region: 'Ankara - Anadolu Şube',
      totalMembers: 387,
      activeMembers: 342,
      pendingApplications: 7,
      newThisMonth: 15,
    },
    {
      region: 'İzmir - Ege Şube',
      totalMembers: 295,
      activeMembers: 257,
      pendingApplications: 5,
      newThisMonth: 11,
    },
    {
      region: 'Bursa',
      totalMembers: 80,
      activeMembers: 65,
      pendingApplications: 3,
      newThisMonth: 3,
    },
  ];

  // Mock Başvuru Raporu
  const mockApplicationData: ApplicationReportRow[] = [
    {
      id: 'app-1',
      firstName: 'Ali',
      lastName: 'Veli',
      branch: 'Merkez Şube',
      status: 'PENDING',
      applicationDate: '2024-02-01T10:00:00Z',
      daysPending: 3,
    },
    {
      id: 'app-2',
      firstName: 'Hasan',
      lastName: 'Hüseyin',
      branch: 'Anadolu Şube',
      status: 'PENDING',
      applicationDate: '2024-02-03T14:30:00Z',
      daysPending: 1,
    },
    {
      id: 'app-3',
      firstName: 'Ayşegül',
      lastName: 'Öztürk',
      branch: 'Ege Şube',
      status: 'APPROVED',
      applicationDate: '2024-01-28T09:15:00Z',
      daysPending: 0,
    },
    {
      id: 'app-4',
      firstName: 'Murat',
      lastName: 'Koç',
      branch: 'Merkez Şube',
      status: 'PENDING',
      applicationDate: '2024-02-02T11:20:00Z',
      daysPending: 2,
    },
    {
      id: 'app-5',
      firstName: 'Deniz',
      lastName: 'Yavuz',
      branch: 'Anadolu Şube',
      status: 'REJECTED',
      applicationDate: '2024-01-25T16:45:00Z',
      daysPending: 0,
    },
  ];

  // Filtreleme mantığı (basit örnek - backend gerçek filtrelemeyi yapacak)
  let filteredMemberData = mockMemberData;
  let filteredRegionData = mockRegionData;
  let filteredApplicationData = mockApplicationData;

  if (filters.status && filters.status !== 'ALL') {
    filteredMemberData = filteredMemberData.filter(m => m.status === filters.status);
    filteredApplicationData = filteredApplicationData.filter(a => a.status === filters.status);
  }

  if (filters.branchId && filters.branchId !== 'ALL') {
    filteredMemberData = filteredMemberData.filter(m => m.branch.includes('Merkez')); // Basit örnek
  }

  return {
    kpis,
    memberReport: filteredMemberData,
    regionReport: filteredRegionData,
    applicationReport: filteredApplicationData,
  };
};

/**
 * NOT: Backend API hazır olduğunda aşağıdaki gibi gerçek API fonksiyonları eklenecek:
 * 
 * export const fetchReportData = async (filters: ReportFilters): Promise<ReportData> => {
 *   const response = await httpClient.post('/reports/generate', filters);
 *   return response.data;
 * };
 * 
 * export const fetchKPIs = async (filters: ReportFilters): Promise<ReportKPIs> => {
 *   const response = await httpClient.get('/reports/kpis', { params: filters });
 *   return response.data;
 * };
 * 
 * export const fetchMemberReport = async (filters: ReportFilters): Promise<MemberReportRow[]> => {
 *   const response = await httpClient.get('/reports/members', { params: filters });
 *   return response.data;
 * };
 * 
 * export const fetchRegionReport = async (filters: ReportFilters): Promise<RegionReportRow[]> => {
 *   const response = await httpClient.get('/reports/regions', { params: filters });
 *   return response.data;
 * };
 * 
 * export const fetchApplicationReport = async (filters: ReportFilters): Promise<ApplicationReportRow[]> => {
 *   const response = await httpClient.get('/reports/applications', { params: filters });
 *   return response.data;
 * };
 */
