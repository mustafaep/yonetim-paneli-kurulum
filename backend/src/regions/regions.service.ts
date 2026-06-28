import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProvinceDto, CreateDistrictDto } from './application/dto';
import {
  AssignUserScopeDto,
  UpdateUserScopeDto,
  CreateBranchDto,
  UpdateBranchDto,
  AssignBranchPresidentDto,
  DeleteBranchDto,
  MemberActionOnBranchDelete,
  DeleteInstitutionDto,
  MemberActionOnInstitutionDelete,
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { ProvinceApplicationService } from './application/services/province-application.service';
import { DistrictApplicationService } from './application/services/district-application.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/permission.enum';

@Injectable()
export class RegionsService {
  constructor(
    private prisma: PrismaService,
    private provinceService: ProvinceApplicationService,
    private districtService: DistrictApplicationService,
  ) {}

  /** İl/ilçe listesini daralt: MEMBER_LIST_BY_PROVINCE veya atanmış UserScope kaydı varsa */
  private async shouldApplyScopeFilter(
    user?: CurrentUserData,
  ): Promise<boolean> {
    if (!user) return false;
    if (user.roles?.includes('ADMIN')) return false;
    const permissions = user.permissions ?? [];
    if (permissions.includes(Permission.MEMBER_LIST_BY_PROVINCE)) return true;
    const scopeCount = await this.prisma.userScope.count({
      where: { userId: user.userId, deletedAt: null },
    });
    return scopeCount > 0;
  }

  private async getActiveUserScopes(userId: string) {
    return this.prisma.userScope.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        provinceId: true,
        districtId: true,
      },
    });
  }

  /**
   * MEMBER_LIST_BY_PROVINCE kapsamı: doğrudan atanmış iller + ilçe scope'larından çözülen iller.
   * Sadece ilçe atanmışsa provinceId boş olabilir; ilçe kaydından il id'si alınır.
   */
  private async resolveScopedProvinceIds(userId: string): Promise<string[]> {
    const scopes = await this.getActiveUserScopes(userId);
    const ids = new Set<string>();

    for (const s of scopes) {
      if (s.provinceId) {
        ids.add(s.provinceId);
      }
    }

    const districtIds = scopes
      .map((s) => s.districtId)
      .filter((id): id is string => Boolean(id));

    if (districtIds.length > 0) {
      const districts = await this.prisma.district.findMany({
        where: { id: { in: districtIds } },
        select: { provinceId: true },
      });
      districts.forEach((d) => ids.add(d.provinceId));
    }

    return Array.from(ids);
  }

  // ---------- PROVINCE ----------
  async listProvinces(user?: CurrentUserData) {
    if (!(await this.shouldApplyScopeFilter(user))) {
      return this.prisma.province.findMany({
        orderBy: { name: 'asc' },
      });
    }
    if (!user) return [];

    const provinceIds = await this.resolveScopedProvinceIds(user.userId);

    if (!provinceIds.length) {
      return [];
    }

    return this.prisma.province.findMany({
      where: { id: { in: provinceIds } },
      orderBy: { name: 'asc' },
    });
  }

  async createProvince(dto: CreateProvinceDto) {
    return this.prisma.province.create({
      data: {
        name: dto.name,
        code: dto.code,
      },
    });
  }

  async updateProvince(id: string, dto: CreateProvinceDto) {
    return this.prisma.province.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
      },
    });
  }

  async getProvinceById(id: string) {
    const province = await this.prisma.province.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            districts: true,
            institutions: true,
            members: true,
          },
        },
      },
    });

    if (!province) {
      throw new NotFoundException('İl bulunamadı');
    }

    return {
      ...province,
      districtCount: province._count.districts,
      institutionCount: province._count.institutions,
      memberCount: province._count.members,
      _count: undefined,
    };
  }

  // ---------- DISTRICT ----------
  async listDistricts(provinceId?: string, user?: CurrentUserData) {
    const where: Prisma.DistrictWhereInput = {};

    if (!(await this.shouldApplyScopeFilter(user))) {
      if (provinceId) where.provinceId = provinceId;
      return this.prisma.district.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    }
    if (!user) return [];

    const scopes = await this.getActiveUserScopes(user.userId);
    const scopedProvinceIds = await this.resolveScopedProvinceIds(user.userId);

    if (!scopedProvinceIds.length) {
      return [];
    }

    const fullProvinceIds = new Set(
      scopes
        .filter((s) => s.provinceId && !s.districtId)
        .map((s) => s.provinceId as string),
    );

    const scopedDistrictIds = new Set(
      scopes.map((s) => s.districtId).filter((id): id is string => Boolean(id)),
    );

    if (provinceId) {
      if (!scopedProvinceIds.includes(provinceId)) {
        return [];
      }

      if (fullProvinceIds.has(provinceId)) {
        where.provinceId = provinceId;
      } else {
        where.provinceId = provinceId;
        where.id = { in: Array.from(scopedDistrictIds) };
      }
    } else {
      where.provinceId = { in: scopedProvinceIds };
      if (fullProvinceIds.size > 0) {
        where.OR = [
          { provinceId: { in: Array.from(fullProvinceIds) } },
          { id: { in: Array.from(scopedDistrictIds) } },
        ];
      } else {
        where.id = { in: Array.from(scopedDistrictIds) };
      }
    }

    return this.prisma.district.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createDistrict(dto: CreateDistrictDto) {
    const district = await this.districtService.createDistrict({ dto });
    return await this.prisma.district.findUnique({
      where: { id: district.id },
    });
  }

  async updateDistrict(id: string, dto: CreateDistrictDto) {
    const district = await this.districtService.updateDistrict({
      districtId: id,
      dto,
    });
    return await this.prisma.district.findUnique({
      where: { id: district.id },
    });
  }

  async getDistrictById(id: string) {
    const district = await this.prisma.district.findUnique({
      where: { id },
      include: {
        province: true,
        _count: {
          select: {
            institutions: true,
            members: true,
          },
        },
      },
    });

    if (!district) {
      throw new NotFoundException('İlçe bulunamadı');
    }

    return {
      ...district,
      institutionCount: district._count.institutions,
      memberCount: district._count.members,
      _count: undefined,
    };
  }

  // ---------- USER SCOPE ----------
  async assignUserScope(dto: AssignUserScopeDto) {
    // En az bir scope alanı dolu olmalı
    if (!dto.provinceId && !dto.districtId) {
      throw new BadRequestException(
        'En az bir yetki alanı (il veya ilçe) seçmelisiniz.',
      );
    }

    // İlçe seçildiyse il de seçilmiş olmalı
    if (dto.districtId && !dto.provinceId) {
      throw new BadRequestException('İlçe seçmek için önce il seçmelisiniz.');
    }

    // Kullanıcının var olduğunu kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // İl varsa kontrol et
    if (dto.provinceId) {
      const province = await this.prisma.province.findUnique({
        where: { id: dto.provinceId },
      });
      if (!province) {
        throw new NotFoundException('İl bulunamadı');
      }
    }

    // İlçe varsa kontrol et
    if (dto.districtId) {
      const district = await this.prisma.district.findUnique({
        where: { id: dto.districtId },
      });
      if (!district) {
        throw new NotFoundException('İlçe bulunamadı');
      }
      // İlçenin seçili ile ait olduğunu kontrol et
      if (dto.provinceId && district.provinceId !== dto.provinceId) {
        throw new BadRequestException('Seçilen ilçe, seçilen ile ait değil');
      }
    }

    // Duplicate scope kontrolü: Aynı scope zaten var mı? (soft delete edilmemiş olanlar)
    const normalizedProvinceId =
      dto.provinceId && dto.provinceId.trim() !== '' ? dto.provinceId : null;
    const normalizedDistrictId =
      dto.districtId && dto.districtId.trim() !== '' ? dto.districtId : null;

    const existingScope = await this.prisma.userScope.findFirst({
      where: {
        userId: dto.userId,
        provinceId: normalizedProvinceId,
        districtId: normalizedDistrictId,
        deletedAt: null, // Soft delete edilmemiş olanları kontrol et
      },
    });

    if (existingScope) {
      throw new BadRequestException('Bu kullanıcıya aynı scope zaten atanmış.');
    }

    // Her zaman yeni scope oluştur (mevcut scope'ları güncelleme)
    return this.prisma.userScope.create({
      data: {
        userId: dto.userId,
        provinceId: normalizedProvinceId,
        districtId: normalizedDistrictId,
      },
      include: {
        province: true,
        district: true,
      },
    });
  }

  async updateUserScope(scopeId: string, dto: UpdateUserScopeDto) {
    const scope = await this.prisma.userScope.findUnique({
      where: { id: scopeId },
    });

    if (!scope) {
      throw new NotFoundException('Scope bulunamadı');
    }

    // En az bir scope alanı dolu olmalı
    if (!dto.provinceId && !dto.districtId) {
      throw new BadRequestException(
        'En az bir yetki alanı (il veya ilçe) seçmelisiniz.',
      );
    }

    // İlçe seçildiyse il de seçilmiş olmalı
    if (dto.districtId && !dto.provinceId) {
      throw new BadRequestException('İlçe seçmek için önce il seçmelisiniz.');
    }

    // İl varsa kontrol et
    if (dto.provinceId) {
      const province = await this.prisma.province.findUnique({
        where: { id: dto.provinceId },
      });
      if (!province) {
        throw new NotFoundException('İl bulunamadı');
      }
    }

    // İlçe varsa kontrol et
    if (dto.districtId) {
      const district = await this.prisma.district.findUnique({
        where: { id: dto.districtId },
      });
      if (!district) {
        throw new NotFoundException('İlçe bulunamadı');
      }
      // İlçenin seçili ile ait olduğunu kontrol et
      if (dto.provinceId && district.provinceId !== dto.provinceId) {
        throw new BadRequestException('Seçilen ilçe, seçilen ile ait değil');
      }
    }

    // Duplicate scope kontrolü: Aynı scope başka bir kayıtta var mı? (mevcut kayıt hariç, soft delete edilmemiş)
    const normalizedProvinceId =
      dto.provinceId && dto.provinceId.trim() !== '' ? dto.provinceId : null;
    const normalizedDistrictId =
      dto.districtId && dto.districtId.trim() !== '' ? dto.districtId : null;

    const existingScope = await this.prisma.userScope.findFirst({
      where: {
        userId: scope.userId,
        provinceId: normalizedProvinceId,
        districtId: normalizedDistrictId,
        id: { not: scopeId }, // Mevcut kayıt hariç
        deletedAt: null, // Soft delete edilmemiş olanları kontrol et
      },
    });

    if (existingScope) {
      throw new BadRequestException('Bu kullanıcıya aynı scope zaten atanmış.');
    }

    return this.prisma.userScope.update({
      where: { id: scopeId },
      data: {
        provinceId: normalizedProvinceId,
        districtId: normalizedDistrictId,
      },
      include: {
        province: true,
        district: true,
      },
    });
  }

  async deleteUserScope(scopeId: string) {
    const scope = await this.prisma.userScope.findFirst({
      where: {
        id: scopeId,
        deletedAt: null, // Soft delete edilmemiş olanları kontrol et
      },
    });

    if (!scope) {
      throw new NotFoundException('Scope bulunamadı');
    }

    // Soft delete
    await this.prisma.userScope.update({
      where: { id: scopeId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getUserScope(userId: string) {
    const scopes = await this.prisma.userScope.findMany({
      where: {
        userId,
        deletedAt: null, // Sadece soft delete edilmemiş scope'ları getir
      },
      include: {
        province: true,
        district: true,
      },
    });

    return scopes;
  }

  // ---------- BRANCH ----------
  async listBranches(filters?: {
    isActive?: boolean;
    provinceId?: string;
    districtId?: string;
  }) {
    const where: Prisma.BranchWhereInput = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.provinceId) where.provinceId = filters.provinceId;
    if (filters?.districtId) where.districtId = filters.districtId;

    const branches = await this.prisma.branch.findMany({
      where,
      include: {
        president: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // _count'ları dönüştür ve branchSharePercent ekle
    return branches.map((branch) => ({
      ...branch,
      memberCount: branch._count.members,
      branchSharePercent: branch.branchSharePercent
        ? Number(branch.branchSharePercent)
        : 40,
      _count: undefined,
    }));
  }

  async getBranchById(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        president: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('Şube bulunamadı');
    }

    // Aktif üye sayısı
    const activeMemberCount = await this.prisma.member.count({
      where: {
        branchId: id,
        status: 'ACTIVE',
        deletedAt: null,
        isActive: true,
      },
    });

    // Tevkifat merkezlerinden gelen toplam gelir (onaylı Kesintiler)
    const totalRevenue = await this.prisma.memberPayment.aggregate({
      where: {
        member: {
          branchId: id,
        },
        isApproved: true,
        paymentType: 'TEVKIFAT',
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenueAmount = totalRevenue._sum.amount || 0;
    const branchSharePercent = branch.branchSharePercent
      ? Number(branch.branchSharePercent)
      : 40;
    const branchShareAmount =
      Number(totalRevenueAmount) * (branchSharePercent / 100);

    // _count.members'i memberCount'a dönüştür
    return {
      ...branch,
      memberCount: branch._count.members,
      activeMemberCount,
      totalRevenue: totalRevenueAmount,
      branchShareAmount,
      branchSharePercent,
      _count: undefined,
    };
  }

  async createBranch(dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        name: dto.name,
        ...(dto.provinceId &&
          typeof dto.provinceId === 'string' &&
          dto.provinceId.trim() !== '' && { provinceId: dto.provinceId }),
        ...(dto.districtId &&
          typeof dto.districtId === 'string' &&
          dto.districtId.trim() !== '' && { districtId: dto.districtId }),
      },
    });
  }

  async updateBranch(id: string, dto: UpdateBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Şube bulunamadı');
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
        ...(dto.provinceId !== undefined && { provinceId: dto.provinceId }),
        ...(dto.districtId !== undefined && { districtId: dto.districtId }),
      },
      include: {
        president: {
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

  async deleteBranch(id: string, dto: DeleteBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Şube bulunamadı');
    }

    // Toplam şube sayısını kontrol et
    const totalBranchCount = await this.prisma.branch.count();
    if (totalBranchCount <= 1) {
      throw new BadRequestException(
        'Sistemde en az 1 şube bulunmalıdır. Son kalan şubeyi silemezsiniz.',
      );
    }

    // Hedef şubenin var olduğunu kontrol et
    if (!dto.targetBranchId) {
      throw new Error('targetBranchId gereklidir');
    }
    const targetBranch = await this.prisma.branch.findUnique({
      where: { id: dto.targetBranchId },
    });
    if (!targetBranch) {
      throw new NotFoundException('Hedef şube bulunamadı');
    }

    // Üyelere göre işlem yap (tüm seçenekler üyeleri başka bir şubeye taşır)
    switch (dto.memberActionType) {
      case MemberActionOnBranchDelete.TRANSFER_TO_BRANCH:
        // Üyeleri başka bir şubeye taşı (sadece şube değişir)
        await this.prisma.member.updateMany({
          where: { branchId: id },
          data: { branchId: dto.targetBranchId },
        });
        break;

      case MemberActionOnBranchDelete.TRANSFER_AND_DEACTIVATE:
        // Üyeleri başka bir şubeye taşı ve pasif et
        await this.prisma.member.updateMany({
          where: { branchId: id },
          data: {
            branchId: dto.targetBranchId,
            status: 'INACTIVE',
            isActive: false,
          },
        });
        break;

      case MemberActionOnBranchDelete.TRANSFER_AND_CANCEL:
        // Üyeleri başka bir şubeye taşı ve iptal et
        await this.prisma.member.updateMany({
          where: { branchId: id },
          data: {
            branchId: dto.targetBranchId,
            status: 'RESIGNED',
          },
        });
        break;

      case MemberActionOnBranchDelete.TRANSFER_DEACTIVATE_AND_CANCEL:
        // Üyeleri başka bir şubeye taşı, pasif et ve iptal et
        await this.prisma.member.updateMany({
          where: { branchId: id },
          data: {
            branchId: dto.targetBranchId,
            status: 'RESIGNED',
            isActive: false,
          },
        });
        break;

      default:
        throw new Error('Geçersiz memberActionType');
    }

    // Şubeyi sil
    await this.prisma.branch.delete({
      where: { id },
    });
  }

  async assignBranchPresident(id: string, dto: AssignBranchPresidentDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException('Şube bulunamadı');
    }

    // Kullanıcının var olduğunu kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: dto.presidentId },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        presidentId: dto.presidentId,
      },
      include: {
        president: {
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

  // ---------- INSTITUTION ----------
  async listInstitutions(
    provinceId?: string,
    districtId?: string,
    isActive?: boolean,
  ) {
    const where: Prisma.InstitutionWhereInput = {
      deletedAt: null,
    };

    // Eğer districtId verilmişse, sadece o ilçeye bağlı olanları göster
    if (districtId) {
      where.districtId = districtId;
    } else if (provinceId) {
      // Eğer sadece provinceId verilmişse, o ile direkt bağlı olanları VEYA o ilin ilçelerine bağlı olanları göster
      where.OR = [
        { provinceId: provinceId },
        { district: { provinceId: provinceId } },
      ];
    }

    if (isActive !== undefined) where.isActive = isActive;

    const institutions = await this.prisma.institution.findMany({
      where,
      include: {
        province: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Her kurum için üye sayısını ayrı ayrı hesapla (silinmiş ve aktif olmayan üyeleri hariç tut)
    const institutionsWithMemberCount = await Promise.all(
      institutions.map(async (institution) => {
        const memberCount = await this.prisma.member.count({
          where: {
            institutionId: institution.id,
            deletedAt: null,
          },
        });

        return {
          ...institution,
          memberCount,
        };
      }),
    );

    return institutionsWithMemberCount;
  }

  async getInstitutionById(id: string) {
    const institution = await this.prisma.institution.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!institution) {
      throw new NotFoundException('Kurum bulunamadı');
    }

    // Üye sayısını hesapla (silinmiş üyeleri hariç tut)
    const memberCount = await this.prisma.member.count({
      where: {
        institutionId: institution.id,
        deletedAt: null,
      },
    });

    return {
      ...institution,
      memberCount,
    };
  }

  async createInstitution(dto: CreateInstitutionDto, createdBy?: string) {
    const normalizedName = dto.name.trim();
    const existingInstitution = await this.prisma.institution.findFirst({
      where: {
        deletedAt: null,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existingInstitution) {
      throw new BadRequestException('Aynı isimde kurum zaten kayıtlı.');
    }

    return this.prisma.institution.create({
      data: {
        name: normalizedName,
        ...(dto.provinceId ? { provinceId: dto.provinceId } : {}),
        ...(dto.districtId ? { districtId: dto.districtId } : {}),
        ...(createdBy ? { createdBy } : {}),
        isActive: false, // Admin onayı gerekli
      } as Prisma.InstitutionCreateInput,
      include: {
        province: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateInstitution(id: string, dto: UpdateInstitutionDto) {
    const existing = await this.prisma.institution.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Kurum bulunamadı');
    }

    return this.prisma.institution.update({
      where: { id },
      data: {
        name: dto.name,
        provinceId: dto.provinceId !== undefined ? dto.provinceId : undefined,
        districtId: dto.districtId !== undefined ? dto.districtId : undefined,
        isActive: dto.isActive,
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async approveInstitution(id: string, approvedBy: string) {
    const existing = await this.prisma.institution.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Kurum bulunamadı');
    }

    return this.prisma.institution.update({
      where: { id },
      data: {
        isActive: true,
        approvedAt: new Date(),
        approvedBy,
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        district: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteInstitution(id: string, dto: DeleteInstitutionDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.institution.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new NotFoundException('Kurum bulunamadı');
      }

      // Üyelere göre işlem yap
      switch (dto.memberActionType) {
        case MemberActionOnInstitutionDelete.REMOVE_INSTITUTION: {
          // Kurum bilgisini kaldır - institutionId zorunlu olduğundan başka bir kuruma taşı
          const fallback = await tx.institution.findFirst({
            where: {
              id: { not: id },
              deletedAt: null,
              isActive: true,
            },
          });
          if (!fallback) {
            throw new BadRequestException(
              'Başka aktif kurum bulunamadığı için kurum bilgisi kaldırılamaz. Önce başka bir kurum oluşturun veya "Başka Bir Kuruma Taşı" seçeneğini kullanın.',
            );
          }
          await tx.member.updateMany({
            where: { institutionId: id },
            data: { institutionId: fallback.id },
          });
          break;
        }

        case MemberActionOnInstitutionDelete.TRANSFER_TO_INSTITUTION: {
          if (!dto.targetInstitutionId) {
            throw new BadRequestException(
              'TRANSFER_TO_INSTITUTION seçeneği için targetInstitutionId gereklidir',
            );
          }
          const target = await tx.institution.findFirst({
            where: { id: dto.targetInstitutionId, deletedAt: null },
          });
          if (!target) {
            throw new NotFoundException('Hedef kurum bulunamadı');
          }
          if (target.id === id) {
            throw new BadRequestException('Hedef kurum, silinen kurum ile aynı olamaz');
          }
          await tx.member.updateMany({
            where: { institutionId: id },
            data: { institutionId: dto.targetInstitutionId },
          });
          break;
        }

        case MemberActionOnInstitutionDelete.REMOVE_AND_DEACTIVATE: {
          const fallback = await tx.institution.findFirst({
            where: {
              id: { not: id },
              deletedAt: null,
              isActive: true,
            },
          });
          if (!fallback) {
            throw new BadRequestException(
              'Başka aktif kurum bulunamadığı için bu işlem yapılamaz. Önce başka bir kurum oluşturun veya "Başka Bir Kuruma Taşı" seçeneğini kullanın.',
            );
          }
          await tx.member.updateMany({
            where: { institutionId: id },
            data: {
              institutionId: fallback.id,
              status: 'INACTIVE',
              isActive: false,
            },
          });
          break;
        }

        case MemberActionOnInstitutionDelete.TRANSFER_AND_DEACTIVATE: {
          if (!dto.targetInstitutionId) {
            throw new BadRequestException(
              'TRANSFER_AND_DEACTIVATE seçeneği için targetInstitutionId gereklidir',
            );
          }
          const target2 = await tx.institution.findFirst({
            where: { id: dto.targetInstitutionId, deletedAt: null },
          });
          if (!target2) {
            throw new NotFoundException('Hedef kurum bulunamadı');
          }
          if (target2.id === id) {
            throw new BadRequestException('Hedef kurum, silinen kurum ile aynı olamaz');
          }
          await tx.member.updateMany({
            where: { institutionId: id },
            data: {
              institutionId: dto.targetInstitutionId,
              status: 'INACTIVE',
              isActive: false,
            },
          });
          break;
        }

        case MemberActionOnInstitutionDelete.TRANSFER_AND_CANCEL: {
          if (!dto.targetInstitutionId) {
            throw new BadRequestException(
              'TRANSFER_AND_CANCEL seçeneği için targetInstitutionId gereklidir',
            );
          }
          const target3 = await tx.institution.findFirst({
            where: { id: dto.targetInstitutionId, deletedAt: null },
          });
          if (!target3) {
            throw new NotFoundException('Hedef kurum bulunamadı');
          }
          if (target3.id === id) {
            throw new BadRequestException('Hedef kurum, silinen kurum ile aynı olamaz');
          }
          await tx.member.updateMany({
            where: { institutionId: id },
            data: {
              institutionId: dto.targetInstitutionId,
              status: 'RESIGNED',
            },
          });
          break;
        }

        default:
          throw new BadRequestException('Geçersiz memberActionType');
      }

      // Kurumu soft delete
      return tx.institution.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
