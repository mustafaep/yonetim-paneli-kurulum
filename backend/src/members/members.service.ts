import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberApplicationDto } from './application/dto/create-member-application.dto';
import { CancelMemberDto } from './application/dto/cancel-member.dto';
import { ApproveMemberDto } from './application/dto/approve-member.dto';
import { MemberStatus, MemberSource, Prisma } from '@prisma/client';
import { MemberScopeService } from './member-scope.service';
import { MemberHistoryService } from './member-history.service';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UpdateMemberDto } from './application/dto/update-member.dto';
import { DeleteMemberDto } from './application/dto/delete-member.dto';
import { ConfigService } from '../config/config.service';
import { DocumentsService } from '../documents/documents.service';
import { forwardRef, Inject } from '@nestjs/common';
// 🆕 Yeni mimari: Domain-driven yapı
import { MemberApprovalApplicationService } from './application/services/member-approval-application.service';
import { MemberActivationApplicationService } from './application/services/member-activation-application.service';
import { MemberRejectionApplicationService } from './application/services/member-rejection-application.service';
import { MemberCancellationApplicationService } from './application/services/member-cancellation-application.service';
import { MemberUpdateApplicationService } from './application/services/member-update-application.service';
import { MemberCreationApplicationService } from './application/services/member-creation-application.service';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private prisma: PrismaService,
    private scopeService: MemberScopeService,
    private historyService: MemberHistoryService,
    private configService: ConfigService,
    @Inject(forwardRef(() => DocumentsService))
    private documentsService: DocumentsService,
    // 🆕 Yeni mimari: Application Service inject et
    private memberApprovalApplicationService: MemberApprovalApplicationService,
    private memberActivationApplicationService: MemberActivationApplicationService,
    private memberRejectionApplicationService: MemberRejectionApplicationService,
    private memberCancellationApplicationService: MemberCancellationApplicationService,
    private memberUpdateApplicationService: MemberUpdateApplicationService,
    private memberCreationApplicationService: MemberCreationApplicationService,
  ) {}

  /**
   * Aktif üyelik bilgisi seçeneklerini getir
   */
  async getMembershipInfoOptions() {
    return this.prisma.membershipInfoOption.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      select: {
        id: true,
        label: true,
        value: true,
        description: true,
      },
    });
  }

  // TC kimlik numarasına göre iptal edilmiş üye kontrolü
  async checkCancelledMemberByNationalId(
    nationalId: string,
    user?: CurrentUserData,
  ) {
    if (!nationalId || nationalId.trim().length === 0) {
      return null;
    }

    // Kullanıcının scope'una göre filtreleme yap
    let whereScope: any = {};
    if (user) {
      whereScope = await this.scopeService.buildMemberWhereForUser(user);
      // Impossible filter kontrolü
      if (whereScope.id === '') {
        return null; // Kullanıcının yetkisi yok
      }
    }

    const cancelledMember = await this.prisma.member.findFirst({
      where: {
        nationalId: nationalId.trim(),
        status: {
          in: [
            MemberStatus.RESIGNED,
            MemberStatus.EXPELLED,
            MemberStatus.INACTIVE,
          ],
        },
        deletedAt: null,
        isActive: true,
        ...whereScope, // Scope filtresini ekle
      },
      orderBy: [{ cancelledAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        province: {
          select: { name: true },
        },
        district: {
          select: { name: true },
        },
      },
    });

    return cancelledMember;
  }

  /**
   * Create Member Application
   *
   * ✅ Yeni mimari: MemberCreationApplicationService kullanıyor
   */
  async createApplication(
    dto: CreateMemberApplicationDto,
    createdByUserId?: string,
    previousCancelledMemberId?: string,
    user?: CurrentUserData,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const member =
      await this.memberCreationApplicationService.createApplication({
        dto,
        createdByUserId,
        previousCancelledMemberId,
        user,
        ipAddress,
        userAgent,
      });

    // Domain Entity → Prisma model'e dönüştür
    return await this.getById(member.id);
  }

  // PENDING başvurular: scope'a göre
  async listApplicationsForUser(user: CurrentUserData) {
    const whereScope = await this.scopeService.buildMemberWhereForUser(user);

    return this.prisma.member.findMany({
      where: {
        ...whereScope,
        status: MemberStatus.PENDING,
        deletedAt: null, // Soft delete kontrolü
        isActive: true,
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            customRoles: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Ana üye listesi: Status parametresine göre filtreleme yapar
  // Varsayılan olarak ACTIVE üyeler gösterilir. provinceId verilirse il'e göre filtreler (üye ili, şube ili veya kurum ili).
  async listMembersForUser(
    user: CurrentUserData,
    status?: MemberStatus,
    provinceId?: string,
  ) {
    const whereScope = await this.scopeService.buildMemberWhereForUser(user);

    // Status belirtilmemişse varsayılan olarak ACTIVE
    const filterStatus = status || MemberStatus.ACTIVE;

    const where: Prisma.MemberWhereInput = {
      ...whereScope,
      status: filterStatus,
      deletedAt: null,
      isActive: true,
    };

    // İl filtresi: üyenin ili, şubenin ili veya kurumun ili seçilen ile eşleşsin
    if (provinceId && provinceId.trim() !== '') {
      where.OR = [
        { provinceId },
        { branch: { provinceId } },
        { institution: { provinceId } },
      ];
    }

    const members = await this.prisma.member.findMany({
      where,
      include: {
        province: {
          select: {
            id: true,
            name: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
            province: {
              select: { id: true, name: true },
            },
            district: {
              select: { id: true, name: true },
            },
          },
        },
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            province: {
              select: { id: true, name: true },
            },
            district: {
              select: { id: true, name: true },
            },
          },
        },
        memberGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // workingProvince / workingDistrict: şube > kurum > üye il/ilçe
    return members.map((m: any) => {
      const workingProvince =
        m.branch?.province ?? m.institution?.province ?? m.province;
      const workingDistrict =
        m.branch?.district ?? m.institution?.district ?? m.district;
      return {
        ...m,
        workingProvince: workingProvince ?? { id: '', name: '-' },
        workingDistrict: workingDistrict ?? { id: '', name: '-' },
      };
    });
  }

  /**
   * Üye hareket geçmişi (MemberHistory) listesini getir.
   *
   * Not:
   * - Kullanıcının üye görüntüleme scope'una göre filtrelenir
   * - İsteğe bağlı olarak üye, aksiyon ve tarih aralığına göre filtrelenebilir
   * - Basit sayfalama desteği sağlar
   */
  async listMemberHistoryForUser(options: {
    user: CurrentUserData;
    memberId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      user,
      memberId,
      action,
      from,
      to,
      search,
      page = 1,
      pageSize = 50,
    } = options;

    const effectivePage = page < 1 ? 1 : page;
    const effectivePageSize = pageSize > 200 ? 200 : pageSize;

    const whereScope = await this.scopeService.buildMemberWhereForUser(user);

    const where: Prisma.MemberHistoryWhereInput = {
      member: {
        ...whereScope,
      },
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (action) {
      where.action = action.toUpperCase();
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        (where.createdAt as Prisma.DateTimeFilter).gte = from;
      }
      if (to) {
        (where.createdAt as Prisma.DateTimeFilter).lte = to;
      }
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        {
          member: {
            firstName: { contains: term, mode: 'insensitive' },
          },
        },
        {
          member: {
            lastName: { contains: term, mode: 'insensitive' },
          },
        },
        {
          member: {
            nationalId: { contains: term },
          },
        },
        {
          changedByUser: {
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.memberHistory.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nationalId: true,
              registrationNumber: true,
            },
          },
          changedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (effectivePage - 1) * effectivePageSize,
        take: effectivePageSize,
      }),
      this.prisma.memberHistory.count({ where }),
    ]);

    return {
      items,
      total,
      page: effectivePage,
      pageSize: effectivePageSize,
    };
  }

  // Reddedilen üyeler: scope'a göre
  async listRejectedMembersForUser(user: CurrentUserData) {
    const whereScope = await this.scopeService.buildMemberWhereForUser(user);

    const members = await this.prisma.member.findMany({
      where: {
        ...whereScope,
        status: MemberStatus.REJECTED,
        deletedAt: null,
        isActive: true,
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
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

    return members;
  }

  async getById(id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id },
      include: {
        province: {
          select: {
            id: true,
            name: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        institutionProvince: {
          select: {
            id: true,
            name: true,
          },
        },
        institutionDistrict: {
          select: {
            id: true,
            name: true,
          },
        },
        profession: {
          select: {
            id: true,
            name: true,
          },
        },
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        tevkifatTitle: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        membershipInfoOption: {
          select: {
            id: true,
            label: true,
            value: true,
          },
        },
        memberGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        previousCancelledMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            cancelledAt: true,
            cancellationReason: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        membershipPeriods: {
          orderBy: { periodStart: 'desc' },
          include: {
            approvedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            cancelledBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        advances: {
          where: { deletedAt: null },
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
            { advanceDate: 'desc' },
          ],
          select: {
            id: true,
            amount: true,
            advanceDate: true,
            month: true,
            year: true,
            description: true,
            createdAt: true,
            createdByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });
    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }
    return member;
  }

  /**
   * Update Member
   *
   * ✅ Yeni mimari: MemberUpdateApplicationService kullanıyor
   */
  async updateMember(
    id: string,
    dto: UpdateMemberDto,
    updatedByUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 🆕 Yeni mimari: Application Service kullan
    const member = await this.memberUpdateApplicationService.updateMember({
      memberId: id,
      updatedByUserId,
      updateData: dto,
      ipAddress,
      userAgent,
    });

    // Domain Entity → Prisma model'e dönüştür
    return await this.getById(member.id);
  }

  async getMemberHistory(id: string) {
    await this.getById(id); // Üyenin var olduğunu kontrol et
    return this.historyService.getMemberHistory(id);
  }

  /**
   * Approve Member
   *
   * ✅ Yeni mimari: MemberApprovalApplicationService kullanıyor
   */
  async approve(
    id: string,
    approvedByUserId?: string,
    dto?: ApproveMemberDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 🆕 Yeni mimari: Application Service kullan
    if (!approvedByUserId) {
      throw new BadRequestException('Onaylayan kullanıcı ID zorunludur');
    }

    const { member, emptyOptionalFields } =
      await this.memberApprovalApplicationService.approveMember({
        memberId: id,
        approvedByUserId,
        registrationNumber: dto?.registrationNumber,
        boardDecisionDate: dto?.boardDecisionDate,
        boardDecisionBookNo: dto?.boardDecisionBookNo,
        tevkifatCenterId: dto?.tevkifatCenterId,
        tevkifatTitleId: dto?.tevkifatTitleId,
        branchId: dto?.branchId,
        memberGroupId: dto?.memberGroupId,
        ipAddress,
        userAgent,
      });

    // Domain Entity → Prisma model'e dönüştür, emptyOptionalFields ekle
    const prismaMember = await this.getById(member.id);
    return { ...prismaMember, emptyOptionalFields };
  }

  /**
   * Reject Member
   *
   * ✅ Yeni mimari: MemberRejectionApplicationService kullanıyor
   */
  async reject(
    id: string,
    approvedByUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 🆕 Yeni mimari: Application Service kullan
    if (!approvedByUserId) {
      throw new BadRequestException('Reddeden kullanıcı ID zorunludur');
    }

    const member = await this.memberRejectionApplicationService.rejectMember({
      memberId: id,
      rejectedByUserId: approvedByUserId,
      ipAddress,
      userAgent,
    });

    // Domain Entity → Prisma model'e dönüştür
    return await this.getById(member.id);
  }

  /**
   * Activate Member
   *
   * ✅ Yeni mimari: MemberActivationApplicationService kullanıyor
   */
  async activate(
    id: string,
    activatedByUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 🆕 Yeni mimari: Application Service kullan
    if (!activatedByUserId) {
      throw new BadRequestException('Aktifleştiren kullanıcı ID zorunludur');
    }

    const member = await this.memberActivationApplicationService.activateMember(
      {
        memberId: id,
        activatedByUserId,
        ipAddress,
        userAgent,
      },
    );

    // Domain Entity → Prisma model'e dönüştür
    return await this.getById(member.id);
  }

  // APPROVED başvurular: scope'a göre
  async listApprovedMembersForUser(user: CurrentUserData) {
    const whereScope = await this.scopeService.buildMemberWhereForUser(user);

    return this.prisma.member.findMany({
      where: {
        ...whereScope,
        status: MemberStatus.APPROVED,
        deletedAt: null, // Soft delete kontrolü
        isActive: true,
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        memberGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async softDelete(id: string, dto?: DeleteMemberDto) {
    // Önce üyeyi kontrol et
    const member = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    // Kesintileri sil (eğer istenirse)
    if (dto?.deletePayments) {
      await this.prisma.memberPayment.updateMany({
        where: { memberId: id },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    // Dökümanları sil (eğer istenirse)
    if (dto?.deleteDocuments) {
      await this.prisma.memberDocument.updateMany({
        where: { memberId: id },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    // Üyeyi soft delete yap (prisma middleware otomatik olarak soft delete yapar)
    // Not: `PrismaService` soft-delete extension'ı `prisma.extended` üzerinden çalışır.
    // Bu yüzden burada `this.prisma.member.delete()` çağrısı FK constraint nedeniyle fiziksel delete'a sebep oluyordu.
    return this.prisma.extended.member.delete({
      where: { id },
    });
  }

  // İptal edilmiş üyeler: scope'a göre
  async listCancelledMembersForUser(user: CurrentUserData) {
    const whereScope = await this.scopeService.buildMemberWhereForUser(user);

    const members = await this.prisma.member.findMany({
      where: {
        ...whereScope,
        status: {
          in: [
            MemberStatus.RESIGNED,
            MemberStatus.EXPELLED,
            MemberStatus.INACTIVE,
          ],
        },
        deletedAt: null,
        isActive: true,
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { cancelledAt: 'desc' },
    });

    return members;
  }

  /**
   * Cancel Membership
   *
   * ✅ Yeni mimari: MemberCancellationApplicationService kullanıyor
   */
  async cancelMembership(
    id: string,
    dto: CancelMemberDto,
    cancelledByUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Üyelik iptaline izin kontrolü (config check - bu Application Service'te olabilir ama şimdilik burada)
    const allowCancellation = this.configService.getSystemSettingBoolean(
      'MEMBERSHIP_ALLOW_CANCELLATION',
      true,
    );
    if (!allowCancellation) {
      throw new BadRequestException(
        'Üyelik iptali şu anda devre dışı bırakılmıştır',
      );
    }

    // 🆕 Yeni mimari: Application Service kullan
    const member =
      await this.memberCancellationApplicationService.cancelMembership({
        memberId: id,
        cancelledByUserId,
        status: dto.status as any,
        cancellationReason: dto.cancellationReason,
        ipAddress,
        userAgent,
      });

    // Domain Entity → Prisma model'e dönüştür
    return await this.getById(member.id);
  }

  /**
   * Herkese açık: Sadece aktif üyelik ve üyelik başlangıç tarihi (kişisel veri yok).
   */
  async publicActiveMembershipLookup(nationalId: string): Promise<{
    isMember: boolean;
    memberSince: string | null;
  }> {
    const member = await this.prisma.member.findFirst({
      where: {
        nationalId,
        status: MemberStatus.ACTIVE,
        deletedAt: null,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        approvedAt: true,
        createdAt: true,
        membershipPeriods: {
          where: { periodEnd: null },
          orderBy: { periodStart: 'asc' },
          take: 1,
          select: { periodStart: true },
        },
      },
    });

    if (!member) {
      return { isMember: false, memberSince: null };
    }

    const openPeriod = member.membershipPeriods[0];
    const since =
      openPeriod?.periodStart ?? member.approvedAt ?? member.createdAt;

    return {
      isMember: true,
      memberSince: since.toISOString(),
    };
  }
}
