/**
 * PanelUserApplication Application Service
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { PanelUserApplicationRepository } from '../../domain/repositories/panel-user-application.repository.interface';
import {
  PanelUserApplication,
  PanelUserApplicationStatus,
} from '../../domain/entities/panel-user-application.entity';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../../../users/users.service';

@Injectable()
export class PanelUserApplicationApplicationService {
  constructor(
    @Inject('PanelUserApplicationRepository')
    private readonly repository: PanelUserApplicationRepository,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createApplication(data: {
    memberId: string;
    requestedRoleId: string;
    requestNote?: string | null;
    scopes?: Array<{ provinceId?: string; districtId?: string }>;
    requestedByUserId: string;
  }): Promise<PanelUserApplication> {
    // Check if member already has an application
    const existing = await this.repository.findByMemberId(data.memberId);
    if (
      existing &&
      (existing.status === PanelUserApplicationStatus.PENDING ||
        existing.status === PanelUserApplicationStatus.APPROVED)
    ) {
      throw new ConflictException('Bu üye için zaten bir başvuru mevcut');
    }

    // Check if member already has a user
    const member = await this.prisma.member.findUnique({
      where: { id: data.memberId },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    if (member.userId) {
      throw new ConflictException('Bu üye zaten panel kullanıcısı');
    }

    // Check role exists
    const role = await this.prisma.customRole.findUnique({
      where: { id: data.requestedRoleId },
    });

    if (!role) {
      throw new NotFoundException('Seçilen rol bulunamadı');
    }

    if (role.name.toUpperCase() === 'ADMIN') {
      throw new BadRequestException(
        'ADMIN rolü panel terfi başvurusu ile seçilemez.',
      );
    }

    // Validate scopes if role requires them
    if (role.hasScopeRestriction) {
      if (!data.scopes || data.scopes.length === 0) {
        throw new BadRequestException(
          'Bu rol için yetki alanı seçimi zorunludur.',
        );
      }

      for (const scope of data.scopes) {
        if (!scope.provinceId && !scope.districtId) {
          throw new BadRequestException(
            'Her yetki alanı için en az bir il veya ilçe seçmelisiniz.',
          );
        }

        if (scope.districtId && !scope.provinceId) {
          throw new BadRequestException(
            'İlçe seçmek için önce il seçmelisiniz.',
          );
        }

        if (scope.districtId && scope.provinceId) {
          const district = await this.prisma.district.findUnique({
            where: { id: scope.districtId },
          });
          if (district && district.provinceId !== scope.provinceId) {
            throw new BadRequestException(
              'Seçilen ilçe, seçilen ile ait değil.',
            );
          }
        }
      }
    }

    const application = PanelUserApplication.create({
      memberId: data.memberId,
      requestedRoleId: data.requestedRoleId,
      requestNote: data.requestNote,
    });

    const created = await this.repository.create(application);

    // Create scopes if provided
    if (data.scopes && data.scopes.length > 0) {
      const validScopes = data.scopes.filter(
        (s) => s.provinceId || s.districtId,
      );
      const uniqueScopes = Array.from(
        new Map(
          validScopes.map((scope) => [
            `${scope.provinceId || 'null'}-${scope.districtId || 'null'}`,
            scope,
          ]),
        ).values(),
      );

      await this.prisma.panelUserApplicationScope.createMany({
        data: uniqueScopes.map((scope) => ({
          applicationId: created.id,
          provinceId: scope.provinceId || null,
          districtId: scope.districtId || null,
        })),
      });
    }

    return created;
  }

  async approveApplication(
    id: string,
    data: {
      email: string;
      password: string;
      reviewNote?: string | null;
      scopes?: Array<{ provinceId?: string; districtId?: string }>;
    },
    reviewedByUserId: string,
  ): Promise<PanelUserApplication> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException('Başvuru bulunamadı');
    }

    if (application.status !== PanelUserApplicationStatus.PENDING) {
      throw new BadRequestException('Bu başvuru zaten işleme alınmış');
    }

    // Check email uniqueness (yumuşak silinmiş kullanıcılar aynı e-postayı tekrar kullanabilsin)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictException('Bu email adresi zaten kullanılıyor');
    }

    // Get member and role
    const member = await this.prisma.member.findUnique({
      where: { id: application.memberId },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    const role = await this.prisma.customRole.findUnique({
      where: { id: application.requestedRoleId },
    });

    if (!role) {
      throw new NotFoundException('Rol bulunamadı');
    }

    // Determine scopes to use
    let scopesToUse = data.scopes;
    if (role.hasScopeRestriction) {
      if (data.scopes && data.scopes.length > 0) {
        scopesToUse = data.scopes;
      } else {
        // Get scopes from application
        const appScopes = await this.prisma.panelUserApplicationScope.findMany({
          where: {
            applicationId: id,
            deletedAt: null,
          },
        });
        scopesToUse = appScopes.map((s) => ({
          provinceId: s.provinceId ?? undefined,
          districtId: s.districtId ?? undefined,
        }));
      }

      if (!scopesToUse || scopesToUse.length === 0) {
        throw new BadRequestException(
          'Bu rol için yetki alanı seçimi zorunludur.',
        );
      }
    }

    // Create user
    const newUser = await this.usersService.create(
      {
        email: data.email,
        password: data.password,
        firstName: member.firstName,
        lastName: member.lastName,
        customRoleIds: [application.requestedRoleId],
        scopes: scopesToUse,
      },
      application.memberId,
    );

    if (!newUser) {
      throw new Error('User creation failed');
    }

    // Update application scopes if admin changed them
    if (data.scopes && data.scopes.length > 0 && role.hasScopeRestriction) {
      await this.prisma.panelUserApplicationScope.updateMany({
        where: {
          applicationId: id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      await this.prisma.panelUserApplicationScope.createMany({
        data: data.scopes.map((scope) => ({
          applicationId: id,
          provinceId: scope.provinceId || null,
          districtId: scope.districtId || null,
        })),
      });
    }

    // Approve application
    application.approve(reviewedByUserId, data.reviewNote, newUser.id);
    await this.repository.save(application);

    return application;
  }

  async directPromote(data: {
    memberId: string;
    requestedRoleId: string;
    email: string;
    password: string;
    note?: string | null;
    scopes?: Array<{ provinceId?: string; districtId?: string }>;
    reviewedByUserId: string;
  }): Promise<{ userId: string; email: string; firstName: string; lastName: string }> {
    // Üye kontrolü
    const member = await this.prisma.member.findUnique({
      where: { id: data.memberId },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('Sadece aktif üyeler panel kullanıcısına terfi ettirilebilir.');
    }

    if (member.userId) {
      throw new ConflictException('Bu üye zaten panel kullanıcısına bağlı.');
    }

    // Mevcut başvuru kontrolü (PENDING veya APPROVED)
    const existing = await this.repository.findByMemberId(data.memberId);
    if (
      existing &&
      (existing.status === PanelUserApplicationStatus.PENDING ||
        existing.status === PanelUserApplicationStatus.APPROVED)
    ) {
      throw new ConflictException('Bu üye için zaten bir başvuru veya panel kullanıcısı mevcut.');
    }

    // Rol kontrolü
    const role = await this.prisma.customRole.findUnique({
      where: { id: data.requestedRoleId },
    });

    if (!role) {
      throw new NotFoundException('Seçilen rol bulunamadı');
    }

    if (role.name.toUpperCase() === 'ADMIN') {
      throw new BadRequestException('ADMIN rolü bu işlem ile seçilemez.');
    }

    // Scope validasyonu
    if (role.hasScopeRestriction) {
      if (!data.scopes || data.scopes.length === 0) {
        throw new BadRequestException('Bu rol için yetki alanı seçimi zorunludur.');
      }

      for (const scope of data.scopes) {
        if (!scope.provinceId && !scope.districtId) {
          throw new BadRequestException('Her yetki alanı için en az bir il veya ilçe seçmelisiniz.');
        }
        if (scope.districtId && !scope.provinceId) {
          throw new BadRequestException('İlçe seçmek için önce il seçmelisiniz.');
        }
        if (scope.districtId && scope.provinceId) {
          const district = await this.prisma.district.findUnique({
            where: { id: scope.districtId },
          });
          if (district && district.provinceId !== scope.provinceId) {
            throw new BadRequestException('Seçilen ilçe, seçilen ile ait değil.');
          }
        }
      }
    }

    // Email benzersizlik kontrolü
    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existingUser) {
      throw new ConflictException('Bu email adresi zaten kullanılıyor.');
    }

    // Kullanıcı oluştur
    const scopesToUse = role.hasScopeRestriction ? data.scopes : undefined;
    const newUser = await this.usersService.create(
      {
        email: data.email,
        password: data.password,
        firstName: member.firstName,
        lastName: member.lastName,
        customRoleIds: [data.requestedRoleId],
        scopes: scopesToUse,
      },
      data.memberId,
    );

    if (!newUser) {
      throw new Error('Kullanıcı oluşturma başarısız oldu');
    }

    // Denetim kaydı için PanelUserApplication kaydı oluştur (APPROVED olarak)
    await this.prisma.panelUserApplication.create({
      data: {
        memberId: data.memberId,
        requestedRoleId: data.requestedRoleId,
        status: 'APPROVED',
        requestNote: data.note || null,
        reviewedBy: data.reviewedByUserId,
        reviewedAt: new Date(),
        reviewNote: data.note || null,
        createdUserId: newUser.id,
      },
    });

    return {
      userId: newUser.id,
      email: newUser.email,
      firstName: member.firstName,
      lastName: member.lastName,
    };
  }

  async rejectApplication(
    id: string,
    reviewNote: string | null,
    reviewedByUserId: string,
  ): Promise<PanelUserApplication> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException('Başvuru bulunamadı');
    }

    if (application.status !== PanelUserApplicationStatus.PENDING) {
      throw new BadRequestException('Bu başvuru zaten işleme alınmış');
    }

    application.reject(reviewedByUserId, reviewNote);
    await this.repository.save(application);

    return application;
  }

  async findAll(
    status?: PanelUserApplicationStatus,
  ): Promise<PanelUserApplication[]> {
    return await this.repository.findAll(status);
  }

  async findById(id: string): Promise<PanelUserApplication> {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException('Başvuru bulunamadı');
    }
    return application;
  }
}
