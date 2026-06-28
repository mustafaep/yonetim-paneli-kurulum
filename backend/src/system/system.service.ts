import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '../config/config.service';
import { CreateSystemSettingDto, UpdateSystemSettingDto } from './dto';
import { SystemSettingCategory } from '@prisma/client';
import { MemberScopeService } from '../members/member-scope.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

// Bu anahtarlar .env üzerinden yönetilir. DB'de tutulmaz, API üzerinden okunmaz/yazılmaz.
const SENSITIVE_SETTING_KEYS = new Set<string>([
  'SMS_NETGSM_USERNAME',
  'SMS_NETGSM_PASSWORD',
  'SMS_NETGSM_MSG_HEADER',
  'SMS_NETGSM_API_URL',
  'EMAIL_AWS_ACCESS_KEY_ID',
  'EMAIL_AWS_SECRET_ACCESS_KEY',
  'EMAIL_AWS_REGION',
  'EMAIL_FROM_ADDRESS',
]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_SETTING_KEYS.has(key);
}

function stripSensitive<T extends { key: string; value: string | null }>(
  setting: T,
): T {
  if (isSensitiveKey(setting.key)) {
    return { ...setting, value: '' };
  }
  return setting;
}

@Injectable()
export class SystemService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ConfigService))
    private configService: ConfigService,
    private memberScopeService: MemberScopeService,
  ) {}

  // Public Info - Logo ve sistem adı için (login sayfasında kullanılır)
  async getPublicInfo() {
    const [siteName, siteLogo] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'SITE_NAME' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'SITE_LOGO_URL' } }),
    ]);

    return {
      siteName: siteName?.value || 'Sendika Yönetim Paneli',
      siteLogoUrl: siteLogo?.value || '',
    };
  }

  // System Settings
  async getSettings(category?: SystemSettingCategory) {
    const settings = await this.prisma.systemSetting.findMany({
      where: category ? { category } : undefined,
      orderBy: { category: 'asc' },
    });
    // Hassas ayarların değerini asla dışarı sızdırma
    return settings.map(stripSensitive);
  }

  async getSetting(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException('Ayar bulunamadı');
    }

    return stripSensitive(setting);
  }

  async createSetting(dto: CreateSystemSettingDto, userId: string) {
    if (isSensitiveKey(dto.key)) {
      throw new BadRequestException(
        'Bu ayar .env dosyası üzerinden yönetilir, sistem ayarlarından değiştirilemez.',
      );
    }

    const created = await this.prisma.systemSetting.create({
      data: {
        ...dto,
        updatedBy: userId,
      },
    });

    // ConfigService cache'ini invalidate et
    await this.configService.invalidateSettingsCache(dto.key);

    return created;
  }

  async updateSetting(
    key: string,
    dto: UpdateSystemSettingDto,
    userId: string,
  ) {
    if (isSensitiveKey(key)) {
      throw new BadRequestException(
        'Bu ayar .env dosyası üzerinden yönetilir, sistem ayarlarından değiştirilemez.',
      );
    }

    // Önce ayarın var olup olmadığını kontrol et
    const existingSetting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    let updated;
    let oldValue: string | undefined;
    let oldCategory: SystemSettingCategory | undefined;

    if (existingSetting) {
      // Ayar varsa güncelle
      oldValue = existingSetting.value;
      oldCategory = existingSetting.category;

      updated = await this.prisma.systemSetting.update({
        where: { key },
        data: {
          ...dto,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });
    } else {
      // Ayar yoksa oluştur (upsert mantığı)
      // Varsayılan değerler
      const defaultCategory = SystemSettingCategory.GENERAL;
      const defaultDescription = `Sistem ayarı: ${key}`;

      updated = await this.prisma.systemSetting.create({
        data: {
          key,
          value: dto.value || '',
          description: dto.description || defaultDescription,
          category: dto.category || defaultCategory,
          isEditable: dto.isEditable !== undefined ? dto.isEditable : true,
          updatedBy: userId,
        },
      });

      oldValue = undefined;
      oldCategory = defaultCategory;
    }

    // ConfigService cache'ini invalidate et
    await this.configService.invalidateSettingsCache(key);

    // Audit log oluştur
    try {
      await this.createLog({
        action: existingSetting ? 'SETTING_UPDATE' : 'SETTING_CREATE',
        entityType: 'SYSTEM_SETTING',
        entityId: key,
        userId,
        details: {
          key,
          category: oldCategory || updated.category,
          oldValue: oldValue,
          newValue: updated.value,
          description: updated.description,
        },
      });
    } catch (error) {
      // Log kaydı başarısız olsa bile işlemi durdurma
      console.error('Ayar değişikliği log kaydı oluşturulamadı:', error);
    }

    return updated;
  }

  async deleteSetting(key: string) {
    await this.getSetting(key);
    return this.prisma.systemSetting.delete({ where: { key } });
  }

  // System Logs
  async getLogs(params?: {
    limit?: number;
    offset?: number;
    userId?: string;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    user?: CurrentUserData; // Scope filtreleme için
  }) {
    const {
      limit = 25,
      offset = 0,
      userId,
      entityType,
      action,
      startDate,
      endDate,
      user,
    } = params || {};

    const where: any = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    // Tarih filtreleri
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Bitiş tarihini günün sonuna kadar almak için
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Scope bazlı filtreleme: LOG_VIEW_OWN_SCOPE izni varsa ve LOG_VIEW_ALL yoksa
    const hasViewAll = user?.permissions?.includes('LOG_VIEW_ALL' as any);
    const hasViewOwnScope = user?.permissions?.includes(
      'LOG_VIEW_OWN_SCOPE' as any,
    );

    if (user && hasViewOwnScope && !hasViewAll) {
      // Kullanıcının scope'unu al
      const scopeIds = await this.memberScopeService.getUserScopeIds(user);

      if (scopeIds.provinceId || scopeIds.districtId) {
        // Scope'a göre filtreleme yapılacak entity ID'lerini topla
        const scopeEntityIds = await this.getEntityIdsByScope(
          scopeIds,
          entityType,
        );

        if (scopeEntityIds.length > 0) {
          // Scope'daki entity'lerle ilgili logları göster
          where.OR = [
            { userId: user.userId }, // Kullanıcının kendi işlemleri
            { entityId: { in: scopeEntityIds } }, // Scope'daki entity'lerle ilgili loglar
          ];
        } else {
          // Scope'da entity yoksa sadece kullanıcının kendi loglarını göster
          where.userId = user.userId;
        }
      } else {
        // Scope yoksa sadece kullanıcının kendi loglarını göster
        where.userId = user.userId;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return {
      logs,
      total,
    };
  }

  // Scope'a göre entity ID'lerini getir (performans için sadece önemli entity type'lar için)
  private async getEntityIdsByScope(
    scopeIds: { provinceId?: string; districtId?: string },
    entityType?: string,
  ): Promise<string[]> {
    const entityIds: string[] = [];

    if (!scopeIds.provinceId && !scopeIds.districtId) {
      return entityIds;
    }

    // MEMBER entity type için
    if (!entityType || entityType === 'MEMBER') {
      const memberWhere: any = {};
      if (scopeIds.districtId) {
        memberWhere.districtId = scopeIds.districtId;
      } else if (scopeIds.provinceId) {
        memberWhere.provinceId = scopeIds.provinceId;
      }

      const members = await this.prisma.member.findMany({
        where: memberWhere,
        select: { id: true },
      });
      entityIds.push(...members.map((m) => m.id));
    }

    // BRANCH entity type için
    if (!entityType || entityType === 'BRANCH') {
      const branchWhere: any = {};
      if (scopeIds.districtId) {
        branchWhere.districtId = scopeIds.districtId;
      } else if (scopeIds.provinceId) {
        branchWhere.provinceId = scopeIds.provinceId;
      }

      const branches = await this.prisma.branch.findMany({
        where: branchWhere,
        select: { id: true },
      });
      entityIds.push(...branches.map((b) => b.id));
    }

    // INSTITUTION entity type için
    if (!entityType || entityType === 'INSTITUTION') {
      const institutionWhere: any = { deletedAt: null };
      if (scopeIds.districtId) {
        institutionWhere.districtId = scopeIds.districtId;
      } else if (scopeIds.provinceId) {
        institutionWhere.OR = [
          { provinceId: scopeIds.provinceId },
          { district: { provinceId: scopeIds.provinceId } },
        ];
      }

      const institutions = await this.prisma.institution.findMany({
        where: institutionWhere,
        select: { id: true },
      });
      entityIds.push(...institutions.map((i) => i.id));
    }

    return entityIds;
  }

  async getLogById(id: string, user?: CurrentUserData) {
    const log = await this.prisma.systemLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Log bulunamadı');
    }

    // Scope kontrolü için helper metod
    if (user) {
      const hasViewAll = user.permissions?.includes('LOG_VIEW_ALL' as any);
      const hasViewOwnScope = user.permissions?.includes(
        'LOG_VIEW_OWN_SCOPE' as any,
      );

      if (hasViewOwnScope && !hasViewAll) {
        // Kendi logu değilse scope kontrolü yap
        if (log.userId !== user.userId) {
          const scopeIds = await this.memberScopeService.getUserScopeIds(user);
          const hasAccess = await this.checkLogAccessByScope(log, scopeIds);

          if (!hasAccess) {
            throw new NotFoundException('Log bulunamadı');
          }
        }
      }
    }

    return log;
  }

  // Log'un scope'a erişim kontrolü
  private async checkLogAccessByScope(
    log: { entityType: string; entityId?: string | null },
    scopeIds: { provinceId?: string; districtId?: string },
  ): Promise<boolean> {
    if (!log.entityId || !log.entityType) {
      return false;
    }

    // MEMBER entity type için
    if (log.entityType === 'MEMBER') {
      const member = await this.prisma.member.findUnique({
        where: { id: log.entityId },
        select: { provinceId: true, districtId: true },
      });

      if (!member) return false;

      if (scopeIds.districtId) {
        return member.districtId === scopeIds.districtId;
      }
      if (scopeIds.provinceId) {
        return member.provinceId === scopeIds.provinceId;
      }
    }

    // BRANCH entity type için
    if (log.entityType === 'BRANCH') {
      const branch = await this.prisma.branch.findUnique({
        where: { id: log.entityId },
        select: { provinceId: true, districtId: true },
      });

      if (!branch) return false;

      if (scopeIds.districtId) {
        return branch.districtId === scopeIds.districtId;
      }
      if (scopeIds.provinceId) {
        return branch.provinceId === scopeIds.provinceId;
      }
    }

    // INSTITUTION entity type için
    if (log.entityType === 'INSTITUTION') {
      const institution = await this.prisma.institution.findFirst({
        where: {
          id: log.entityId,
          deletedAt: null,
        },
        select: { provinceId: true, districtId: true },
      });

      if (!institution) return false;

      if (scopeIds.districtId) {
        return institution.districtId === scopeIds.districtId;
      }
      if (scopeIds.provinceId) {
        return institution.provinceId === scopeIds.provinceId;
      }
    }

    return false;
  }

  async createLog(data: {
    action: string;
    entityType: string;
    entityId?: string;
    userId?: string; // Nullable - başarısız login gibi durumlar için
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.systemLog.create({
      data,
    });
  }
}
