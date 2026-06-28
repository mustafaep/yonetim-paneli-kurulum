/**
 * Member Creation Application Service
 *
 * Use case: Member creation işlemini orchestrate eder
 *
 * Sorumluluklar:
 * - Transaction yönetimi
 * - Domain Service çağırma
 * - Cross-cutting concerns (history)
 * - Repository koordinasyonu
 * - Yeniden üyelik: iptal edilmiş kayda `previousCancelledMemberId` ile bağlı yeni Member satırı
 */
import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  Member,
  CreateMemberData,
  MemberSourceEnum,
  GenderEnum,
  EducationStatusEnum,
} from '../../domain/entities/member.entity';
import type { MemberRepository } from '../../domain/repositories/member.repository.interface';
import { MemberHistoryService } from '../../member-history.service';
import { MemberRegistrationDomainService } from '../../domain/services/member-registration-domain.service';
import { CreateMemberApplicationDto } from '../dto/create-member-application.dto';
import { MemberScopeService } from '../../member-scope.service';
import { WhatsAppTemplateService } from '../../../notifications/services/whatsapp-template.service';
import { SmsTemplateService } from '../../../notifications/services/sms-template.service';
import { EmailTemplateService } from '../../../notifications/services/email-template.service';
import { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { MemberSource } from '@prisma/client';
import { NationalId } from '../../domain/value-objects/national-id.vo';
import { MemberStatus } from '../../domain/value-objects/member-status.vo';

export interface CreateMemberCommand {
  dto: CreateMemberApplicationDto;
  createdByUserId?: string;
  previousCancelledMemberId?: string;
  user?: CurrentUserData;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class MemberCreationApplicationService {
  private readonly logger = new Logger(MemberCreationApplicationService.name);

  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
    private readonly memberHistoryService: MemberHistoryService,
    private readonly registrationDomainService: MemberRegistrationDomainService,
    private readonly scopeService: MemberScopeService,
    private readonly whatsAppTemplateService: WhatsAppTemplateService,
    private readonly smsTemplateService: SmsTemplateService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  /**
   * Use case: Member başvurusu oluştur
   *
   * Orchestration:
   * 1. Source validation (Domain Service)
   * 2. Re-registration validation (Domain Service)
   * 3. Scope resolution
   * 4. Required fields validation (Domain Service)
   * 5. Registration number generation (Domain Service)
   * 6. Initial status determination (Domain Service)
   * 7. Entity oluştur
   * 8. Repository'ye kaydet
   * 9. History log
   */
  async createApplication(command: CreateMemberCommand): Promise<Member> {
    const {
      dto,
      createdByUserId,
      previousCancelledMemberId,
      user,
      ipAddress,
      userAgent,
    } = command;

    // 1. Source validation
    const source = (dto.source || MemberSource.DIRECT) as MemberSourceEnum;
    await this.registrationDomainService.validateSource(source);

    // 2. Re-registration validation
    const allowReRegistration =
      await this.registrationDomainService.configAdapter.getAllowReRegistration();
    if (!allowReRegistration && previousCancelledMemberId) {
      throw new BadRequestException(
        'Yeniden kayıt şu anda devre dışı bırakılmıştır',
      );
    }

    const nationalId = NationalId.create(dto.nationalId);
    if (!allowReRegistration && user) {
      await this.registrationDomainService.validateReRegistration(
        nationalId,
        allowReRegistration,
      );
    }

    // 3. Scope resolution
    let provinceId: string | undefined = undefined;
    let districtId: string | undefined = undefined;

    if (user) {
      const scopeIds = await this.scopeService.getUserScopeIds(user);

      if (scopeIds.provinceId) {
        provinceId = scopeIds.provinceId;
      } else if (dto.provinceId) {
        provinceId = dto.provinceId;
      }

      if (scopeIds.districtId) {
        districtId = scopeIds.districtId;
      } else if (dto.districtId) {
        districtId = dto.districtId;
      }

      // Scope validation
      if (
        scopeIds.provinceId &&
        dto.provinceId &&
        dto.provinceId !== scopeIds.provinceId
      ) {
        throw new BadRequestException('Seçilen il, yetkiniz dahilinde değil');
      }
      if (
        scopeIds.districtId &&
        dto.districtId &&
        dto.districtId !== scopeIds.districtId
      ) {
        throw new BadRequestException('Seçilen ilçe, yetkiniz dahilinde değil');
      }
    } else {
      provinceId = dto.provinceId;
      districtId = dto.districtId;
    }

    // 4. Basic validation (entity için her zaman gerekli alanlar – kurum, doğum tarihi, ikamet il/ilçe)
    if (!dto.institutionId) {
      throw new BadRequestException('Kurum seçimi zorunludur');
    }
    if (!dto.birthDate) {
      throw new BadRequestException('Doğum tarihi zorunludur');
    }

    const finalProvinceId = provinceId || dto.provinceId;
    const finalDistrictId = districtId || dto.districtId;
    if (!finalProvinceId) {
      throw new BadRequestException('İl seçimi zorunludur');
    }
    if (!finalDistrictId) {
      throw new BadRequestException('İlçe seçimi zorunludur');
    }

    // 5. Config-based validation (Domain Service)
    const createData: CreateMemberData = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      phone: dto.phone ?? '',
      email: dto.email,
      source,
      motherName: dto.motherName ?? '',
      fatherName: dto.fatherName ?? '',
      birthDate: dto.birthDate,
      birthplace: dto.birthplace ?? '',
      gender: (dto.gender as GenderEnum) || GenderEnum.OTHER,
      educationStatus:
        (dto.educationStatus as EducationStatusEnum) ||
        EducationStatusEnum.PRIMARY,
      institutionId: dto.institutionId,
      provinceId: finalProvinceId,
      districtId: finalDistrictId,
      dutyUnit: dto.dutyUnit,
      institutionAddress: dto.institutionAddress,
      institutionProvinceId: dto.institutionProvinceId,
      institutionDistrictId: dto.institutionDistrictId,
      professionId: dto.professionId,
      institutionRegNo: dto.institutionRegNo,
      staffTitleCode: dto.staffTitleCode,
      membershipInfoOptionId: dto.membershipInfoOptionId,
      memberGroupId: dto.memberGroupId,
      registrationNumber: dto.registrationNumber,
      boardDecisionDate: dto.boardDecisionDate,
      boardDecisionBookNo: dto.boardDecisionBookNo,
      tevkifatCenterId: dto.tevkifatCenterId,
      tevkifatTitleId: dto.tevkifatTitleId,
      branchId: dto.branchId,
      createdByUserId,
      previousCancelledMemberId,
    };

    await this.registrationDomainService.validateMinAge(dto.birthDate);
    await this.registrationDomainService.validateRequiredFields(createData);

    // 6. Registration number generation (Domain Service)
    if (!createData.registrationNumber) {
      createData.registrationNumber =
        (await this.registrationDomainService.generateRegistrationNumber()) ||
        undefined;
    }

    // 6b. Devam eden başvuru / üyelik (aynı TC ile ikinci açık kayıt yok)
    const blockingMember =
      await this.memberRepository.findBlockingMembershipByNationalId(
        nationalId,
      );
    if (blockingMember) {
      throw new BadRequestException(
        'Bu TC kimlik numarasına ait üye kaydı mevcuttur. Yeniden üyelik için önceki üyeliğin iptal edilmiş olması gerekir.',
      );
    }

    const latestCancelled =
      await this.memberRepository.findCancelledByNationalId(nationalId);
    if (latestCancelled && !allowReRegistration) {
      throw new BadRequestException(
        'Bu TC kimlik numarasına ait iptal edilmiş üye bulunmaktadır ve yeniden kayıt şu anda kapalıdır.',
      );
    }

    const cancelledStatuses = ['RESIGNED', 'EXPELLED', 'INACTIVE'];
    let resolvedPreviousId: string | undefined;

    if (previousCancelledMemberId) {
      if (!allowReRegistration) {
        throw new BadRequestException(
          'Yeniden kayıt şu anda devre dışı bırakılmıştır',
        );
      }
      const prev = await this.memberRepository.findById(
        previousCancelledMemberId,
      );
      if (!prev) {
        throw new BadRequestException('Belirtilen önceki üye kaydı bulunamadı.');
      }
      if (prev.nationalId.getValue() !== nationalId.getValue()) {
        throw new BadRequestException(
          'Önceki üye kaydı ile TC kimlik numarası eşleşmiyor.',
        );
      }
      if (!cancelledStatuses.includes(prev.status.toString())) {
        throw new BadRequestException(
          'Yeniden üyelik yalnızca istifa, ihraç veya pasif kayıtlar için yapılabilir.',
        );
      }
      resolvedPreviousId = previousCancelledMemberId;
    } else if (latestCancelled && allowReRegistration) {
      resolvedPreviousId = latestCancelled.id;
    }

    if (resolvedPreviousId) {
      createData.previousCancelledMemberId = resolvedPreviousId;
    }

    return this.persistNewMemberApplication(
      createData,
      createdByUserId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Yeni Member satırı (ilk başvuru veya iptal sonrası yeniden kayıt).
   */
  private async persistNewMemberApplication(
    createData: CreateMemberData,
    createdByUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Member> {
    const defaultStatus =
      await this.registrationDomainService.configAdapter.getDefaultStatus();
    const autoApprove =
      await this.registrationDomainService.configAdapter.getAutoApprove();
    const requireApproval =
      await this.registrationDomainService.configAdapter.getRequireApproval();
    const statusInfo =
      await this.registrationDomainService.determineInitialStatus(
        defaultStatus,
        autoApprove,
        requireApproval,
      );

    const member = Member.create(createData);

    if (statusInfo.status !== 'PENDING') {
      (member as any)._status = MemberStatus.fromString(statusInfo.status);
    }
    if (autoApprove && createdByUserId) {
      (member as any)._approvedByUserId = createdByUserId;
      (member as any)._approvedAt = new Date();
    }

    const savedMember = await this.memberRepository.create(member);

    const memberData: Record<string, any> = {
      firstName: savedMember.firstName,
      lastName: savedMember.lastName,
      nationalId: savedMember.nationalId.getValue(),
      status: savedMember.status.toString(),
      createdByUserId: savedMember.createdByUserId,
      approvedByUserId: savedMember.approvedByUserId,
      approvedAt: savedMember.approvedAt,
    };
    await this.memberHistoryService.logMemberCreate(
      savedMember.id,
      createdByUserId || '',
      memberData,
      ipAddress,
      userAgent,
    );

    // Otomatik şablon gönderimi - WhatsApp, SMS, Email (non-blocking)
    try {
      await this.whatsAppTemplateService.triggerAutoSend(
        'MEMBER_APPLICATION',
        savedMember.id,
        createdByUserId || 'system',
      );
    } catch (err: any) {
      this.logger.warn(
        `Üye ${savedMember.id} başvuru WhatsApp şablonu gönderilemedi: ${err.message}`,
      );
    }

    try {
      await this.smsTemplateService.triggerAutoSend(
        'MEMBER_APPLICATION',
        savedMember.id,
        createdByUserId || 'system',
      );
    } catch (err: any) {
      this.logger.warn(
        `Üye ${savedMember.id} başvuru SMS şablonu gönderilemedi: ${err.message}`,
      );
    }

    try {
      await this.emailTemplateService.triggerAutoSend(
        'MEMBER_APPLICATION',
        savedMember.id,
        createdByUserId || 'system',
      );
    } catch (err: any) {
      this.logger.warn(
        `Üye ${savedMember.id} başvuru e-posta şablonu gönderilemedi: ${err.message}`,
      );
    }

    return savedMember;
  }
}
