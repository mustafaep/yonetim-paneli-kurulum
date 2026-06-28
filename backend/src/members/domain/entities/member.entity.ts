/**
 * Member Domain Entity - FULL VERSION
 *
 * ✅ Tam Member Entity - Tüm alanlar dahil
 *
 * Domain rule'ları bu entity içinde encapsulate ediyoruz.
 */
import { MemberStatus } from '../value-objects/member-status.vo';
import { RegistrationNumber } from '../value-objects/registration-number.vo';
import { NationalId } from '../value-objects/national-id.vo';
import {
  MemberCannotBeApprovedException,
  MemberApprovalMissingFieldsException,
  MemberCannotBeActivatedException,
  MemberActivationMissingFieldsException,
  MemberCannotBeRejectedException,
  MemberCannotBeCancelledException,
  MemberCancellationReasonRequiredException,
} from '../exceptions/member-domain.exception';
import { MemberStatusEnum } from '../value-objects/member-status.vo';

/**
 * Prisma enum'ları (type safety için)
 */
export enum MemberSourceEnum {
  DIRECT = 'DIRECT',
  OTHER = 'OTHER',
}

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum EducationStatusEnum {
  PRIMARY = 'PRIMARY',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  COLLEGE = 'COLLEGE',
}

/**
 * Approval için gerekli bilgiler
 */
export interface ApprovalData {
  registrationNumber?: string;
  boardDecisionDate?: Date | string;
  boardDecisionBookNo?: string;
  tevkifatCenterId?: string;
  tevkifatTitleId?: string;
  branchId?: string;
  memberGroupId?: string;
}

/**
 * Cancellation için gerekli bilgiler
 */
export interface CancellationData {
  status: MemberStatusEnum; // RESIGNED, EXPELLED, veya INACTIVE
  cancellationReason: string;
}

/**
 * Update için gerekli bilgiler
 */
export interface UpdateMemberData {
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  motherName?: string;
  fatherName?: string;
  birthDate?: Date | string;
  birthplace?: string;
  gender?: GenderEnum;
  educationStatus?: EducationStatusEnum;
  institutionId?: string;
  provinceId?: string;
  districtId?: string;
  dutyUnit?: string;
  institutionAddress?: string;
  institutionProvinceId?: string;
  institutionDistrictId?: string;
  professionId?: string;
  institutionRegNo?: string;
  staffTitleCode?: string;
  membershipInfoOptionId?: string;
  memberGroupId?: string;
  registrationNumber?: string;
  boardDecisionDate?: Date | string;
  boardDecisionBookNo?: string;
  tevkifatCenterId?: string;
  tevkifatTitleId?: string;
  branchId?: string;
  status?: MemberStatusEnum;
  cancellationReason?: string;
  approvedAt?: Date | null;
  approvedByUserId?: string | null;
}

/**
 * Create Member için gerekli bilgiler
 */
export interface CreateMemberData {
  firstName: string;
  lastName: string;
  nationalId: string;
  phone: string;
  email?: string;
  source?: MemberSourceEnum;

  // Kişisel bilgiler
  motherName: string;
  fatherName: string;
  birthDate: Date | string;
  birthplace: string;
  gender: GenderEnum;
  educationStatus: EducationStatusEnum;

  // Kurum bilgileri
  institutionId: string;
  provinceId: string;
  districtId: string;

  // Kurum detay bilgileri (opsiyonel)
  dutyUnit?: string;
  institutionAddress?: string;
  institutionProvinceId?: string;
  institutionDistrictId?: string;
  professionId?: string;
  institutionRegNo?: string;
  staffTitleCode?: string;

  // Üyelik bilgileri (opsiyonel)
  membershipInfoOptionId?: string;
  memberGroupId?: string;
  registrationNumber?: string;
  boardDecisionDate?: Date | string;
  boardDecisionBookNo?: string;

  // Tevkifat bilgileri (opsiyonel)
  tevkifatCenterId?: string;
  tevkifatTitleId?: string;
  branchId?: string;

  // Metadata
  createdByUserId?: string;
  previousCancelledMemberId?: string;
}

/**
 * Full Member Domain Entity
 *
 * Tüm member alanlarını içerir.
 */
export class Member {
  // Identity
  public readonly id: string;

  // Basic Info
  private _firstName: string;
  private _lastName: string;
  private _nationalId: NationalId;
  private _phone: string;
  private _email: string | null;
  private _status: MemberStatus;
  private _source: MemberSourceEnum;

  // Kişisel Bilgiler
  private _motherName: string;
  private _fatherName: string;
  private _birthDate: Date;
  private _birthplace: string;
  private _gender: GenderEnum;
  private _educationStatus: EducationStatusEnum;

  // Kurum Bilgileri
  private _institutionId: string;
  private _provinceId: string;
  private _districtId: string;

  // Kurum Detay Bilgileri
  private _dutyUnit: string | null;
  private _institutionAddress: string | null;
  private _institutionProvinceId: string | null;
  private _institutionDistrictId: string | null;
  private _professionId: string | null;
  private _institutionRegNo: string | null;
  private _staffTitleCode: string | null;

  // Üyelik & Yönetim Kurulu Bilgileri
  private _membershipInfoOptionId: string | null;
  private _memberGroupId: string | null;
  private _registrationNumber: RegistrationNumber | null;
  private _boardDecisionDate: Date | null;
  private _boardDecisionBookNo: string | null;

  // Tevkifat Bilgileri
  private _tevkifatCenterId: string | null;
  private _tevkifatTitleId: string | null;
  private _branchId: string | null;

  // Metadata
  private _createdByUserId: string | null;
  private _approvedByUserId: string | null;
  private _approvedAt: Date | null;
  private _cancelledByUserId: string | null;
  private _cancellationReason: string | null;
  private _cancelledAt: Date | null;
  private _previousCancelledMemberId: string | null;
  private _userId: string | null;

  // Audit
  private _isActive: boolean;
  private _deletedAt: Date | null;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(data: {
    id: string;
    firstName: string;
    lastName: string;
    nationalId: NationalId;
    phone: string;
    email: string | null;
    status: MemberStatus;
    source: MemberSourceEnum;
    motherName: string;
    fatherName: string;
    birthDate: Date;
    birthplace: string;
    gender: GenderEnum;
    educationStatus: EducationStatusEnum;
    institutionId: string;
    provinceId: string;
    districtId: string;
    dutyUnit: string | null;
    institutionAddress: string | null;
    institutionProvinceId: string | null;
    institutionDistrictId: string | null;
    professionId: string | null;
    institutionRegNo: string | null;
    staffTitleCode: string | null;
    membershipInfoOptionId: string | null;
    memberGroupId: string | null;
    registrationNumber: RegistrationNumber | null;
    boardDecisionDate: Date | null;
    boardDecisionBookNo: string | null;
    tevkifatCenterId: string | null;
    tevkifatTitleId: string | null;
    branchId: string | null;
    createdByUserId: string | null;
    approvedByUserId: string | null;
    approvedAt: Date | null;
    cancelledByUserId: string | null;
    cancellationReason: string | null;
    cancelledAt: Date | null;
    previousCancelledMemberId: string | null;
    userId: string | null;
    isActive: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this._firstName = data.firstName;
    this._lastName = data.lastName;
    this._nationalId = data.nationalId;
    this._phone = data.phone;
    this._email = data.email;
    this._status = data.status;
    this._source = data.source;
    this._motherName = data.motherName;
    this._fatherName = data.fatherName;
    this._birthDate = data.birthDate;
    this._birthplace = data.birthplace;
    this._gender = data.gender;
    this._educationStatus = data.educationStatus;
    this._institutionId = data.institutionId;
    this._provinceId = data.provinceId;
    this._districtId = data.districtId;
    this._dutyUnit = data.dutyUnit;
    this._institutionAddress = data.institutionAddress;
    this._institutionProvinceId = data.institutionProvinceId;
    this._institutionDistrictId = data.institutionDistrictId;
    this._professionId = data.professionId;
    this._institutionRegNo = data.institutionRegNo;
    this._staffTitleCode = data.staffTitleCode;
    this._membershipInfoOptionId = data.membershipInfoOptionId;
    this._memberGroupId = data.memberGroupId;
    this._registrationNumber = data.registrationNumber;
    this._boardDecisionDate = data.boardDecisionDate;
    this._boardDecisionBookNo = data.boardDecisionBookNo;
    this._tevkifatCenterId = data.tevkifatCenterId;
    this._tevkifatTitleId = data.tevkifatTitleId;
    this._branchId = data.branchId;
    this._createdByUserId = data.createdByUserId;
    this._approvedByUserId = data.approvedByUserId;
    this._approvedAt = data.approvedAt;
    this._cancelledByUserId = data.cancelledByUserId;
    this._cancellationReason = data.cancellationReason;
    this._cancelledAt = data.cancelledAt;
    this._previousCancelledMemberId = data.previousCancelledMemberId;
    this._userId = data.userId;
    this._isActive = data.isActive;
    this._deletedAt = data.deletedAt;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  /**
   * Factory method: Create new Member
   */
  static create(data: CreateMemberData): Member {
    const nationalId = NationalId.create(data.nationalId);
    const status = MemberStatus.pending();
    const source = data.source || MemberSourceEnum.DIRECT;
    const registrationNumber = data.registrationNumber
      ? RegistrationNumber.create(data.registrationNumber)
      : null;

    const birthDate =
      data.birthDate instanceof Date
        ? data.birthDate
        : new Date(data.birthDate);

    const boardDecisionDate = data.boardDecisionDate
      ? data.boardDecisionDate instanceof Date
        ? data.boardDecisionDate
        : new Date(data.boardDecisionDate)
      : null;

    return new Member({
      id: '', // Temporary ID, will be replaced by repository after creation
      firstName: data.firstName,
      lastName: data.lastName,
      nationalId,
      phone: data.phone,
      email: data.email || null,
      status,
      source,
      motherName: data.motherName,
      fatherName: data.fatherName,
      birthDate,
      birthplace: data.birthplace,
      gender: data.gender,
      educationStatus: data.educationStatus,
      institutionId: data.institutionId,
      provinceId: data.provinceId,
      districtId: data.districtId,
      dutyUnit: data.dutyUnit || null,
      institutionAddress: data.institutionAddress || null,
      institutionProvinceId: data.institutionProvinceId || null,
      institutionDistrictId: data.institutionDistrictId || null,
      professionId: data.professionId || null,
      institutionRegNo: data.institutionRegNo || null,
      staffTitleCode: data.staffTitleCode || null,
      membershipInfoOptionId: data.membershipInfoOptionId || null,
      memberGroupId: data.memberGroupId || null,
      registrationNumber,
      boardDecisionDate,
      boardDecisionBookNo: data.boardDecisionBookNo || null,
      tevkifatCenterId: data.tevkifatCenterId || null,
      tevkifatTitleId: data.tevkifatTitleId || null,
      branchId: data.branchId || null,
      createdByUserId: data.createdByUserId || null,
      approvedByUserId: null,
      approvedAt: null,
      cancelledByUserId: null,
      cancellationReason: null,
      cancelledAt: null,
      previousCancelledMemberId: data.previousCancelledMemberId || null,
      userId: null,
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Factory method: Prisma model'den Domain Entity oluştur
   */
  static fromPrisma(data: any): Member {
    return new Member({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      nationalId: NationalId.create(data.nationalId),
      phone: data.phone,
      email: data.email || null,
      status: MemberStatus.fromString(data.status),
      source: data.source as MemberSourceEnum,
      motherName: data.motherName,
      fatherName: data.fatherName,
      birthDate:
        data.birthDate instanceof Date
          ? data.birthDate
          : new Date(data.birthDate),
      birthplace: data.birthplace,
      gender: data.gender as GenderEnum,
      educationStatus: data.educationStatus as EducationStatusEnum,
      institutionId: data.institutionId,
      provinceId: data.provinceId,
      districtId: data.districtId,
      dutyUnit: data.dutyUnit || null,
      institutionAddress: data.institutionAddress || null,
      institutionProvinceId: data.institutionProvinceId || null,
      institutionDistrictId: data.institutionDistrictId || null,
      professionId: data.professionId || null,
      institutionRegNo: data.institutionRegNo || null,
      staffTitleCode: data.staffTitleCode || null,
      membershipInfoOptionId: data.membershipInfoOptionId || null,
      memberGroupId: data.memberGroupId || null,
      registrationNumber: data.registrationNumber
        ? RegistrationNumber.create(data.registrationNumber)
        : null,
      boardDecisionDate: data.boardDecisionDate || null,
      boardDecisionBookNo: data.boardDecisionBookNo || null,
      tevkifatCenterId: data.tevkifatCenterId || null,
      tevkifatTitleId: data.tevkifatTitleId || null,
      branchId: data.branchId || null,
      createdByUserId: data.createdByUserId || null,
      approvedByUserId: data.approvedByUserId || null,
      approvedAt: data.approvedAt || null,
      cancelledByUserId: data.cancelledByUserId || null,
      cancellationReason: data.cancellationReason || null,
      cancelledAt: data.cancelledAt || null,
      previousCancelledMemberId: data.previousCancelledMemberId || null,
      userId: data.userId || null,
      isActive: data.isActive ?? true,
      deletedAt: data.deletedAt || null,
      createdAt:
        data.createdAt instanceof Date
          ? data.createdAt
          : new Date(data.createdAt),
      updatedAt:
        data.updatedAt instanceof Date
          ? data.updatedAt
          : new Date(data.updatedAt),
    });
  }

  // ========== Getters ==========

  get firstName(): string {
    return this._firstName;
  }
  get lastName(): string {
    return this._lastName;
  }
  get nationalId(): NationalId {
    return this._nationalId;
  }
  get phone(): string {
    return this._phone;
  }
  get email(): string | null {
    return this._email;
  }
  get status(): MemberStatus {
    return this._status;
  }
  get source(): MemberSourceEnum {
    return this._source;
  }
  get motherName(): string {
    return this._motherName;
  }
  get fatherName(): string {
    return this._fatherName;
  }
  get birthDate(): Date {
    return this._birthDate;
  }
  get birthplace(): string {
    return this._birthplace;
  }
  get gender(): GenderEnum {
    return this._gender;
  }
  get educationStatus(): EducationStatusEnum {
    return this._educationStatus;
  }
  get institutionId(): string {
    return this._institutionId;
  }
  get provinceId(): string {
    return this._provinceId;
  }
  get districtId(): string {
    return this._districtId;
  }
  get dutyUnit(): string | null {
    return this._dutyUnit;
  }
  get institutionAddress(): string | null {
    return this._institutionAddress;
  }
  get institutionProvinceId(): string | null {
    return this._institutionProvinceId;
  }
  get institutionDistrictId(): string | null {
    return this._institutionDistrictId;
  }
  get professionId(): string | null {
    return this._professionId;
  }
  get institutionRegNo(): string | null {
    return this._institutionRegNo;
  }
  get staffTitleCode(): string | null {
    return this._staffTitleCode;
  }
  get membershipInfoOptionId(): string | null {
    return this._membershipInfoOptionId;
  }
  get memberGroupId(): string | null {
    return this._memberGroupId;
  }
  get registrationNumber(): RegistrationNumber | null {
    return this._registrationNumber;
  }
  get boardDecisionDate(): Date | null {
    return this._boardDecisionDate;
  }
  get boardDecisionBookNo(): string | null {
    return this._boardDecisionBookNo;
  }
  get tevkifatCenterId(): string | null {
    return this._tevkifatCenterId;
  }
  get tevkifatTitleId(): string | null {
    return this._tevkifatTitleId;
  }
  get branchId(): string | null {
    return this._branchId;
  }
  get createdByUserId(): string | null {
    return this._createdByUserId;
  }
  get approvedByUserId(): string | null {
    return this._approvedByUserId;
  }
  get approvedAt(): Date | null {
    return this._approvedAt;
  }
  get cancelledByUserId(): string | null {
    return this._cancelledByUserId;
  }
  get cancellationReason(): string | null {
    return this._cancellationReason;
  }
  get cancelledAt(): Date | null {
    return this._cancelledAt;
  }
  get previousCancelledMemberId(): string | null {
    return this._previousCancelledMemberId;
  }
  get userId(): string | null {
    return this._userId;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ========== Business Methods ==========

  /**
   * Business method: Member'ı approve et
   */
  approve(approvedByUserId: string, approvalData: ApprovalData): void {
    if (!this._status.canBeApproved()) {
      throw new MemberCannotBeApprovedException(this._status.toString());
    }

    // Onay formu alanları (üye numarası, karar tarihi vb.) zorunludur
    const missingApprovalFields =
      this.validateRequiredFieldsForApproval(approvalData);
    if (missingApprovalFields.length > 0) {
      throw new MemberApprovalMissingFieldsException(missingApprovalFields);
    }

    // Başvuru formu bilgileri (anne adı, baba adı vb.) sistem ayarlarına göre
    // kayıt sırasında zorunlu olabilir; onay aşamasında eksik olsa bile
    // engelleme yapılmaz, sadece bilgi için boş alanlar raporlanır (getEmptyApplicationDataFields)

    this._status = MemberStatus.approved();

    if (approvalData.registrationNumber) {
      this._registrationNumber = RegistrationNumber.create(
        approvalData.registrationNumber,
      );
    }
    if (approvalData.boardDecisionDate) {
      this._boardDecisionDate =
        approvalData.boardDecisionDate instanceof Date
          ? approvalData.boardDecisionDate
          : new Date(approvalData.boardDecisionDate);
    }
    if (approvalData.boardDecisionBookNo) {
      this._boardDecisionBookNo = approvalData.boardDecisionBookNo;
    }
    if (approvalData.tevkifatCenterId) {
      this._tevkifatCenterId = approvalData.tevkifatCenterId;
    }
    if (approvalData.tevkifatTitleId) {
      this._tevkifatTitleId = approvalData.tevkifatTitleId;
    }
    if (approvalData.branchId) {
      this._branchId = approvalData.branchId;
    }
    if (approvalData.memberGroupId) {
      this._memberGroupId = approvalData.memberGroupId;
    }

    this._approvedByUserId = approvedByUserId;
    this._approvedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Business method: Member'ı activate et
   */
  activate(): void {
    if (!this._status.canBeActivated()) {
      throw new MemberCannotBeActivatedException(this._status.toString());
    }

    const missingFields = this.validateRequiredFieldsForActivation();
    if (missingFields.length > 0) {
      throw new MemberActivationMissingFieldsException(
        `Üye aktif (ACTIVE) durumuna geçirilirken aşağıdaki alanlar zorunludur: ${missingFields.join(', ')}. Lütfen eksik bilgileri tamamlayın.`,
        missingFields,
      );
    }

    this._status = MemberStatus.active();
    this._updatedAt = new Date();
  }

  /**
   * Business method: Member'ı reject et
   */
  reject(rejectedByUserId: string): void {
    if (!this._status.canBeRejected()) {
      throw new MemberCannotBeRejectedException(this._status.toString());
    }

    this._status = MemberStatus.rejected();
    this._updatedAt = new Date();
  }

  /**
   * Business method: Üyeliği iptal et
   *
   * Domain rules:
   * 1. Sadece ACTIVE üyelerin üyeliği iptal edilebilir
   * 2. İptal nedeni zorunlu.
   * 3. Status RESIGNED, EXPELLED veya INACTIVE'e geçer
   * 4. İptal tarihi otomatik set edilir.
   * 5. İptal edilen üye numarası null yapılmaz.
   */
  cancelMembership(
    cancelledByUserId: string,
    cancellationData: CancellationData,
  ): void {
    // Business rule 1: Status kontrolü
    if (!this._status.canBeCancelled()) {
      throw new MemberCannotBeCancelledException(this._status.toString());
    }

    // Business rule 2: İptal nedeni zorunlu
    if (
      !cancellationData.cancellationReason ||
      cancellationData.cancellationReason.trim() === ''
    ) {
      throw new MemberCancellationReasonRequiredException();
    }

    // Business rule 3: Status transition
    switch (cancellationData.status) {
      case MemberStatusEnum.RESIGNED:
        this._status = MemberStatus.resigned();
        break;
      case MemberStatusEnum.EXPELLED:
        this._status = MemberStatus.expelled();
        break;
      case MemberStatusEnum.INACTIVE:
        this._status = MemberStatus.inactive();
        break;
      default:
        throw new Error(`Geçersiz iptal durumu: ${cancellationData.status}`);
    }

    // Business rule 4: İptal metadata
    this._cancelledByUserId = cancelledByUserId;
    this._cancellationReason = cancellationData.cancellationReason.trim();
    this._cancelledAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Business method: Member bilgilerini güncelle
   *
   * Domain rules:
   * 1. Status değişikliği yapılıyorsa business rule'ları kontrol et
   * 2. Partial update desteklenir (sadece gönderilen alanlar güncellenir)
   * 3. Status RESIGNED/EXPELLED ise cancellation metadata set et
   */
  update(updateData: UpdateMemberData): void {
    // Basic fields update
    if (updateData.firstName !== undefined) {
      this._firstName = updateData.firstName;
    }
    if (updateData.lastName !== undefined) {
      this._lastName = updateData.lastName;
    }
    if (updateData.nationalId !== undefined) {
      this._nationalId = NationalId.create(updateData.nationalId);
    }
    if (updateData.phone !== undefined) {
      this._phone = updateData.phone;
    }
    if (updateData.email !== undefined) {
      this._email = updateData.email || null;
    }
    if (updateData.motherName !== undefined) {
      this._motherName = updateData.motherName;
    }
    if (updateData.fatherName !== undefined) {
      this._fatherName = updateData.fatherName;
    }
    if (updateData.birthplace !== undefined) {
      this._birthplace = updateData.birthplace;
    }
    if (updateData.gender !== undefined) {
      this._gender = updateData.gender;
    }
    if (updateData.educationStatus !== undefined) {
      this._educationStatus = updateData.educationStatus;
    }
    if (updateData.birthDate !== undefined) {
      this._birthDate =
        updateData.birthDate instanceof Date
          ? updateData.birthDate
          : new Date(updateData.birthDate);
    }
    if (updateData.institutionId !== undefined) {
      this._institutionId = updateData.institutionId;
    }
    if (updateData.provinceId !== undefined) {
      this._provinceId = updateData.provinceId;
    }
    if (updateData.districtId !== undefined) {
      this._districtId = updateData.districtId;
    }
    if (updateData.dutyUnit !== undefined) {
      this._dutyUnit = updateData.dutyUnit || null;
    }
    if (updateData.institutionAddress !== undefined) {
      this._institutionAddress = updateData.institutionAddress || null;
    }
    if (updateData.institutionProvinceId !== undefined) {
      this._institutionProvinceId = updateData.institutionProvinceId || null;
    }
    if (updateData.institutionDistrictId !== undefined) {
      this._institutionDistrictId = updateData.institutionDistrictId || null;
    }
    if (updateData.professionId !== undefined) {
      this._professionId = updateData.professionId || null;
    }
    if (updateData.institutionRegNo !== undefined) {
      this._institutionRegNo = updateData.institutionRegNo || null;
    }
    if (updateData.staffTitleCode !== undefined) {
      this._staffTitleCode = updateData.staffTitleCode || null;
    }
    if (updateData.membershipInfoOptionId !== undefined) {
      this._membershipInfoOptionId = updateData.membershipInfoOptionId || null;
    }
    if (updateData.memberGroupId !== undefined) {
      this._memberGroupId = updateData.memberGroupId || null;
    }
    if (updateData.registrationNumber !== undefined) {
      this._registrationNumber = updateData.registrationNumber
        ? RegistrationNumber.create(updateData.registrationNumber)
        : null;
    }
    if (updateData.boardDecisionDate !== undefined) {
      this._boardDecisionDate = updateData.boardDecisionDate
        ? updateData.boardDecisionDate instanceof Date
          ? updateData.boardDecisionDate
          : new Date(updateData.boardDecisionDate)
        : null;
    }
    if (updateData.boardDecisionBookNo !== undefined) {
      this._boardDecisionBookNo = updateData.boardDecisionBookNo || null;
    }
    if (updateData.tevkifatCenterId !== undefined) {
      this._tevkifatCenterId = updateData.tevkifatCenterId || null;
    }
    if (updateData.tevkifatTitleId !== undefined) {
      this._tevkifatTitleId = updateData.tevkifatTitleId || null;
    }
    if (updateData.branchId !== undefined) {
      this._branchId = updateData.branchId || null;
    }
    if (updateData.approvedAt !== undefined) {
      this._approvedAt = updateData.approvedAt ?? null;
    }
    if (updateData.approvedByUserId !== undefined) {
      this._approvedByUserId = updateData.approvedByUserId ?? null;
    }

    // Status update (business rules ile)
    if (updateData.status !== undefined) {
      // RESIGNED veya EXPELLED durumları için cancellation metadata
      if (
        updateData.status === MemberStatusEnum.RESIGNED ||
        updateData.status === MemberStatusEnum.EXPELLED
      ) {
        if (!this._cancelledAt) {
          this._cancelledAt = new Date();
        }
        if (updateData.cancellationReason) {
          this._cancellationReason = updateData.cancellationReason;
        }
      } else {
        // Diğer durumlar için cancellation metadata temizle
        this._cancelledAt = null;
        this._cancelledByUserId = null;
        this._cancellationReason = null;
      }

      // Status transition (business rule kontrolü ile)
      const newStatus = MemberStatus.fromString(updateData.status);

      // İstifa/ihraç edilmiş bir üye doğrudan ACTIVE yapılamaz
      if (
        newStatus.isActive() &&
        (this._status.isResigned() || this._status.isExpelled())
      ) {
        throw new MemberCannotBeActivatedException(this._status.toString());
      }

      // APPROVED veya ACTIVE'e geçerken zorunlu alanları kontrol et
      if (newStatus.isApproved() || newStatus.isActive()) {
        const missingFields =
          this.validateRequiredFieldsForStatusTransition(newStatus);
        if (missingFields.length > 0) {
          const statusLabel = newStatus.isApproved()
            ? 'bekleme (APPROVED)'
            : 'aktif (ACTIVE)';
          throw new MemberActivationMissingFieldsException(
            `Üye ${statusLabel} durumuna geçirilirken aşağıdaki alanlar zorunludur: ${missingFields.join(', ')}. Lütfen eksik bilgileri tamamlayın.`,
            missingFields,
          );
        }
      }

      this._status = newStatus;
    }

    this._updatedAt = new Date();
  }

  // ========== Private Validation Methods ==========

  /**
   * Başvuru aşamasındaki (PENDING) üyenin onaylanmasından önce
   * başvuru formunda girilmesi zorunlu alanları kontrol eder.
   */
  /**
   * Sistem ayarlarında zorunlu/isteğe bağlı yapılabilen başvuru alanlarından
   * boş olanların listesini döner. Onay sırasında engelleme yapılmaz;
   * frontend tarafında bilgilendirme (info pop-up) için kullanılır.
   */
  getEmptyApplicationDataFields(): string[] {
    const emptyFields: string[] = [];

    if (!this._phone || this._phone.trim() === '') {
      emptyFields.push('Telefon');
    }
    if (!this._email || this._email.trim() === '') {
      emptyFields.push('E-posta');
    }
    if (!this._motherName || this._motherName.trim() === '') {
      emptyFields.push('Anne Adı');
    }
    if (!this._fatherName || this._fatherName.trim() === '') {
      emptyFields.push('Baba Adı');
    }
    if (!this._birthplace || this._birthplace.trim() === '') {
      emptyFields.push('Doğum Yeri');
    }
    if (!this._gender) {
      emptyFields.push('Cinsiyet');
    }
    if (!this._educationStatus) {
      emptyFields.push('Eğitim Durumu');
    }
    if (!this._provinceId) {
      emptyFields.push('İl');
    }
    if (!this._districtId) {
      emptyFields.push('İlçe');
    }
    if (!this._institutionRegNo || this._institutionRegNo.trim() === '') {
      emptyFields.push('Kurum Sicil No');
    }
    if (!this._dutyUnit || this._dutyUnit.trim() === '') {
      emptyFields.push('Görev Birimi');
    }

    return emptyFields;
  }

  private validateRequiredFieldsForApproval(
    approvalData: ApprovalData,
  ): string[] {
    const missingFields: string[] = [];

    const registrationNumber =
      approvalData.registrationNumber || this._registrationNumber?.getValue();
    const boardDecisionDate = approvalData.boardDecisionDate
      ? approvalData.boardDecisionDate instanceof Date
        ? approvalData.boardDecisionDate
        : new Date(approvalData.boardDecisionDate)
      : this._boardDecisionDate;
    const boardDecisionBookNo =
      approvalData.boardDecisionBookNo || this._boardDecisionBookNo;
    const tevkifatCenterId =
      approvalData.tevkifatCenterId || this._tevkifatCenterId;
    const tevkifatTitleId =
      approvalData.tevkifatTitleId || this._tevkifatTitleId;
    const branchId = approvalData.branchId || this._branchId;

    if (!registrationNumber || registrationNumber.trim() === '') {
      missingFields.push('Üye Numarası');
    }
    if (!boardDecisionDate) {
      missingFields.push('Yönetim Kurulu Karar Tarihi');
    }
    if (!boardDecisionBookNo || boardDecisionBookNo.trim() === '') {
      missingFields.push('Yönetim Karar Defteri No');
    }
    if (!tevkifatCenterId) {
      missingFields.push('Tevkifat Kurumu');
    }
    if (!tevkifatTitleId) {
      missingFields.push('Tevkifat Ünvanı');
    }
    if (!branchId) {
      missingFields.push('Şube');
    }

    return missingFields;
  }

  private validateRequiredFieldsForActivation(): string[] {
    const missingFields: string[] = [];

    if (
      !this._registrationNumber ||
      this._registrationNumber.getValue().trim() === ''
    ) {
      missingFields.push('Üye Numarası');
    }
    if (!this._boardDecisionDate) {
      missingFields.push('Yönetim Kurulu Karar Tarihi');
    }
    if (!this._boardDecisionBookNo || this._boardDecisionBookNo.trim() === '') {
      missingFields.push('Yönetim Karar Defteri No');
    }
    if (!this._tevkifatCenterId) {
      missingFields.push('Tevkifat Kurumu');
    }
    if (!this._tevkifatTitleId) {
      missingFields.push('Tevkifat Ünvanı');
    }
    if (!this._branchId) {
      missingFields.push('Şube');
    }

    return missingFields;
  }

  /**
   * Status transition için zorunlu alanları kontrol et
   */
  private validateRequiredFieldsForStatusTransition(
    newStatus: MemberStatus,
  ): string[] {
    const missingFields: string[] = [];

    if (
      !this._registrationNumber ||
      this._registrationNumber.getValue().trim() === ''
    ) {
      missingFields.push('Üye Numarası');
    }
    if (!this._boardDecisionDate) {
      missingFields.push('Yönetim Kurulu Karar Tarihi');
    }
    if (!this._boardDecisionBookNo || this._boardDecisionBookNo.trim() === '') {
      missingFields.push('Yönetim Karar Defteri No');
    }
    if (!this._tevkifatCenterId) {
      missingFields.push('Tevkifat Kurumu');
    }
    if (!this._tevkifatTitleId) {
      missingFields.push('Tevkifat Ünvanı');
    }
    if (!this._branchId) {
      missingFields.push('Şube');
    }

    return missingFields;
  }

  /**
   * Prisma update data'sına dönüştür
   */
  toPrismaUpdateData(): Record<string, any> {
    return {
      firstName: this._firstName,
      lastName: this._lastName,
      nationalId: this._nationalId.getValue(),
      phone: this._phone,
      email: this._email,
      status: this._status.toPrisma(),
      source: this._source,
      motherName: this._motherName,
      fatherName: this._fatherName,
      birthDate: this._birthDate,
      birthplace: this._birthplace,
      gender: this._gender,
      educationStatus: this._educationStatus,
      institutionId: this._institutionId,
      provinceId: this._provinceId,
      districtId: this._districtId,
      dutyUnit: this._dutyUnit,
      institutionAddress: this._institutionAddress,
      institutionProvinceId: this._institutionProvinceId,
      institutionDistrictId: this._institutionDistrictId,
      professionId: this._professionId,
      institutionRegNo: this._institutionRegNo,
      staffTitleCode: this._staffTitleCode,
      membershipInfoOptionId: this._membershipInfoOptionId,
      memberGroupId: this._memberGroupId,
      registrationNumber: this._registrationNumber?.getValue() || null,
      boardDecisionDate: this._boardDecisionDate,
      boardDecisionBookNo: this._boardDecisionBookNo,
      tevkifatCenterId: this._tevkifatCenterId,
      tevkifatTitleId: this._tevkifatTitleId,
      branchId: this._branchId,
      createdByUserId: this._createdByUserId,
      approvedByUserId: this._approvedByUserId,
      approvedAt: this._approvedAt,
      cancelledByUserId: this._cancelledByUserId,
      cancellationReason: this._cancellationReason,
      cancelledAt: this._cancelledAt,
      previousCancelledMemberId: this._previousCancelledMemberId,
      userId: this._userId,
      isActive: this._isActive,
      deletedAt: this._deletedAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Prisma create data'sına dönüştür
   */
  toPrismaCreateData(): Record<string, any> {
    return {
      ...this.toPrismaUpdateData(),
      id: this.id,
      createdAt: this._createdAt,
    };
  }
}
