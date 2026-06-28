import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberScopeService } from '../members/member-scope.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { MemberStatus } from '@prisma/client';

export interface ReportFilterParams {
  provinceId?: string;
  districtId?: string;
  branchId?: string;
  institutionId?: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly DEFAULT_MONTHLY_DUES = 50;

  constructor(
    private prisma: PrismaService,
    private memberScopeService: MemberScopeService,
  ) {}

  private async buildMemberWhere(
    user?: CurrentUserData,
    filters?: ReportFilterParams,
  ): Promise<any> {
    const scopeIds = user
      ? await this.memberScopeService.getUserScopeIds(user)
      : {};

    const where: any = {};
    if (filters?.provinceId) {
      where.provinceId = filters.provinceId;
    } else if (scopeIds.provinceId) {
      where.provinceId = scopeIds.provinceId;
    }
    if (filters?.districtId) {
      where.districtId = filters.districtId;
    } else if (scopeIds.districtId) {
      where.districtId = scopeIds.districtId;
    }
    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }
    if (filters?.institutionId) {
      where.institutionId = filters.institutionId;
    }
    return where;
  }

  async getGlobalReport(user?: CurrentUserData, filters?: ReportFilterParams) {
    const where = await this.buildMemberWhere(user, filters);

    const [
      totalMembers,
      activeMembers,
      cancelledMembers,
      totalUsers,
      totalRoles,
      totalPayments,
      byProvinceData,
      byStatusData,
    ] = await Promise.all([
      this.prisma.member.count({
        where: {
          ...where,
          status: { in: ['ACTIVE', 'RESIGNED', 'EXPELLED'] },
        },
      }),
      this.prisma.member.count({
        where: {
          ...where,
          status: 'ACTIVE',
        },
      }),
      this.prisma.member.count({
        where: {
          ...where,
          status: { in: ['RESIGNED', 'EXPELLED'] },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          isActive: true,
        },
      }),
      this.prisma.customRole.count({
        where: {
          deletedAt: null,
          isActive: true,
        },
      }),
      this.prisma.memberPayment.aggregate({
        where: {
          member: Object.keys(where).length > 0 ? where : undefined,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.member.groupBy({
        by: ['provinceId'],
        where: {
          ...where,
          status: { in: ['ACTIVE', 'RESIGNED', 'EXPELLED'] },
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.member.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true,
        },
      }),
    ]);

    // İl bazlı verileri formatla
    const byProvince = await Promise.all(
      byProvinceData.map(async (item) => {
        const province = await this.prisma.province.findUnique({
          where: { id: item.provinceId },
        });
        return {
          provinceId: item.provinceId,
          provinceName: province?.name || 'Bilinmeyen',
          memberCount: item._count.id,
        };
      }),
    );

    // Durum bazlı verileri formatla
    const byStatus = byStatusData.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));

    // Borç hesaplama
    const totalDebt = await this.calculateTotalDebt(where);

    return {
      totalMembers,
      activeMembers,
      cancelledMembers,
      totalUsers,
      totalRoles,
      totalDuesPlans: 0, // DuesPlan modeli yok
      totalPayments: Number(totalPayments._sum.amount || 0),
      totalDebt,
      byProvince,
      byStatus,
    };
  }

  async getRegionReport(regionId?: string, user?: CurrentUserData) {
    const scopeIds = user
      ? await this.memberScopeService.getUserScopeIds(user)
      : {};

    // Eğer regionId verilmişse, sadece o bölge için rapor döndür
    if (regionId) {
      // Kullanıcı scope kontrolü
      if (scopeIds.provinceId && scopeIds.provinceId !== regionId) {
        throw new Error('Bu bölgeye erişim yetkiniz yok');
      }

      const province = await this.prisma.province.findUnique({
        where: { id: regionId },
      });

      if (!province) {
        throw new Error('Bölge bulunamadı');
      }

      const [memberCount, activeMembers, cancelledMembers, totalPayments] =
        await Promise.all([
          this.prisma.member.count({
            where: {
              provinceId: regionId,
              status: { in: ['ACTIVE', 'RESIGNED', 'EXPELLED'] },
            },
          }),
          this.prisma.member.count({
            where: {
              provinceId: regionId,
              status: 'ACTIVE',
            },
          }),
          this.prisma.member.count({
            where: {
              provinceId: regionId,
              status: { in: ['RESIGNED', 'EXPELLED'] },
            },
          }),
          this.prisma.memberPayment.aggregate({
            where: {
              member: {
                provinceId: regionId,
              },
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

      return {
        regionId: province.id,
        regionName: province.name,
        memberCount,
        activeMembers,
        cancelledMembers,
        totalPayments: Number(totalPayments._sum.amount || 0),
        totalDebt: await this.calculateTotalDebt({ provinceId: regionId }),
      };
    }

    // Tüm bölgeler için rapor döndür
    const provinces = await this.prisma.province.findMany({
      orderBy: { name: 'asc' },
      where: scopeIds.provinceId ? { id: scopeIds.provinceId } : undefined,
    });

    const regionReports = await Promise.all(
      provinces.map(async (province) => {
        const [memberCount, activeMembers, cancelledMembers, totalPayments] =
          await Promise.all([
            this.prisma.member.count({
              where: {
                provinceId: province.id,
                status: { in: ['ACTIVE', 'RESIGNED', 'EXPELLED'] },
              },
            }),
            this.prisma.member.count({
              where: {
                provinceId: province.id,
                status: 'ACTIVE',
              },
            }),
            this.prisma.member.count({
              where: {
                provinceId: province.id,
                status: { in: ['RESIGNED', 'EXPELLED'] },
              },
            }),
            this.prisma.memberPayment.aggregate({
              where: {
                member: {
                  provinceId: province.id,
                },
              },
              _sum: {
                amount: true,
              },
            }),
          ]);

        return {
          regionId: province.id,
          regionName: province.name,
          memberCount,
          activeMembers,
          cancelledMembers,
          totalPayments: Number(totalPayments._sum.amount || 0),
          totalDebt: await this.calculateTotalDebt({ provinceId: province.id }),
        };
      }),
    );

    return regionReports;
  }

  async getMemberStatusReport(user?: CurrentUserData, filters?: ReportFilterParams) {
    const where = await this.buildMemberWhere(user, filters);

    const [statusCounts, totalMembers] = await Promise.all([
      this.prisma.member.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true,
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return statusCounts.map((item) => ({
      status: item.status,
      count: item._count.id,
      percentage: totalMembers > 0 ? (item._count.id / totalMembers) * 100 : 0,
      members: [], // TODO: Üye listesi eklenebilir
    }));
  }

  async getDuesReport(
    user?: CurrentUserData,
    params?: { year?: number; month?: number },
    filters?: ReportFilterParams,
  ) {
    const memberWhere = await this.buildMemberWhere(user, filters);

    const where: any = {};
    if (Object.keys(memberWhere).length > 0) {
      where.member = memberWhere;
    }

    // Tarih filtresi
    if (params?.year) {
      where.paymentPeriodYear = params.year;
    }
    if (params?.month) {
      where.paymentPeriodMonth = params.month;
    }

    // Toplam Kesintiler
    const totalPaymentsResult = await this.prisma.memberPayment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    const [paidMembers, unpaidMembers] = await Promise.all([
      this.prisma.member.count({
        where: {
          ...memberWhere,
          status: 'ACTIVE',
          payments: {
            some: {},
          },
        },
      }),
      this.prisma.member.count({
        where: {
          ...memberWhere,
          status: 'ACTIVE',
          payments: {
            none: {},
          },
        },
      }),
    ]);

    // Aylık Kesintiler
    const byMonthData = await this.prisma.memberPayment.groupBy({
      by: ['paymentPeriodYear', 'paymentPeriodMonth'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      orderBy: [{ paymentPeriodYear: 'desc' }, { paymentPeriodMonth: 'desc' }],
    });

    const byMonth = byMonthData.map((item) => ({
      year: item.paymentPeriodYear,
      month: item.paymentPeriodMonth,
      total: Number(item._sum.amount || 0),
      count: item._count.id,
    }));

    // Plan bazlı Kesintiler (DuesPlan modeli yok, bu yüzden boş array döndürüyoruz)
    const byPlan: Array<{
      planId: string;
      planName: string;
      totalPayments: number;
      memberCount: number;
    }> = [];

    const totalDebt = await this.calculateTotalDebt(
      memberWhere,
      params?.year,
      params?.month,
    );

    return {
      totalPayments: Number(totalPaymentsResult._sum.amount || 0),
      totalDebt,
      paidMembers,
      unpaidMembers,
      byMonth,
      byPlan,
    };
  }

  /**
   * Toplam borç hesapla
   */
  private async calculateTotalDebt(
    memberWhere: any = {},
    targetYear?: number,
    targetMonth?: number,
  ): Promise<number> {
    const now = new Date();
    const currentYear = targetYear || now.getFullYear();
    const currentMonth = targetMonth || now.getMonth() + 1;

    // Aktif üyeleri al
    const activeMembers = await this.prisma.member.findMany({
      where: {
        ...memberWhere,
        status: MemberStatus.ACTIVE,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        approvedAt: true,
        createdAt: true,
      },
    });

    let totalDebt = 0;

    for (const member of activeMembers) {
      const memberDebt = await this.calculateMemberDebt(
        member.id,
        currentYear,
        currentMonth,
      );
      totalDebt += memberDebt;
    }

    return totalDebt;
  }

  /**
   * Üye bazlı borç hesapla
   * Son 12 ay içinde Kesinti yapılmamış aylar için borç hesaplar
   */
  async calculateMemberDebt(
    memberId: string,
    targetYear?: number,
    targetMonth?: number,
  ): Promise<number> {
    const now = new Date();
    const currentYear = targetYear || now.getFullYear();
    const currentMonth = targetMonth || now.getMonth() + 1;

    // Üyenin onay tarihini al (üyelik başlangıcı)
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        approvedAt: true,
        createdAt: true,
        status: true,
      },
    });

    if (!member || member.status !== MemberStatus.ACTIVE) {
      return 0;
    }

    // Üyelik başlangıç tarihi
    const membershipStartDate = member.approvedAt
      ? new Date(member.approvedAt)
      : new Date(member.createdAt);
    const membershipStartYear = membershipStartDate.getFullYear();
    const membershipStartMonth = membershipStartDate.getMonth() + 1;

    // Son 12 ay içindeki Kesintileri al
    const payments = await this.prisma.memberPayment.findMany({
      where: {
        memberId,
        isApproved: true,
        paymentPeriodYear: {
          gte: currentYear - 1,
        },
      },
      select: {
        paymentPeriodYear: true,
        paymentPeriodMonth: true,
      },
    });

    // Ödenmiş ayları set olarak tut
    const paidMonths = new Set<string>();
    payments.forEach((p) => {
      paidMonths.add(`${p.paymentPeriodYear}-${p.paymentPeriodMonth}`);
    });

    // Borç hesapla: Son 12 ay içinde ödenmemiş aylar
    let debtMonths = 0;
    const monthsToCheck = 12;

    for (let i = 0; i < monthsToCheck; i++) {
      let checkYear = currentYear;
      let checkMonth = currentMonth - i;

      // Ay negatif olursa önceki yıla geç
      while (checkMonth <= 0) {
        checkMonth += 12;
        checkYear -= 1;
      }

      // Üyelik başlangıcından önceki ayları sayma
      if (
        checkYear < membershipStartYear ||
        (checkYear === membershipStartYear && checkMonth < membershipStartMonth)
      ) {
        continue;
      }

      // Ödenmemiş ay kontrolü
      const monthKey = `${checkYear}-${checkMonth}`;
      if (!paidMonths.has(monthKey)) {
        debtMonths++;
      }
    }

    return debtMonths * this.DEFAULT_MONTHLY_DUES;
  }

  /**
   * Üye artış/azalış istatistikleri (son 6 ay)
   */
  async getMemberGrowthStats(user?: CurrentUserData, filters?: ReportFilterParams) {
    const where = await this.buildMemberWhere(user, filters);

    const now = new Date();
    const monthsData: {
      month: string;
      year: number;
      newMembers: number;
      leftMembers: number;
      net: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      // O ay yeni katılanlar (ACTIVE duruma geçenler)
      const newMembers = await this.prisma.member.count({
        where: {
          ...where,
          status: {
            in: [
              MemberStatus.ACTIVE,
              MemberStatus.RESIGNED,
              MemberStatus.EXPELLED,
            ],
          },
          approvedAt: {
            gte: targetDate,
            lt: nextMonth,
          },
        },
      });

      // O ay ayrılanlar (RESIGNED veya EXPELLED olanlar)
      const leftMembers = await this.prisma.member.count({
        where: {
          ...where,
          status: { in: [MemberStatus.RESIGNED, MemberStatus.EXPELLED] },
          updatedAt: {
            gte: targetDate,
            lt: nextMonth,
          },
        },
      });

      const monthNames = [
        'Ocak',
        'Şubat',
        'Mart',
        'Nisan',
        'Mayıs',
        'Haziran',
        'Temmuz',
        'Ağustos',
        'Eylül',
        'Ekim',
        'Kasım',
        'Aralık',
      ];

      monthsData.push({
        month: monthNames[targetDate.getMonth()],
        year: targetDate.getFullYear(),
        newMembers,
        leftMembers,
        net: newMembers - leftMembers,
      });
    }

    return monthsData;
  }

  /**
   * Trend istatistikleri (son 30 gün karşılaştırmalı)
   */
  async getTrendStats(user?: CurrentUserData, filters?: ReportFilterParams) {
    const where = await this.buildMemberWhere(user, filters);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Son 30 gün üye artışı
    const [currentMembers, previousMembers] = await Promise.all([
      this.prisma.member.count({
        where: {
          ...where,
          status: {
            in: [
              MemberStatus.ACTIVE,
              MemberStatus.RESIGNED,
              MemberStatus.EXPELLED,
            ],
          },
          approvedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.member.count({
        where: {
          ...where,
          status: {
            in: [
              MemberStatus.ACTIVE,
              MemberStatus.RESIGNED,
              MemberStatus.EXPELLED,
            ],
          },
          approvedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
    ]);

    // Son 30 gün Kesinti artışı
    const [currentPayments, previousPayments] = await Promise.all([
      this.prisma.memberPayment.aggregate({
        where: {
          member: where,
          paymentDate: { gte: thirtyDaysAgo },
          isApproved: true,
        },
        _sum: { amount: true },
      }),
      this.prisma.memberPayment.aggregate({
        where: {
          member: where,
          paymentDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          isApproved: true,
        },
        _sum: { amount: true },
      }),
    ]);

    const currentPaymentAmount = Number(currentPayments._sum.amount || 0);
    const previousPaymentAmount = Number(previousPayments._sum.amount || 0);

    // Son 30 gün kullanıcı artışı
    const [currentUsers, previousUsers] = await Promise.all([
      this.prisma.user.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          deletedAt: null,
          isActive: true,
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          deletedAt: null,
          isActive: true,
        },
      }),
    ]);

    return {
      members: {
        current: currentMembers,
        previous: previousMembers,
        change: currentMembers - previousMembers,
        percentage:
          previousMembers > 0
            ? ((currentMembers - previousMembers) / previousMembers) * 100
            : 0,
      },
      payments: {
        current: currentPaymentAmount,
        previous: previousPaymentAmount,
        change: currentPaymentAmount - previousPaymentAmount,
        percentage:
          previousPaymentAmount > 0
            ? ((currentPaymentAmount - previousPaymentAmount) /
                previousPaymentAmount) *
              100
            : 0,
      },
      users: {
        current: currentUsers,
        previous: previousUsers,
        change: currentUsers - previousUsers,
        percentage:
          previousUsers > 0
            ? ((currentUsers - previousUsers) / previousUsers) * 100
            : 0,
      },
    };
  }

  /**
   * Hızlı uyarılar ve önemli bilgiler
   */
  async getQuickAlerts(user?: CurrentUserData, filters?: ReportFilterParams) {
    const where = await this.buildMemberWhere(user, filters);

    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 60 gündür Kesinti yapmayan aktif üyeler
    const membersWithoutPayment = await this.prisma.member.count({
      where: {
        ...where,
        status: MemberStatus.ACTIVE,
        payments: {
          none: {
            paymentDate: { gte: sixtyDaysAgo },
            isApproved: true,
          },
        },
      },
    });

    // Bekleyen üyelik başvuruları
    const pendingApplications = await this.prisma.member.count({
      where: {
        ...where,
        status: MemberStatus.PENDING,
      },
    });

    // Son 30 günde üye kaybı olan iller (önce üyesi olan illeri bulalım)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const provincesWithLoss = await this.prisma.member.groupBy({
      by: ['provinceId'],
      where: {
        ...where,
        status: { in: [MemberStatus.RESIGNED, MemberStatus.EXPELLED] },
        updatedAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      having: {
        id: { _count: { gt: 0 } },
      },
    });

    return {
      membersWithoutPayment,
      pendingApplications,
      provincesWithMemberLoss: provincesWithLoss.length,
    };
  }
}
