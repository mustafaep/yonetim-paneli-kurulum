import { ApiProperty } from '@nestjs/swagger';
import {
  Gender,
  EducationStatus,
  PositionTitle,
  MemberStatus,
} from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class UpdateMemberDto {
  @ApiProperty({
    description: 'Üye adı',
    example: 'Mehmet',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'Üye soyadı',
    example: 'Demir',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'TC Kimlik Numarası',
    example: '12345678901',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  nationalId?: string;

  @ApiProperty({
    description: 'Telefon numarası',
    example: '05551234567',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'E-posta adresi',
    example: 'mehmet.demir@example.com',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;

  // 🔹 Üyelik & Yönetim Kurulu Bilgileri
  @ApiProperty({
    description: 'Üyelik bilgisi seçeneği ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  membershipInfoOptionId?: string;

  @ApiProperty({
    description: 'Üye grubu ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  memberGroupId?: string;

  @ApiProperty({
    description: 'Üye kayıt numarası',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiProperty({
    description: 'Yönetim kurulu karar tarihi',
    type: String,
    format: 'date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  boardDecisionDate?: string;

  @ApiProperty({
    description: 'Yönetim kurulu karar defter no',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  boardDecisionBookNo?: string;

  // 🔹 Kimlik & Kişisel Bilgiler
  @ApiProperty({
    description: 'Anne adı',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  motherName?: string;

  @ApiProperty({
    description: 'Baba adı',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  fatherName?: string;

  @ApiProperty({
    description: 'Doğum yeri',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  birthplace?: string;

  @ApiProperty({
    description: 'Cinsiyet',
    enum: Gender,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  // 🔹 Eğitim & İletişim Bilgileri
  @ApiProperty({
    description: 'Öğrenim durumu',
    enum: EducationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(EducationStatus)
  educationStatus?: EducationStatus;

  @ApiProperty({
    description: 'Doğum tarihi',
    type: String,
    format: 'date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  // 🔹 İkamet Bilgileri
  @ApiProperty({
    description: 'İkamet ili ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiProperty({
    description: 'İkamet ilçesi ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  districtId?: string;

  // 🔹 Çalışma & Kurum Bilgileri
  @ApiProperty({
    description: 'Çalıştığı kurum ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  institutionId?: string;

  @ApiProperty({
    description: 'Tevkifat merkezi ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  tevkifatCenterId?: string;

  @ApiProperty({
    description: 'Tevkifat ünvanı ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  tevkifatTitleId?: string;

  @ApiProperty({
    description: 'Bağlı olduğu şube ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  branchId?: string;

  // 🔹 Kurum Detay Bilgileri
  @ApiProperty({
    description: 'Görev Birimi',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  dutyUnit?: string;

  @ApiProperty({
    description: 'Kurum Adresi',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  institutionAddress?: string;

  @ApiProperty({
    description: 'Kurum İli ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  institutionProvinceId?: string;

  @ApiProperty({
    description: 'Kurum İlçesi ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  institutionDistrictId?: string;

  @ApiProperty({
    description: 'Meslek/Unvan ID',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  professionId?: string;

  @ApiProperty({
    description: 'Kurum Sicil No',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  institutionRegNo?: string;

  @ApiProperty({
    description: 'Kadro Unvan Kodu',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  staffTitleCode?: string;

  // 🔹 Üye Durumu
  @ApiProperty({
    description: 'Üye durumu',
    enum: MemberStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiProperty({
    description: 'İptal nedeni (İstifa veya İhraç durumları için)',
    example: 'İstifa talebi',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}
