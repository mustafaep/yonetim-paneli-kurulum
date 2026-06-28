import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../documents/services/file-storage.service';
import { UploadTevkifatFileDto } from './dto/upload-tevkifat-file.dto';
import { CreateTevkifatCenterDto } from './dto/create-tevkifat-center.dto';
import { UpdateTevkifatCenterDto } from './dto/update-tevkifat-center.dto';
import {
  DeleteTevkifatCenterDto,
  MemberActionOnTevkifatCenterDelete,
} from './dto/delete-tevkifat-center.dto';
import { CreateTevkifatTitleDto } from './dto/create-tevkifat-title.dto';
import { UpdateTevkifatTitleDto } from './dto/update-tevkifat-title.dto';
import {
  ApprovalStatus,
  DocumentUploadStatus,
  MemberStatus,
  Prisma,
} from '@prisma/client';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/permission.enum';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { UpdateAdvanceDto } from './dto/update-advance.dto';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private prisma: PrismaService,
    private fileStorageService: FileStorageService,
  ) {}

  /**
   * Muhasebe üyeleri listele (Excel/PDF export için)
   */
  async getMembersForAccounting(filters?: {
    branchId?: string;
    tevkifatCenterId?: string;
    year?: number;
    month?: number;
  }) {
    const where: any = {
      status: MemberStatus.ACTIVE,
      deletedAt: null,
      isActive: true,
    };

    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters?.tevkifatCenterId) {
      where.tevkifatCenterId = filters.tevkifatCenterId;
    }

    return this.prisma.member.findMany({
      where,
      select: {
        id: true,
        registrationNumber: true,
        firstName: true,
        lastName: true,
        institution: {
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
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        registrationNumber: 'asc',
      },
    });
  }

  /**
   * Tevkifat dosyası yükle
   */
  async uploadTevkifatFile(dto: UploadTevkifatFileDto, uploadedBy: string) {
    // Tevkifat merkezinin var olduğunu kontrol et
    const tevkifatCenter = await this.prisma.tevkifatCenter.findUnique({
      where: { id: dto.tevkifatCenterId },
    });

    if (!tevkifatCenter) {
      throw new NotFoundException('Tevkifat merkezi bulunamadı');
    }

    // Aynı ay/yıl/kurum için dosya var mı kontrol et
    const existing = await this.prisma.tevkifatFile.findFirst({
      where: {
        tevkifatCenterId: dto.tevkifatCenterId,
        year: dto.year,
        month: dto.month,
        positionTitle: dto.positionTitle || null,
        status: {
          in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Bu ay/yıl için zaten bir dosya yüklenmiş');
    }

    return this.prisma.tevkifatFile.create({
      data: {
        tevkifatCenterId: dto.tevkifatCenterId,
        totalAmount: dto.totalAmount,
        memberCount: dto.memberCount,
        month: dto.month,
        year: dto.year,
        positionTitle: dto.positionTitle || null,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize || null,
        status: ApprovalStatus.PENDING, // Admin onayı bekler
        uploadedBy,
      },
      include: {
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        uploadedByUser: {
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

  /**
   * Tevkifat dosyalarını listele
   */
  async listTevkifatFiles(filters?: {
    year?: number;
    month?: number;
    tevkifatCenterId?: string;
    status?: ApprovalStatus;
  }) {
    const where: any = {};

    if (filters?.year) {
      where.year = filters.year;
    }

    if (filters?.month) {
      where.month = filters.month;
    }

    if (filters?.tevkifatCenterId) {
      where.tevkifatCenterId = filters.tevkifatCenterId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.tevkifatFile.findMany({
      where,
      include: {
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
        uploadedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Tevkifat dosyasını onayla
   */
  async approveTevkifatFile(id: string, approvedBy: string) {
    const file = await this.prisma.tevkifatFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('Tevkifat dosyası bulunamadı');
    }

    if (file.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Bu dosya zaten işlenmiş');
    }

    return this.prisma.tevkifatFile.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedByUser: {
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

  /**
   * Tevkifat dosyasını reddet
   */
  async rejectTevkifatFile(id: string, rejectedBy: string) {
    const file = await this.prisma.tevkifatFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('Tevkifat dosyası bulunamadı');
    }

    if (file.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Bu dosya zaten işlenmiş');
    }

    return this.prisma.tevkifatFile.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
      },
    });
  }

  /**
   * Şube payı hesapla (%40)
   */
  calculateBranchShare(amount: number): number {
    return amount * 0.4;
  }

  private needsScopeRestriction(user?: CurrentUserData): boolean {
    if (!user) return false;
    if (user.roles?.includes('ADMIN')) return false;
    const permissions = user.permissions ?? [];
    return permissions.includes(Permission.MEMBER_LIST_BY_PROVINCE);
  }

  private async getActiveUserScopeMaps(userId: string) {
    const scopes = await this.prisma.userScope.findMany({
      where: { userId, deletedAt: null },
      select: { provinceId: true, districtId: true },
    });

    const scopedProvinceIds = new Set(
      scopes.map((s) => s.provinceId).filter((id): id is string => Boolean(id)),
    );
    const scopedDistrictIds = new Set(
      scopes.map((s) => s.districtId).filter((id): id is string => Boolean(id)),
    );

    return { scopedProvinceIds, scopedDistrictIds };
  }

  /**
   * Tevkifat merkezlerini listele
   * İl seçildiğinde o ile direkt bağlı olanları ve o ilin ilçelerine bağlı olanları gösterir
   */
  async listTevkifatCenters(filters?: {
    provinceId?: string;
    districtId?: string;
    activeOnly?: boolean;
  }, user?: CurrentUserData) {
    const where: any = {};

    // Sadece aktif (kaldırılmamış) tevkifat merkezlerini getir
    if (filters?.activeOnly === true) {
      where.isActive = true;
    }

    // Eğer districtId verilmişse, sadece o ilçeye bağlı olanları göster
    if (filters?.districtId) {
      where.districtId = filters.districtId;
    } else if (filters?.provinceId) {
      // Eğer sadece provinceId verilmişse, o ile direkt bağlı olanları VEYA o ilin ilçelerine bağlı olanları göster
      where.OR = [
        { provinceId: filters.provinceId },
        { district: { provinceId: filters.provinceId } },
      ];
    }

    if (this.needsScopeRestriction(user) && user) {
      const { scopedProvinceIds, scopedDistrictIds } =
        await this.getActiveUserScopeMaps(user.userId);

      // Scope kaydı yoksa kapsam filtresi uygulama (global kullanıcı davranışı)
      if (!scopedProvinceIds.size) {
        const centers = await this.prisma.tevkifatCenter.findMany({
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
            _count: {
              select: {
                members: true,
                files: true,
              },
            },
            files: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 1,
              select: {
                year: true,
                month: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        });

        return centers.map((center) => ({
          id: center.id,
          name: center.name,
          isActive: center.isActive,
          provinceId: center.provinceId,
          districtId: center.districtId,
          province: center.province,
          district: center.district,
          createdAt: center.createdAt,
          updatedAt: center.updatedAt,
          memberCount: center._count.members,
          lastTevkifatMonth:
            center.files && center.files[0]
              ? `${center.files[0].month}/${center.files[0].year}`
              : null,
        }));
      }

      const scopeOr: Prisma.TevkifatCenterWhereInput[] = [];
      for (const provinceId of scopedProvinceIds) {
        scopeOr.push({ provinceId });
      }
      for (const districtId of scopedDistrictIds) {
        scopeOr.push({ districtId });
      }

      where.AND = [...(where.AND ?? []), { OR: scopeOr }];
    }

    const centers = await this.prisma.tevkifatCenter.findMany({
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
        _count: {
          select: {
            members: true,
            files: true,
          },
        },
        files: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 1,
          select: {
            year: true,
            month: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return centers.map((center) => ({
      id: center.id,
      name: center.name,
      isActive: center.isActive,
      provinceId: center.provinceId,
      districtId: center.districtId,
      province: center.province,
      district: center.district,
      createdAt: center.createdAt,
      updatedAt: center.updatedAt,
      memberCount: center._count.members,
      lastTevkifatMonth:
        center.files && center.files[0]
          ? `${center.files[0].month}/${center.files[0].year}`
          : null,
    }));
  }

  /**
   * Tevkifat merkezi detayını getir
   */
  async getTevkifatCenterById(id: string) {
    const center = await this.prisma.tevkifatCenter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            files: true,
            payments: true,
          },
        },
      },
    });

    if (!center) {
      throw new NotFoundException('Tevkifat merkezi bulunamadı');
    }

    // Aylık/yıllık özetleri hesapla
    const files = await this.prisma.tevkifatFile.findMany({
      where: {
        tevkifatCenterId: center.id,
        status: ApprovalStatus.APPROVED,
      },
      select: {
        year: true,
        month: true,
        totalAmount: true,
        memberCount: true,
      },
    });

    // Yıl bazlı özet
    const yearlySummary = files.reduce(
      (acc, file) => {
        const year = file.year;
        if (!acc[year]) {
          acc[year] = { totalAmount: 0, memberCount: 0, monthCount: 0 };
        }
        acc[year].totalAmount += Number(file.totalAmount);
        acc[year].memberCount += file.memberCount;
        acc[year].monthCount += 1;
        return acc;
      },
      {} as Record<
        number,
        { totalAmount: number; memberCount: number; monthCount: number }
      >,
    );

    // Ay bazlı özet (son 12 ay)
    const monthlySummary = files
      .filter((file) => {
        const fileDate = new Date(file.year, file.month - 1);
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        return fileDate >= twelveMonthsAgo;
      })
      .map((file) => ({
        year: file.year,
        month: file.month,
        totalAmount: Number(file.totalAmount),
        memberCount: file.memberCount,
      }));

    return {
      ...center,
      yearlySummary: Object.entries(yearlySummary).map(([year, data]) => ({
        year: Number(year),
        totalAmount: data.totalAmount,
        averageMonthlyAmount:
          data.monthCount > 0 ? data.totalAmount / data.monthCount : 0,
        memberCount: data.memberCount,
      })),
      monthlySummary,
    };
  }

  /**
   * Tevkifat merkezi oluştur
   */
  async createTevkifatCenter(dto: CreateTevkifatCenterDto) {
    return this.prisma.tevkifatCenter.create({
      data: {
        name: dto.name,
        provinceId: dto.provinceId || null,
        districtId: dto.districtId || null,
        isActive: true,
      },
    });
  }

  /**
   * Tevkifat merkezi güncelle
   */
  async updateTevkifatCenter(id: string, dto: UpdateTevkifatCenterDto) {
    const center = await this.prisma.tevkifatCenter.findUnique({
      where: { id },
    });

    if (!center) {
      throw new NotFoundException('Tevkifat merkezi bulunamadı');
    }

    return this.prisma.tevkifatCenter.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.provinceId !== undefined && {
          provinceId: dto.provinceId || null,
        }),
        ...(dto.districtId !== undefined && {
          districtId: dto.districtId || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Tevkifat merkezi sil (soft delete - isActive: false)
   */
  async deleteTevkifatCenter(id: string, dto: DeleteTevkifatCenterDto) {
    // Transaction içinde tüm işlemleri yap
    return this.prisma.$transaction(async (tx) => {
      const center = await tx.tevkifatCenter.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!center) {
        throw new NotFoundException('Tevkifat merkezi bulunamadı');
      }

      // Üyelere göre işlem yap
      switch (dto.memberActionType) {
        case MemberActionOnTevkifatCenterDelete.REMOVE_TEVKIFAT_CENTER:
          // Üyelerin tevkifat merkezi bilgisini kaldır (tevkifatCenterId = null)
          await tx.member.updateMany({
            where: { tevkifatCenterId: id },
            data: { tevkifatCenterId: null },
          });
          break;

        case MemberActionOnTevkifatCenterDelete.TRANSFER_TO_TEVKIFAT_CENTER:
          // Üyeleri başka bir tevkifat merkezine taşı
          if (!dto.targetTevkifatCenterId) {
            throw new BadRequestException(
              'TRANSFER_TO_TEVKIFAT_CENTER seçeneği için targetTevkifatCenterId gereklidir',
            );
          }
          const targetCenter = await tx.tevkifatCenter.findUnique({
            where: { id: dto.targetTevkifatCenterId },
          });
          if (!targetCenter) {
            throw new NotFoundException('Hedef tevkifat merkezi bulunamadı');
          }
          await tx.member.updateMany({
            where: { tevkifatCenterId: id },
            data: { tevkifatCenterId: dto.targetTevkifatCenterId },
          });
          break;

        case MemberActionOnTevkifatCenterDelete.REMOVE_AND_DEACTIVATE:
          // Üyelerin tevkifat merkezi bilgisini kaldır ve pasif et
          await tx.member.updateMany({
            where: { tevkifatCenterId: id },
            data: {
              tevkifatCenterId: null,
              status: 'INACTIVE',
              isActive: false,
            },
          });
          break;

        case MemberActionOnTevkifatCenterDelete.TRANSFER_AND_DEACTIVATE:
          // Üyeleri başka bir tevkifat merkezine taşı ve pasif et
          if (!dto.targetTevkifatCenterId) {
            throw new BadRequestException(
              'TRANSFER_AND_DEACTIVATE seçeneği için targetTevkifatCenterId gereklidir',
            );
          }
          const targetCenter2 = await tx.tevkifatCenter.findUnique({
            where: { id: dto.targetTevkifatCenterId },
          });
          if (!targetCenter2) {
            throw new NotFoundException('Hedef tevkifat merkezi bulunamadı');
          }
          await tx.member.updateMany({
            where: { tevkifatCenterId: id },
            data: {
              tevkifatCenterId: dto.targetTevkifatCenterId,
              status: 'INACTIVE',
              isActive: false,
            },
          });
          break;

        case MemberActionOnTevkifatCenterDelete.TRANSFER_AND_CANCEL:
          // Üyeleri başka bir tevkifat merkezine taşı ve iptal et
          if (!dto.targetTevkifatCenterId) {
            throw new BadRequestException(
              'TRANSFER_AND_CANCEL seçeneği için targetTevkifatCenterId gereklidir',
            );
          }
          const targetCenter3 = await tx.tevkifatCenter.findUnique({
            where: { id: dto.targetTevkifatCenterId },
          });
          if (!targetCenter3) {
            throw new NotFoundException('Hedef tevkifat merkezi bulunamadı');
          }
          await tx.member.updateMany({
            where: { tevkifatCenterId: id },
            data: {
              tevkifatCenterId: dto.targetTevkifatCenterId,
              status: 'RESIGNED',
            },
          });
          break;

        default:
          throw new BadRequestException('Geçersiz memberActionType');
      }

      // Tevkifat merkezini pasif yap (soft delete)
      const updatedCenter = await tx.tevkifatCenter.update({
        where: { id },
        data: { isActive: false },
      });

      // Güncellenmiş merkezi döndür
      return updatedCenter;
    });
  }

  // Tevkifat Unvanları CRUD
  async listTevkifatTitles() {
    return this.prisma.tevkifatTitle.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getTevkifatTitleById(id: string) {
    const title = await this.prisma.tevkifatTitle.findUnique({
      where: { id },
    });

    if (!title) {
      throw new NotFoundException('Tevkifat unvanı bulunamadı');
    }

    return title;
  }

  async createTevkifatTitle(dto: CreateTevkifatTitleDto) {
    // İsim benzersizlik kontrolü
    const existing = await this.prisma.tevkifatTitle.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Bu unvan zaten mevcut');
    }

    return this.prisma.tevkifatTitle.create({
      data: {
        name: dto.name,
      },
    });
  }

  async updateTevkifatTitle(id: string, dto: UpdateTevkifatTitleDto) {
    const title = await this.prisma.tevkifatTitle.findUnique({
      where: { id },
    });

    if (!title) {
      throw new NotFoundException('Tevkifat unvanı bulunamadı');
    }

    // İsim benzersizlik kontrolü
    if (dto.name && dto.name !== title.name) {
      const existing = await this.prisma.tevkifatTitle.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException('Bu unvan zaten mevcut');
      }
    }

    return this.prisma.tevkifatTitle.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteTevkifatTitle(id: string) {
    const title = await this.prisma.tevkifatTitle.findUnique({
      where: { id },
    });

    if (!title) {
      throw new NotFoundException('Tevkifat unvanı bulunamadı');
    }

    // Gerçek silme (hard delete)
    return this.prisma.tevkifatTitle.delete({
      where: { id },
    });
  }

  /**
   * Tevkifat merkezi evrak yükleme
   */
  async uploadTevkifatCenterDocument(
    tevkifatCenterId: string,
    file: Express.Multer.File,
    customFileName?: string,
    description?: string,
    uploadedBy?: string,
    tevkifatTitleId?: string,
    month?: number,
    year?: number,
  ) {
    // Tevkifat merkezinin var olduğunu kontrol et
    const tevkifatCenter = await this.prisma.tevkifatCenter.findUnique({
      where: { id: tevkifatCenterId },
    });

    if (!tevkifatCenter) {
      throw new NotFoundException('Tevkifat merkezi bulunamadı');
    }

    // Tevkifat ünvanı kontrolü (opsiyonel)
    if (tevkifatTitleId) {
      const tevkifatTitle = await this.prisma.tevkifatTitle.findUnique({
        where: { id: tevkifatTitleId },
      });

      if (!tevkifatTitle) {
        throw new NotFoundException('Tevkifat ünvanı bulunamadı');
      }
    }

    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Dosya yüklenmedi. Lütfen bir PDF dosyası seçin.',
      );
    }

    // Dosya validasyonu
    this.fileStorageService.validateFile(file);

    // Güvenli dosya adı oluştur (PDF uzantısı yoksa ekle)
    let originalFileName =
      customFileName?.trim() || file.originalname || 'document.pdf';
    if (!originalFileName.toLowerCase().endsWith('.pdf')) {
      originalFileName += '.pdf';
    }
    const secureFileName = this.fileStorageService.generateSecureFileName(
      originalFileName,
      file.buffer,
    );

    // Staging'e kaydet
    const stagingPath = this.fileStorageService.saveToStaging(
      file.buffer,
      secureFileName,
    );

    // Veritabanına kaydet - TevkifatFile tablosuna ekleme
    const document = await this.prisma.tevkifatFile.create({
      data: {
        tevkifatCenterId,
        tevkifatTitleId: tevkifatTitleId || null,
        totalAmount: 0, // Evrak için tutar sıfır
        memberCount: 0, // Evrak için üye sayısı sıfır
        month: month || new Date().getMonth() + 1,
        year: year || new Date().getFullYear(),
        fileName: originalFileName,
        fileUrl: stagingPath, // Staging path
        fileSize: file.size,
        status: ApprovalStatus.APPROVED, // Evraklar otomatik onaylı
        uploadedBy: uploadedBy || 'system',
      },
      include: {
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
        uploadedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(
      `Tevkifat merkezi evrakı yüklendi: ${document.id} - ${originalFileName} (Ay: ${month || 'mevcut'}, Yıl: ${year || 'mevcut'})`,
    );

    return document;
  }

  /**
   * Tevkifat dosyası/evrakı indir
   */
  async downloadTevkifatFile(fileId: string, res: Response): Promise<void> {
    const tevkifatFile = await this.prisma.tevkifatFile.findUnique({
      where: { id: fileId },
      select: { id: true, fileName: true, fileUrl: true },
    });

    if (!tevkifatFile) {
      throw new NotFoundException('Tevkifat dosyası bulunamadı');
    }

    const filePath = tevkifatFile.fileUrl;
    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException('Dosya bulunamadı');
    }

    const fileName = tevkifatFile.fileName || 'document.pdf';
    const asciiFileName = fileName
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/[^\x00-\x7F]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFileName}"`,
    );
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  /**
   * Avans oluştur (isteğe bağlı PDF: `documentUrl` önce upload endpoint ile alınır)
   */
  async createAdvance(dto: CreateAdvanceDto, createdBy: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      select: {
        id: true,
        registrationNumber: true,
        status: true,
        isActive: true,
        deletedAt: true,
        provinceId: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    if (
      (member.status !== MemberStatus.ACTIVE &&
        member.status !== MemberStatus.APPROVED) ||
      !member.isActive ||
      member.deletedAt
    ) {
      throw new BadRequestException(
        'Aktif veya onaylanmış olmayan üye için avans kaydedilemez',
      );
    }

    const advanceDate = dto.advanceDate
      ? new Date(dto.advanceDate)
      : new Date();

    const docUrlRaw = dto.documentUrl?.trim();
    const safeDocUrl = docUrlRaw ? this.assertSafeAdvanceDocumentUrl(docUrlRaw) : null;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.memberAdvance.create({
        data: {
          memberId: dto.memberId,
          registrationNumber: member.registrationNumber,
          advanceDate,
          month: dto.month,
          year: dto.year,
          amount: dto.amount,
          description: dto.description || null,
          createdByUserId: createdBy,
          documentUrl: safeDocUrl,
        },
      });

      if (safeDocUrl) {
        const md = await this.createAdvanceLinkedMemberDocument(tx, {
          memberId: dto.memberId,
          documentUrl: safeDocUrl,
          generatedBy: createdBy,
        });
        await tx.memberAdvance.update({
          where: { id: created.id },
          data: { linkedMemberDocumentId: md.id },
        });
      }

      return tx.memberAdvance.findUniqueOrThrow({
        where: { id: created.id },
        include: this.advanceDefaultInclude(),
      });
    });
  }

  /**
   * Avansları listele (filtre + arama)
   */
  async listAdvances(filters?: {
    search?: string;
    year?: number;
    month?: number;
    provinceId?: string;
  }) {
    const where: any = {
      deletedAt: null,
    };

    if (filters?.year) {
      where.year = filters.year;
    }

    if (filters?.month) {
      where.month = filters.month;
    }

    const memberWhere: any = {};

    if (filters?.provinceId) {
      memberWhere.provinceId = filters.provinceId;
    }

    if (filters?.search) {
      const search = filters.search.trim();
      memberWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        {
          registrationNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (Object.keys(memberWhere).length > 0) {
      where.member = memberWhere;
    }

    try {
      return await this.prisma.memberAdvance.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              registrationNumber: true,
              province: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { advanceDate: 'desc' },
        ],
      });
    } catch (error: any) {
      // Eğer MemberAdvance tablosu henüz migrate edilmemişse, boş liste döndür
      if (error.code === 'P2021' || error.message?.includes('MemberAdvance')) {
        this.logger.warn(
          'MemberAdvance tablosu bulunamadı, avans listesi boş döndürülüyor.',
        );
        return [];
      }
      throw error;
    }
  }

  /**
   * Avans detayı
   */
  async getAdvanceById(id: string) {
    const advance = await this.prisma.memberAdvance.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
            province: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!advance) {
      throw new NotFoundException('Avans kaydı bulunamadı');
    }

    return advance;
  }

  /**
   * Avans güncelle (PDF: yeni `documentUrl` veya `clearDocument`)
   */
  async updateAdvance(id: string, dto: UpdateAdvanceDto, updatedByUserId: string) {
    const advance = await this.prisma.memberAdvance.findUnique({
      where: { id },
    });

    if (!advance || advance.deletedAt) {
      throw new NotFoundException('Avans kaydı bulunamadı');
    }

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.MemberAdvanceUncheckedUpdateInput = {};

      if (dto.advanceDate) {
        data.advanceDate = new Date(dto.advanceDate);
      }
      if (dto.month !== undefined) {
        data.month = dto.month;
      }
      if (dto.year !== undefined) {
        data.year = dto.year;
      }
      if (dto.amount !== undefined) {
        data.amount = dto.amount;
      }
      if (dto.description !== undefined) {
        data.description = dto.description;
      }

      const newDoc = dto.documentUrl?.trim();
      if (newDoc) {
        const safeUrl = this.assertSafeAdvanceDocumentUrl(newDoc);
        await this.removeAdvanceLinkedDocument(tx, advance);
        const md = await this.createAdvanceLinkedMemberDocument(tx, {
          memberId: advance.memberId,
          documentUrl: safeUrl,
          generatedBy: updatedByUserId,
        });
        data.documentUrl = safeUrl;
        data.linkedMemberDocumentId = md.id;
      } else if (dto.clearDocument) {
        await this.removeAdvanceLinkedDocument(tx, advance);
        data.documentUrl = null;
        data.linkedMemberDocumentId = null;
      }

      if (Object.keys(data).length > 0) {
        await tx.memberAdvance.update({
          where: { id },
          data,
        });
      }

      return tx.memberAdvance.findUniqueOrThrow({
        where: { id },
        include: this.advanceDefaultInclude(),
      });
    });
  }

  /**
   * Avansı sil (soft delete) — bağlı üye dokümanı ve dosya kaldırılır
   */
  async deleteAdvance(id: string) {
    const advance = await this.prisma.memberAdvance.findUnique({
      where: { id },
    });

    if (!advance || advance.deletedAt) {
      throw new NotFoundException('Avans kaydı bulunamadı');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.removeAdvanceLinkedDocument(tx, advance);
      await tx.memberAdvance.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          documentUrl: null,
          linkedMemberDocumentId: null,
        },
      });
    });

    return { success: true };
  }

  /**
   * Avans evrakı yükle (Kesinti PDF yükleme ile aynı mantık)
   */
  async uploadAdvanceDocument(
    file: Express.Multer.File,
    memberId: string,
    month: number,
    year: number,
    customFileName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenmedi');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Sadece PDF dosyaları kabul edilir');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        registrationNumber: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'advances');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let fileName: string;

    if (customFileName && customFileName.trim()) {
      const cleanedName = customFileName
        .trim()
        .replace(/[^a-zA-Z0-9_\-ğüşıöçĞÜŞİÖÇ\s\.]/g, '')
        .replace(/\s+/g, '_');
      const hasExtension = path.extname(cleanedName);
      fileName = hasExtension ? cleanedName : `${cleanedName}.pdf`;
    } else {
      const monthNames = [
        'Ocak',
        'Subat',
        'Mart',
        'Nisan',
        'Mayis',
        'Haziran',
        'Temmuz',
        'Agustos',
        'Eylul',
        'Ekim',
        'Kasim',
        'Aralik',
      ];
      const monthName = monthNames[month - 1] || `Ay${month}`;
      const memberName = `${member.firstName}_${member.lastName}`
        .replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const timestamp = Date.now();
      fileName = `Avans_${memberName}_${monthName}${year}_${dateStr}_${timestamp}.pdf`;
    }

    const filePath = path.join(uploadsDir, fileName);
    const fileUrl = `/uploads/advances/${fileName}`;
    fs.writeFileSync(filePath, file.buffer);

    return {
      fileUrl,
      fileName,
    };
  }

  /**
   * Avans belgesi görüntüle (inline)
   */
  async viewAdvanceDocument(advanceId: string, res: Response): Promise<void> {
    const advance = await this.prisma.memberAdvance.findFirst({
      where: { id: advanceId, deletedAt: null },
      select: { id: true, documentUrl: true, memberId: true },
    });

    if (!advance) {
      throw new NotFoundException(`Avans kaydı bulunamadı: ${advanceId}`);
    }

    let filePath: string;
    let fileName: string;

    if (advance.documentUrl) {
      fileName =
        advance.documentUrl.split('/').pop() || 'avans-belgesi.pdf';
      filePath = path.join(process.cwd(), 'uploads', 'advances', fileName);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`Dosya bulunamadı: ${fileName}`);
      }
    } else {
      throw new NotFoundException('Bu avans için belge bulunamadı');
    }

    res.setHeader('Content-Type', 'application/pdf');
    const asciiFileName = fileName
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/[^\x00-\x7F]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeAsciiFileName = asciiFileName.replace(/"/g, '').replace(/;/g, '_');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeAsciiFileName}"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    return new Promise<void>((resolve, reject) => {
      fileStream.on('end', () => resolve());
      fileStream.on('error', (error) => reject(error));
    });
  }

  /**
   * Avans belgesi indir
   */
  async downloadAdvanceDocument(advanceId: string, res: Response): Promise<void> {
    const advance = await this.prisma.memberAdvance.findFirst({
      where: { id: advanceId, deletedAt: null },
      select: { id: true, documentUrl: true },
    });

    if (!advance) {
      throw new NotFoundException(`Avans kaydı bulunamadı: ${advanceId}`);
    }

    if (!advance.documentUrl) {
      throw new NotFoundException('Bu avans için belge bulunamadı');
    }

    const fileName =
      advance.documentUrl.split('/').pop() || 'avans-belgesi.pdf';
    const filePath = path.join(process.cwd(), 'uploads', 'advances', fileName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Dosya bulunamadı: ${fileName}`);
    }

    res.setHeader('Content-Type', 'application/pdf');
    const asciiFileName = fileName
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/[^\x00-\x7F]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeAsciiFileName = asciiFileName.replace(/"/g, '').replace(/;/g, '_');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeAsciiFileName}"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    return new Promise<void>((resolve, reject) => {
      fileStream.on('end', () => resolve());
      fileStream.on('error', (error) => reject(error));
    });
  }

  private advanceDefaultInclude(): Prisma.MemberAdvanceInclude {
    return {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          registrationNumber: true,
          province: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    };
  }

  private assertSafeAdvanceDocumentUrl(url: string): string {
    const normalized = (url.startsWith('/') ? url : `/${url}`).replace(
      /\\/g,
      '/',
    );
    const parts = normalized.split('/').filter(Boolean);
    if (
      parts.length !== 3 ||
      parts[0] !== 'uploads' ||
      parts[1] !== 'advances'
    ) {
      throw new BadRequestException('Geçersiz avans belgesi yolu');
    }
    const base = parts[2];
    if (!base || !base.toLowerCase().endsWith('.pdf') || base.includes('..')) {
      throw new BadRequestException('Geçersiz dosya adı');
    }
    return `/${parts.join('/')}`;
  }

  private async createAdvanceLinkedMemberDocument(
    tx: Prisma.TransactionClient,
    params: { memberId: string; documentUrl: string; generatedBy: string },
  ) {
    const safeUrl = this.assertSafeAdvanceDocumentUrl(params.documentUrl);
    const fileName = path.basename(safeUrl);
    const diskPath = path.join(process.cwd(), 'uploads', 'advances', fileName);
    if (!fs.existsSync(diskPath)) {
      throw new BadRequestException(
        'Yüklenen avans belgesi bulunamadı. Önce dosyayı yükleyin.',
      );
    }
    const stat = fs.statSync(diskPath);
    return tx.memberDocument.create({
      data: {
        memberId: params.memberId,
        templateId: null,
        documentType: 'ADVANCE_DOCUMENT',
        fileName,
        fileUrl: safeUrl,
        secureFileName: fileName,
        fileSize: stat.size,
        mimeType: 'application/pdf',
        uploadStatus: DocumentUploadStatus.APPROVED,
        stagingPath: null,
        permanentPath: diskPath,
        generatedBy: params.generatedBy,
      },
    });
  }

  private async removeAdvanceLinkedDocument(
    tx: Prisma.TransactionClient,
    advance: {
      id: string;
      linkedMemberDocumentId: string | null;
      documentUrl: string | null;
    },
  ) {
    if (!advance.linkedMemberDocumentId) {
      return;
    }
    const doc = await tx.memberDocument.findFirst({
      where: {
        id: advance.linkedMemberDocumentId,
        deletedAt: null,
      },
    });
    if (!doc) {
      return;
    }
    if (doc.permanentPath) {
      this.fileStorageService.deleteFileUnderUploadsRoot(doc.permanentPath);
    }
    await tx.memberDocument.update({
      where: { id: doc.id },
      data: { deletedAt: new Date() },
    });
  }
}
