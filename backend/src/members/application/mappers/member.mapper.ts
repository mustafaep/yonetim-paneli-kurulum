/**
 * Member Mapper
 *
 * Entity ↔ DTO mapping işlemleri
 *
 * Sorumluluklar:
 * - Domain Entity → Response DTO
 * - Request DTO → Domain Entity (create/update için)
 * - Prisma Model → Domain Entity (Repository'de kullanılır)
 */
import { Member } from '../../domain/entities/member.entity';
import { CreateMemberApplicationDto } from '../dto/create-member-application.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';

/**
 * Member Response DTO
 * API response için kullanılır
 */
export interface MemberResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  phone: string;
  email: string | null;
  status: string;
  source: string;
  registrationNumber: string | null;
  boardDecisionDate: Date | null;
  boardDecisionBookNo: string | null;
  motherName: string;
  fatherName: string;
  birthDate: Date;
  birthplace: string;
  gender: string;
  educationStatus: string;
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
  tevkifatCenterId: string | null;
  tevkifatTitleId: string | null;
  branchId: string | null;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class MemberMapper {
  /**
   * Domain Entity → Response DTO
   */
  static toResponseDto(member: Member): MemberResponseDto {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      nationalId: member.nationalId.getValue(),
      phone: member.phone,
      email: member.email,
      status: member.status.toString(),
      source: member.source,
      registrationNumber: member.registrationNumber?.getValue() || null,
      boardDecisionDate: member.boardDecisionDate,
      boardDecisionBookNo: member.boardDecisionBookNo,
      motherName: member.motherName,
      fatherName: member.fatherName,
      birthDate: member.birthDate,
      birthplace: member.birthplace,
      gender: member.gender,
      educationStatus: member.educationStatus,
      institutionId: member.institutionId,
      provinceId: member.provinceId,
      districtId: member.districtId,
      dutyUnit: member.dutyUnit,
      institutionAddress: member.institutionAddress,
      institutionProvinceId: member.institutionProvinceId,
      institutionDistrictId: member.institutionDistrictId,
      professionId: member.professionId,
      institutionRegNo: member.institutionRegNo,
      staffTitleCode: member.staffTitleCode,
      membershipInfoOptionId: member.membershipInfoOptionId,
      memberGroupId: member.memberGroupId,
      tevkifatCenterId: member.tevkifatCenterId,
      tevkifatTitleId: member.tevkifatTitleId,
      branchId: member.branchId,
      createdByUserId: member.createdByUserId,
      approvedByUserId: member.approvedByUserId,
      approvedAt: member.approvedAt,
      cancelledByUserId: member.cancelledByUserId,
      cancellationReason: member.cancellationReason,
      cancelledAt: member.cancelledAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }

  /**
   * Domain Entity list → Response DTO list
   */
  static toResponseDtoList(members: Member[]): MemberResponseDto[] {
    return members.map((member) => this.toResponseDto(member));
  }

  /**
   * Create DTO → Domain Entity Create Data
   * (Application Service'te kullanılır)
   */
  static createDtoToDomainData(dto: CreateMemberApplicationDto): any {
    // Bu mapping Application Service'te yapılıyor şu an
    // İleride buraya taşınabilir
    return dto;
  }

  /**
   * Update DTO → Domain Entity Update Data
   * (Application Service'te kullanılır)
   */
  static updateDtoToDomainData(dto: UpdateMemberDto): any {
    // Bu mapping Application Service'te yapılıyor şu an
    // İleride buraya taşınabilir
    return dto;
  }
}
