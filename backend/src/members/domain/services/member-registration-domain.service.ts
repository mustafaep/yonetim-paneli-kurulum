/**
 * Member Registration Domain Service
 *
 * Complex business logic that requires multiple entities or external dependencies.
 *
 * Sorumluluklar:
 * - Re-registration validation (cancelled member check)
 * - Registration number generation (config-based)
 * - Source validation (config-based)
 * - Required fields validation (config-based)
 */
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Member } from '../entities/member.entity';
import type { MemberRepository } from '../repositories/member.repository.interface';
import { NationalId } from '../value-objects/national-id.vo';
import { CreateMemberData } from '../entities/member.entity';
import { MemberSourceEnum } from '../entities/member.entity';

/**
 * Config Adapter Interface (Port)
 * Infrastructure katmanı bu interface'i implement edecek
 */
export interface MembershipConfigAdapter {
  getAllowReRegistration(): Promise<boolean>;
  getRegistrationNumberFormat(): Promise<string>;
  getRegistrationNumberPrefix(): Promise<string>;
  getRegistrationNumberStart(): Promise<number>;
  getAutoGenerateRegistrationNumber(): Promise<boolean>;
  getDefaultStatus(): Promise<string>;
  getAutoApprove(): Promise<boolean>;
  getRequireApproval(): Promise<boolean>;
  getRequireBoardDecision(): Promise<boolean>;
  getAllowedSources(): Promise<string[]>;
  getRequireEmail(): Promise<boolean>;
  getRequireInstitutionRegNo(): Promise<boolean>;
  getRequireWorkUnit(): Promise<boolean>;
  getRequireMotherName(): Promise<boolean>;
  getRequireFatherName(): Promise<boolean>;
  getRequireBirthplace(): Promise<boolean>;
  getRequireGender(): Promise<boolean>;
  getRequireEducation(): Promise<boolean>;
  getRequirePhone(): Promise<boolean>;
  getRequireProvinceDistrict(): Promise<boolean>;
  getMinAge(): Promise<number>;
}

@Injectable()
export class MemberRegistrationDomainService {
  constructor(
    @Inject('MemberRepository')
    private readonly memberRepository: MemberRepository,
    // Config adapter'ı inject et (infrastructure katmanından gelecek)
    @Inject('MembershipConfigAdapter')
    public readonly configAdapter: MembershipConfigAdapter,
  ) {}

  /**
   * Business rule: Re-registration validation
   *
   * Domain rule: Eğer yeniden kayıt kapalıysa ve iptal edilmiş üye varsa, yeni kayıt oluşturulamaz
   */
  async validateReRegistration(
    nationalId: NationalId,
    allowReRegistration: boolean,
  ): Promise<void> {
    if (!allowReRegistration) {
      const cancelledMember =
        await this.memberRepository.findCancelledByNationalId(nationalId);
      if (cancelledMember) {
        throw new BadRequestException(
          'Bu TC kimlik numarasına sahip iptal edilmiş bir üye bulunmaktadır ve yeniden kayıt şu anda devre dışı bırakılmıştır',
        );
      }
    }
  }

  /**
   * Business rule: Source validation
   *
   * Domain rule: Sistem ayarlarına göre başvuru kaynağı kontrolü
   */
  async validateSource(source: MemberSourceEnum): Promise<void> {
    const allowedSources = await this.configAdapter.getAllowedSources();

    // Eğer hiçbir kaynak belirtilmemişse, tüm kaynaklar izinlidir
    if (allowedSources.length === 0) {
      return;
    }

    if (!allowedSources.includes(source)) {
      throw new BadRequestException(`Başvuru kaynağı "${source}" izinli değil`);
    }
  }

  /**
   * Business rule: Registration number generation
   *
   * Domain rule: Sistem ayarlarına göre kayıt numarası oluştur
   */
  async generateRegistrationNumber(): Promise<string | null> {
    const autoGenerate =
      await this.configAdapter.getAutoGenerateRegistrationNumber();
    if (!autoGenerate) {
      return null; // Otomatik oluşturma kapalıysa null döndür
    }

    const format = await this.configAdapter.getRegistrationNumberFormat();
    const prefix = await this.configAdapter.getRegistrationNumberPrefix();
    const startNumber = await this.configAdapter.getRegistrationNumberStart();
    const currentYear = new Date().getFullYear();

    // Format'a göre expected pattern oluştur
    let expectedPattern: string;
    switch (format) {
      case 'SEQUENTIAL':
        expectedPattern = '^\\d+$';
        break;
      case 'YEAR_SEQUENTIAL':
        expectedPattern = `^${currentYear}-\\d+$`;
        break;
      case 'PREFIX_SEQUENTIAL':
        expectedPattern = prefix
          ? `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`
          : '^\\d+$';
        break;
      case 'PREFIX_YEAR_SEQUENTIAL':
        expectedPattern = prefix
          ? `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${currentYear}-\\d+$`
          : `^${currentYear}-\\d+$`;
        break;
      default:
        expectedPattern = '^\\d+$';
    }

    // En son kayıt numarasını bul (geçici numaralar hariç, format'a uygun olanlar)
    const allMembers = await this.memberRepository.findAllRegistrationNumbers();

    const regex = new RegExp(expectedPattern);
    let maxNumber = startNumber - 1;

    for (const registrationNumber of allMembers) {
      if (registrationNumber && regex.test(registrationNumber)) {
        // Son numarayı çıkar
        const numberMatch = registrationNumber.match(/(\d+)$/);
        if (numberMatch) {
          const num = parseInt(numberMatch[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;

    switch (format) {
      case 'SEQUENTIAL':
        return `${nextNumber}`;
      case 'YEAR_SEQUENTIAL':
        return `${currentYear}-${String(nextNumber).padStart(3, '0')}`;
      case 'PREFIX_SEQUENTIAL':
        return prefix
          ? `${prefix}-${String(nextNumber).padStart(3, '0')}`
          : `${nextNumber}`;
      case 'PREFIX_YEAR_SEQUENTIAL':
        return prefix
          ? `${prefix}-${currentYear}-${String(nextNumber).padStart(3, '0')}`
          : `${currentYear}-${String(nextNumber).padStart(3, '0')}`;
      default:
        return `${nextNumber}`;
    }
  }

  /**
   * Business rule: Required fields validation (config-based)
   *
   * Domain rule: Sistem ayarlarına göre zorunlu alanları kontrol et
   */
  async validateRequiredFields(data: CreateMemberData): Promise<void> {
    const requireMotherName = await this.configAdapter.getRequireMotherName();
    if (
      requireMotherName &&
      (!data.motherName || String(data.motherName).trim() === '')
    ) {
      throw new BadRequestException('Anne adı alanı zorunludur');
    }

    const requireFatherName = await this.configAdapter.getRequireFatherName();
    if (
      requireFatherName &&
      (!data.fatherName || String(data.fatherName).trim() === '')
    ) {
      throw new BadRequestException('Baba adı alanı zorunludur');
    }

    const requireBirthplace = await this.configAdapter.getRequireBirthplace();
    if (
      requireBirthplace &&
      (!data.birthplace || data.birthplace.trim() === '')
    ) {
      throw new BadRequestException('Doğum yeri alanı zorunludur');
    }

    const requireGender = await this.configAdapter.getRequireGender();
    if (requireGender && !data.gender) {
      throw new BadRequestException('Cinsiyet seçimi zorunludur');
    }

    const requireEducation = await this.configAdapter.getRequireEducation();
    if (requireEducation && !data.educationStatus) {
      throw new BadRequestException('Öğrenim durumu zorunludur');
    }

    const requirePhone = await this.configAdapter.getRequirePhone();
    if (requirePhone && (!data.phone || data.phone.trim() === '')) {
      throw new BadRequestException('Telefon numarası zorunludur');
    }

    const requireProvinceDistrict =
      await this.configAdapter.getRequireProvinceDistrict();
    if (requireProvinceDistrict && (!data.provinceId || !data.districtId)) {
      throw new BadRequestException('İkamet il ve ilçe seçimi zorunludur');
    }

    const requireEmail = await this.configAdapter.getRequireEmail();
    if (requireEmail && (!data.email || data.email.trim() === '')) {
      throw new BadRequestException('E-posta alanı zorunludur');
    }

    const requireInstitutionRegNo =
      await this.configAdapter.getRequireInstitutionRegNo();
    if (
      requireInstitutionRegNo &&
      (!data.institutionRegNo || data.institutionRegNo.trim() === '')
    ) {
      throw new BadRequestException('Kurum sicil no alanı zorunludur');
    }

    const requireWorkUnit = await this.configAdapter.getRequireWorkUnit();
    if (requireWorkUnit && (!data.dutyUnit || data.dutyUnit.trim() === '')) {
      throw new BadRequestException('Görev yaptığı birim alanı zorunludur');
    }

    const requireBoardDecision =
      await this.configAdapter.getRequireBoardDecision();
    if (
      requireBoardDecision &&
      (!data.boardDecisionDate || !data.boardDecisionBookNo)
    ) {
      throw new BadRequestException(
        'Yönetim kurulu karar tarihi ve defter no zorunludur',
      );
    }
  }

  /**
   * Business rule: Minimum age validation (config-based)
   *
   * Domain rule: MEMBERSHIP_MIN_AGE ayarına göre doğum tarihi kontrolü
   */
  async validateMinAge(birthDate: Date | string | undefined): Promise<void> {
    if (!birthDate) return;
    const minAge = await this.configAdapter.getMinAge();
    if (minAge <= 0) return;
    const birth =
      typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    if (age < minAge) {
      throw new BadRequestException(
        `Üyelik için minimum yaş ${minAge} olarak ayarlanmıştır. Başvuru kabul edilemez.`,
      );
    }
  }

  /**
   * Business rule: Determine initial status
   *
   * Domain rule: Sistem ayarlarına göre başlangıç durumu belirle.
   * - getRequireApproval() true ise: Yeni üye mutlaka PENDING ile başlar (manuel onay gerekir).
   *   Otomatik onay (autoApprove) açıksa yine de ACTIVE atanabilir.
   * - getRequireApproval() false ise: MEMBERSHIP_DEFAULT_STATUS kullanılır.
   */
  async determineInitialStatus(
    defaultStatus: string,
    autoApprove: boolean,
    requireApproval: boolean,
  ): Promise<{ status: string; approvedByUserId?: string; approvedAt?: Date }> {
    const approvedByUserId: string | undefined = undefined;
    const approvedAt: Date | undefined = undefined;

    let initialStatus: string;
    if (requireApproval && !autoApprove) {
      // Onay zorunlu ve otomatik onay kapalı: her zaman PENDING
      initialStatus = 'PENDING';
    } else if (
      autoApprove &&
      (defaultStatus === 'PENDING' || requireApproval)
    ) {
      // Otomatik onay açık: PENDING yerine ACTIVE yap
      initialStatus = 'ACTIVE';
    } else {
      initialStatus = defaultStatus;
    }

    return {
      status: initialStatus,
      approvedByUserId,
      approvedAt,
    };
  }
}
