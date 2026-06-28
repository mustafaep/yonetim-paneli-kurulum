/**
 * Member Update Application Service
 *
 * Use case: Member update işlemini orchestrate eder
 *
 * Sorumluluklar:
 * - Transaction yönetimi
 * - Domain Entity çağırma
 * - Cross-cutting concerns (history)
 * - Repository koordinasyonu
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Member } from '../../domain/entities/member.entity';
import type { MemberRepository } from '../../domain/repositories/member.repository.interface';
import type { MemberMembershipPeriodRepository } from '../../domain/repositories/member-membership-period.repository.interface';
import { MemberHistoryService } from '../../member-history.service';
import {
  MemberNotFoundException,
  MemberActivationMissingFieldsException,
} from '../../domain/exceptions/member-domain.exception';
import { UpdateMemberDto } from '../dto/update-member.dto';
import {
  GenderEnum,
  EducationStatusEnum,
} from '../../domain/entities/member.entity';
import { MemberStatusEnum } from '../../domain/value-objects/member-status.vo';

export interface UpdateMemberCommand {
  memberId: string;
  updatedByUserId: string;
  updateData: UpdateMemberDto;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class MemberUpdateApplicationService {
  private readonly logger = new Logger(MemberUpdateApplicationService.name);

  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
    @Inject('MemberMembershipPeriodRepository')
    private readonly membershipPeriodRepository: MemberMembershipPeriodRepository,
    private readonly memberHistoryService: MemberHistoryService,
  ) {}

  /**
   * Use case: Member'ı güncelle
   *
   * Orchestration:
   * 1. Member'ı repository'den al
   * 2. History için veriyi sakla
   * 3. Domain Entity'de update method'unu çağır (business rule'lar burada)
   * 4. Repository'ye kaydet
   * 5. History log
   */
  async updateMember(command: UpdateMemberCommand): Promise<Member> {
    // 1. Member'ı bul
    const member = await this.memberRepository.findById(command.memberId);
    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${command.memberId}`);
    }

    // 2. Eski veriyi history için sakla
    const oldData = this.prepareHistoryData(member);

    // 2b. İstifa/ihraç/pasif: dönem kaydı için mevcut bilgileri sakla (update öncesi)
    const isCancellationStatus =
      command.updateData.status === 'RESIGNED' ||
      command.updateData.status === 'EXPELLED' ||
      command.updateData.status === 'INACTIVE';
    const regNo = isCancellationStatus
      ? member.registrationNumber?.getValue()
      : null;
    const approvedAt = isCancellationStatus ? member.approvedAt : null;

    try {
      // 3. DTO'yu Domain Entity update data formatına çevir
      const updateData = this.mapDtoToUpdateData(command.updateData);

      // 4. Domain Entity'de update method'unu çağır
      member.update(updateData);
      const newData = this.prepareHistoryData(member);
      if (!this.hasMeaningfulChanges(oldData, newData)) {
        throw new BadRequestException(
          'Gönderilen bilgiler mevcut verilerle aynı. Güncellenecek bir alan bulunamadı.',
        );
      }

      // 4b. İstifa/ihraç/pasif: Üyelik Geçmişi için MemberMembershipPeriod kaydı oluştur (veritabanına yaz)
      if (isCancellationStatus && (regNo || member.id)) {
        const cancelledAt = member.cancelledAt ?? new Date();
        const periodStart = approvedAt ?? cancelledAt;
        const regNoForPeriod = regNo ?? `Üye-${member.id.slice(-6)}`;
        await this.membershipPeriodRepository.create({
          memberId: member.id,
          registrationNumber: regNoForPeriod,
          periodStart,
          periodEnd: cancelledAt,
          status: command.updateData.status as string,
          cancellationReason: command.updateData.cancellationReason ?? null,
          cancelledAt,
          approvedAt: approvedAt ?? null,
          approvedByUserId: member.approvedByUserId ?? null,
          cancelledByUserId: command.updatedByUserId,
        });
      }

      // 5. Repository'ye kaydet
      await this.memberRepository.save(member);

      // 6. History log
      await this.memberHistoryService.logMemberUpdate(
        member.id,
        command.updatedByUserId,
        oldData,
        newData,
        command.ipAddress,
        command.userAgent,
      );

      return member;
    } catch (error) {
      // Domain exception'ları HTTP exception'a çevir
      if (error instanceof MemberActivationMissingFieldsException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof MemberNotFoundException) {
        throw new NotFoundException(error.message);
      }
      // Diğer exception'ları re-throw et
      throw error;
    }
  }

  /**
   * DTO'yu Domain Entity update data formatına çevir
   */
  private mapDtoToUpdateData(dto: UpdateMemberDto): any {
    return {
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      phone: dto.phone,
      email: dto.email,
      motherName: dto.motherName,
      fatherName: dto.fatherName,
      birthplace: dto.birthplace,
      gender: dto.gender as GenderEnum | undefined,
      educationStatus: dto.educationStatus as EducationStatusEnum | undefined,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      institutionId: dto.institutionId,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
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
      status: dto.status as MemberStatusEnum | undefined,
      cancellationReason: dto.cancellationReason,
    };
  }

  /**
   * History için data hazırla
   */
  private prepareHistoryData(member: Member): Record<string, any> {
    return {
      firstName: member.firstName,
      lastName: member.lastName,
      nationalId: member.nationalId.getValue(),
      phone: member.phone,
      email: member.email,
      birthDate: member.birthDate,
      status: member.status.toString(),
      approvedByUserId: member.approvedByUserId,
      approvedAt: member.approvedAt,
      membershipInfoOptionId: member.membershipInfoOptionId,
      memberGroupId: member.memberGroupId,
      registrationNumber: member.registrationNumber?.getValue() || null,
      boardDecisionDate: member.boardDecisionDate,
      boardDecisionBookNo: member.boardDecisionBookNo,
      motherName: member.motherName,
      fatherName: member.fatherName,
      birthplace: member.birthplace,
      gender: member.gender,
      educationStatus: member.educationStatus,
      institutionId: member.institutionId,
      tevkifatCenterId: member.tevkifatCenterId,
      tevkifatTitleId: member.tevkifatTitleId,
      branchId: member.branchId,
      dutyUnit: member.dutyUnit,
      institutionAddress: member.institutionAddress,
      institutionProvinceId: member.institutionProvinceId,
      institutionDistrictId: member.institutionDistrictId,
      professionId: member.professionId,
      institutionRegNo: member.institutionRegNo,
      staffTitleCode: member.staffTitleCode,
      cancelledByUserId: member.cancelledByUserId,
      cancelledAt: member.cancelledAt,
      cancellationReason: member.cancellationReason,
    };
  }

  private hasMeaningfulChanges(
    oldData: Record<string, any>,
    newData: Record<string, any>,
  ): boolean {
    const normalize = (v: unknown): unknown => {
      if (v instanceof Date) return v.toISOString();
      if (v === undefined) return null;
      return v;
    };

    const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    for (const key of keys) {
      if (normalize(oldData[key]) !== normalize(newData[key])) {
        return true;
      }
    }
    return false;
  }
}
