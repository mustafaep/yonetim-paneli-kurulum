import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { parseCsvBuffer } from '../../utils/csv-parser';
import {
  MEMBER_IMPORT_HEADER_ALIASES,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  PREVIEW_ROWS,
} from '../../constants/member-import-schema';
import { Gender, EducationStatus } from '@prisma/client';

export type RowStatus = 'valid' | 'warning' | 'error';

export interface RowError {
  column?: string;
  message: string;
}

export interface PreviewRow {
  rowIndex: number;
  data: Record<string, string>;
  status: RowStatus;
  errors?: RowError[];
}

export interface ValidateMemberImportResult {
  totalRows: number;
  previewRows: PreviewRow[];
  errors: { rowIndex: number; column?: string; message: string }[];
  summary: { valid: number; warning: number; error: number };
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: { rowIndex: number; column?: string; message: string }[];
  duplicateNationalIds: string[];
}

/** İsimden id bulmak için normalize: trim, lowercase, Türkçe karakterleri düzelt */
function normalizeName(s: string): string {
  return (s ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** CUID benzeri mi (c ile başlar, 25 karakter) */
function looksLikeId(value: string): boolean {
  return /^c[a-z0-9]{24}$/i.test((value || '').trim());
}

/** CSV hücresini güvenli yaz: ; \n " içeriyorsa tırnakla sar ve " → "" */
function escapeCsvCell(value: string): string {
  const s = value ?? '';
  if (/[;"\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Telefon numarasını normalize eder → her zaman "05XXXXXXXXX" (11 hane) formatına çevirir.
 * Desteklenen formatlar:
 *   +905551234567 → 05551234567
 *   905551234567  → 05551234567
 *   05551234567   → 05551234567
 *   5551234567    → 05551234567
 *   0(555)1234567 → 05551234567
 */
function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // 12 hane: 905551234567 → 05551234567
  if (digits.length === 12 && digits.startsWith('90')) {
    return '0' + digits.slice(2);
  }
  // 11 hane: 05551234567 → olduğu gibi
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits;
  }
  // 10 hane: 5551234567 → 05551234567
  if (digits.length === 10) {
    return '0' + digits;
  }
  // Diğer → trim
  return phone.trim();
}

/** Doğum tarihini normalize eder: YYYY-MM-DD veya DD-MM-YYYY / DD.MM.YYYY → her zaman YYYY-MM-DD döner */
function normalizeBirthDate(input: string): string | null {
  if (!input) return null;
  const value = input.trim();

  // YYYY-MM-DD veya YYYY.MM.DD
  let match = value.match(/^(\d{4})[-.](\d{2})[-.](\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m}-${d}`;
  }

  // DD-MM-YYYY veya DD.MM.YYYY
  match = value.match(/^(\d{2})[-.](\d{2})[-.](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m}-${d}`;
  }

  return null;
}

@Injectable()
export class MemberImportValidationService {
  private readonly logger = new Logger(MemberImportValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Türkçe Excel uyumlu CSV şablonu döndürür (noktalı virgül ayırıcı).
   * Örnek satır tüm alanlar dolu ve sistemdeki referanslarla (il/ilçe/kurum/şube vb.) doldurulur; doğrulama geçer ve kaydedilebilir.
   */
  async getTemplateCsv(): Promise<string> {
    const sep = ';';
    const headers =
      'Ad;Soyad;Üye Kayıt No;TC Kimlik No;Telefon;E-posta;Anne Adı;Baba Adı;Doğum Tarihi;Doğum Yeri;Cinsiyet;Öğrenim Durumu;İl;İlçe;Kurum;Şube;Tevkifat Merkezi;Tevkifat Ünvanı;Üye Grubu;Görev Birimi;Kurum Adresi;Kurum İli;Kurum İlçesi;Meslek;Kurum Sicil No;Kadro Unvan Kodu';

    const province = await this.prisma.province.findFirst({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    let district = province
      ? await this.prisma.district.findFirst({
          where: { provinceId: province.id },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        })
      : null;
    if (!district) {
      district = await this.prisma.district.findFirst({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
    }
    let institution = district
      ? await this.prisma.institution.findFirst({
          where: { deletedAt: null, districtId: district.id },
          orderBy: { name: 'asc' },
          select: { name: true },
        })
      : null;
    if (!institution) {
      institution = await this.prisma.institution.findFirst({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { name: true },
      });
    }
    const [branch, tevkifatCenter, tevkifatTitle, memberGroup, profession] =
      await Promise.all([
        this.prisma.branch.findFirst({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { name: true },
        }),
        this.prisma.tevkifatCenter.findFirst({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { name: true },
        }),
        this.prisma.tevkifatTitle.findFirst({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { name: true },
        }),
        this.prisma.memberGroup.findFirst({
          orderBy: { name: 'asc' },
          select: { name: true },
        }),
        this.prisma.profession.findFirst({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { name: true },
        }),
      ]);

    const provinceName = province?.name ?? 'İl';
    const districtName = district?.name ?? 'İlçe';
    const institutionName = institution?.name ?? 'Kurum';

    const exampleRow = [
      'Mehmet',
      'Demir',
      'TR-2026-0001',
      '12345678901',
      '05551234567',
      'mehmet@ornek.com',
      'Ayşe',
      'Ali',
      '1990-01-15',
      'İstanbul',
      'Erkek',
      'Üniversite',
      provinceName,
      districtName,
      institutionName,
      branch?.name ?? '',
      tevkifatCenter?.name ?? '',
      tevkifatTitle?.name ?? '',
      memberGroup?.name ?? '',
      'Acil Servis',
      'Örnek Mah. Test Sok. No:1',
      provinceName,
      districtName,
      profession?.name ?? '',
      '12345',
      'K001',
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(sep);

    const csv = '\uFEFF' + headers + '\n' + exampleRow + '\n';
    return csv;
  }

  /** 10 rastgele üyeyi aynı CSV formatında (noktalı virgül) döndürür. Test/örnek veri için. */
  async getSampleMembersCsv(count = 10): Promise<string> {
    const sep = ';';
    const headers =
      'Ad;Soyad;Üye Kayıt No;TC Kimlik No;Telefon;E-posta;Anne Adı;Baba Adı;Doğum Tarihi;Doğum Yeri;Cinsiyet;Öğrenim Durumu;İl;İlçe;Kurum;Şube;Tevkifat Merkezi;Tevkifat Ünvanı;Üye Grubu;Görev Birimi;Kurum Adresi;Kurum İli;Kurum İlçesi;Meslek;Kurum Sicil No;Kadro Unvan Kodu';

    // Sadece aktif üyeleri al; silinmiş kurum ve eksik zorunlu alan olanları hariç tut
    // Not: birthDate, provinceId, districtId, institutionId Prisma'da zorunlu alan (non-nullable),
    // dolayısıyla { not: null } filtresi gereksiz – TypeScript de kabul etmez.
    const members = await this.prisma.member.findMany({
      where: {
        status: { in: ['ACTIVE', 'PENDING'] },
        cancelledAt: null,
        institution: { deletedAt: null },
        firstName: { not: '' },
        lastName: { not: '' },
        nationalId: { not: '' },
        phone: { not: '' },
        motherName: { not: '' },
        fatherName: { not: '' },
        birthplace: { not: '' },
      },
      take: Math.max(count * 3, 30),
      include: {
        province: { select: { name: true } },
        district: { select: { name: true } },
        institution: { select: { name: true } },
        branch: { select: { name: true } },
        tevkifatCenter: { select: { name: true } },
        tevkifatTitle: { select: { name: true } },
        memberGroup: { select: { name: true } },
        profession: { select: { name: true } },
        institutionProvince: { select: { name: true } },
        institutionDistrict: { select: { name: true } },
      },
    });

    const shuffled = [...members].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    const genderTr = (g: string | null) =>
      g === 'MALE'
        ? 'Erkek'
        : g === 'FEMALE'
          ? 'Kadın'
          : g === 'OTHER'
            ? 'Diğer'
            : '';
    const educationTr = (e: string | null) =>
      e === 'PRIMARY'
        ? 'İlkokul'
        : e === 'HIGH_SCHOOL'
          ? 'Lise'
          : e === 'COLLEGE'
            ? 'Üniversite'
            : '';
    const dateStr = (d: Date | null) =>
      d ? new Date(d).toISOString().slice(0, 10) : '';

    const rows = selected.map((m) =>
      [
        m.firstName ?? '',
        m.lastName ?? '',
        m.registrationNumber ?? '',
        m.nationalId ?? '',
        normalizePhone(m.phone),
        m.email ?? '',
        m.motherName ?? '',
        m.fatherName ?? '',
        dateStr(m.birthDate),
        m.birthplace ?? '',
        genderTr(m.gender),
        educationTr(m.educationStatus),
        m.province?.name ?? '',
        m.district?.name ?? '',
        m.institution?.name ?? '',
        m.branch?.name ?? '',
        m.tevkifatCenter?.name ?? '',
        m.tevkifatTitle?.name ?? '',
        m.memberGroup?.name ?? '',
        m.dutyUnit ?? '',
        m.institutionAddress ?? '',
        m.institutionProvince?.name ?? '',
        m.institutionDistrict?.name ?? '',
        m.profession?.name ?? '',
        m.institutionRegNo ?? '',
        m.staffTitleCode ?? '',
      ]
        .map((cell) => escapeCsvCell(String(cell)))
        .join(sep),
    );

    if (rows.length === 0) {
      const csv = '\uFEFF' + headers + '\n';
      return csv;
    }

    const csv = '\uFEFF' + headers + '\n' + rows.join('\n') + '\n';
    return csv;
  }

  async validate(
    file: Express.Multer.File,
  ): Promise<ValidateMemberImportResult> {
    const buffer =
      file?.buffer ?? (file as unknown as { buffer?: Buffer })?.buffer;
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new BadRequestException('Dosya yüklenmedi veya geçersiz.');
    }
    if (buffer.length > MAX_IMPORT_FILE_BYTES) {
      throw new BadRequestException(
        `Dosya boyutu ${MAX_IMPORT_FILE_BYTES / 1024 / 1024} MB sınırını aşamaz.`,
      );
    }

    const { headers: rawHeaders, rows: rawRows } = parseCsvBuffer(buffer);
    if (rawHeaders.length === 0) {
      throw new BadRequestException('CSV dosyasında başlık satırı bulunamadı.');
    }

    const headerMap = this.normalizeHeaders(rawHeaders);
    const totalRows = rawRows.length;
    if (totalRows > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `En fazla ${MAX_IMPORT_ROWS} satır yükleyebilirsiniz. Mevcut: ${totalRows}.`,
      );
    }

    const refs = await this.loadReferenceData();
    const previewRows: PreviewRow[] = [];
    const allErrors: { rowIndex: number; column?: string; message: string }[] =
      [];
    let valid = 0;
    let warning = 0;
    let error = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const rowIndex = i + 2;
      const rawRow = rawRows[i];
      const data: Record<string, string> = {};
      rawHeaders.forEach((h, j) => {
        const key = headerMap[j] ?? `col_${j}`;
        data[key] = (rawRow[j] ?? '').trim();
      });

      const { status, errors: rowErrors } = this.validateRow(data, refs);
      if (status === 'valid') valid++;
      else if (status === 'warning') warning++;
      else error++;

      rowErrors.forEach((e) =>
        allErrors.push({
          rowIndex,
          column: e.column,
          message: e.message,
        }),
      );

      if (i < PREVIEW_ROWS) {
        previewRows.push({
          rowIndex,
          data,
          status,
          errors: rowErrors.length > 0 ? rowErrors : undefined,
        });
      }
    }

    return {
      totalRows,
      previewRows,
      errors: allErrors,
      summary: { valid, warning, error },
    };
  }

  /**
   * CSV dosyasındaki geçerli satırları veritabanına kaydeder.
   * Hatalı satırları atlar. Duplicate nationalId'leri raporlar.
   */
  async bulkImport(
    file: Express.Multer.File,
    userId: string,
    skipErrors: boolean,
    makeActive = false,
  ): Promise<BulkImportResult> {
    const buffer =
      file?.buffer ?? (file as unknown as { buffer?: Buffer })?.buffer;
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new BadRequestException('Dosya yüklenmedi veya geçersiz.');
    }
    if (buffer.length > MAX_IMPORT_FILE_BYTES) {
      throw new BadRequestException(
        `Dosya boyutu ${MAX_IMPORT_FILE_BYTES / 1024 / 1024} MB sınırını aşamaz.`,
      );
    }

    const { headers: rawHeaders, rows: rawRows } = parseCsvBuffer(buffer);
    if (rawHeaders.length === 0) {
      throw new BadRequestException('CSV dosyasında başlık satırı bulunamadı.');
    }

    const headerMap = this.normalizeHeaders(rawHeaders);
    if (rawRows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `En fazla ${MAX_IMPORT_ROWS} satır yükleyebilirsiniz. Mevcut: ${rawRows.length}.`,
      );
    }

    const refs = await this.loadReferenceData();
    const allErrors: { rowIndex: number; column?: string; message: string }[] =
      [];
    const duplicateNationalIds: string[] = [];
    const existingRegistrationNumbers = new Set<string>();

    // Aynı TC ile yeni satır yalnızca iptal sonrası olabilir; import "açık" kayıt varsa engeller
    const existingNationalIds = new Set<string>();
    const blockingMembers = await this.prisma.member.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        status: {
          in: ['PENDING', 'APPROVED', 'ACTIVE', 'REJECTED'],
        },
      },
      select: { nationalId: true },
    });
    blockingMembers.forEach((m) => existingNationalIds.add(m.nationalId));
    const membersWithRegistrationNumber = await this.prisma.member.findMany({
      where: {
        deletedAt: null,
        registrationNumber: { not: null },
      },
      select: { registrationNumber: true },
    });
    membersWithRegistrationNumber.forEach((m) => {
      const value = m.registrationNumber?.trim();
      if (value) existingRegistrationNumbers.add(value);
    });

    // CSV içi duplicate kontrolü
    const csvNationalIds = new Set<string>();
    const csvRegistrationNumbers = new Set<string>();

    // Geçerli satırları hazırla
    interface MemberCreateData {
      rowIndex: number;
      data: {
        firstName: string;
        lastName: string;
          registrationNumber?: string;
        nationalId: string;
        phone: string;
        email: string | null;
        motherName: string;
        fatherName: string;
        birthDate: Date;
        birthplace: string;
        gender: Gender;
        educationStatus: EducationStatus;
        provinceId: string;
        districtId: string;
        institutionId: string;
        branchId?: string;
        tevkifatCenterId?: string;
        tevkifatTitleId?: string;
        memberGroupId?: string;
        dutyUnit?: string;
        institutionAddress?: string;
        institutionProvinceId?: string;
        institutionDistrictId?: string;
        professionId?: string;
        institutionRegNo?: string;
        staffTitleCode?: string;
        source: 'OTHER';
        status: 'PENDING' | 'ACTIVE';
        createdByUserId: string;
        approvedByUserId?: string;
        approvedAt?: Date;
      };
    }

    const validRows: MemberCreateData[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowIndex = i + 2;
      const rawRow = rawRows[i];
      const data: Record<string, string> = {};
      rawHeaders.forEach((h, j) => {
        const key = headerMap[j] ?? `col_${j}`;
        data[key] = (rawRow[j] ?? '').trim();
      });

      // Satırı doğrula
      const { status, errors: rowErrors } = this.validateRow(data, refs);
      if (status === 'error') {
        rowErrors.forEach((e) =>
          allErrors.push({ rowIndex, column: e.column, message: e.message }),
        );
        if (!skipErrors) {
          throw new BadRequestException({
            message: `Satır ${rowIndex} hatalı. Önce tüm hataları düzeltin veya "Hatalıları atla" seçeneğini kullanın.`,
            errors: allErrors,
          });
        }
        continue;
      }

      const get = (key: string) => (data[key] ?? '').trim();
      const nationalId = get('nationalId');
      const registrationNumber = get('registrationNumber');

      // Mevcut üye duplicate kontrolü
      if (existingNationalIds.has(nationalId)) {
        duplicateNationalIds.push(nationalId);
        allErrors.push({
          rowIndex,
          column: 'nationalId',
          message: `TC Kimlik No zaten kayıtlı: ${nationalId}`,
        });
        continue;
      }

      // CSV içi duplicate kontrolü
      if (csvNationalIds.has(nationalId)) {
        duplicateNationalIds.push(nationalId);
        allErrors.push({
          rowIndex,
          column: 'nationalId',
          message: `TC Kimlik No CSV içinde tekrar ediyor: ${nationalId}`,
        });
        continue;
      }
      csvNationalIds.add(nationalId);

      if (registrationNumber) {
        if (existingRegistrationNumbers.has(registrationNumber)) {
          allErrors.push({
            rowIndex,
            column: 'registrationNumber',
            message: `Üye kayıt no zaten kayıtlı: ${registrationNumber}`,
          });
          continue;
        }
        if (csvRegistrationNumbers.has(registrationNumber)) {
          allErrors.push({
            rowIndex,
            column: 'registrationNumber',
            message: `Üye kayıt no CSV içinde tekrar ediyor: ${registrationNumber}`,
          });
          continue;
        }
        csvRegistrationNumbers.add(registrationNumber);
      }

      // Referans alanları çöz (isim → id)
      const resolved = this.resolveRow(data, refs);
      if (!resolved) {
        allErrors.push({ rowIndex, message: 'Referans alanları çözülemedi.' });
        continue;
      }

      const email = get('email');
      const gender = this.normalizeGender(get('gender'))!;
      const educationStatus = this.normalizeEducation(get('educationStatus'))!;

      const birthDateStr = get('birthDate');
      const birthDateNormalized = normalizeBirthDate(birthDateStr)!;

      validRows.push({
        rowIndex,
        data: {
          firstName: get('firstName'),
          lastName: get('lastName'),
          registrationNumber: registrationNumber || undefined,
          nationalId,
          phone: normalizePhone(get('phone')),
          email: email || null,
          motherName: get('motherName'),
          fatherName: get('fatherName'),
          birthDate: new Date(birthDateNormalized),
          birthplace: get('birthplace'),
          gender,
          educationStatus,
          provinceId: resolved.provinceId,
          districtId: resolved.districtId,
          institutionId: resolved.institutionId,
          branchId: resolved.branchId || undefined,
          tevkifatCenterId: resolved.tevkifatCenterId || undefined,
          tevkifatTitleId: resolved.tevkifatTitleId || undefined,
          memberGroupId: resolved.memberGroupId || undefined,
          dutyUnit: get('dutyUnit') || undefined,
          institutionAddress: get('institutionAddress') || undefined,
          institutionProvinceId: resolved.institutionProvinceId || undefined,
          institutionDistrictId: resolved.institutionDistrictId || undefined,
          professionId: resolved.professionId || undefined,
          institutionRegNo: get('institutionRegNo') || undefined,
          staffTitleCode: get('staffTitleCode') || undefined,
          source: 'OTHER' as const,
          status: makeActive ? ('ACTIVE' as const) : ('PENDING' as const),
          createdByUserId: userId,
          approvedByUserId: makeActive ? userId : undefined,
          approvedAt: makeActive ? new Date() : undefined,
        },
      });
    }

    if (validRows.length === 0) {
      return {
        imported: 0,
        skipped: rawRows.length,
        errors: allErrors,
        duplicateNationalIds,
      };
    }

    // Toplu kayıt – transaction ile
    let imported = 0;
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          try {
            await tx.member.create({ data: row.data });
            imported++;
          } catch (err: any) {
            // Unique constraint violation (nationalId duplicate race condition)
            if (err?.code === 'P2002') {
              duplicateNationalIds.push(row.data.nationalId);
              allErrors.push({
                rowIndex: row.rowIndex,
                column: 'nationalId',
                message: `TC Kimlik No zaten kayıtlı (veritabanı): ${row.data.nationalId}`,
              });
            } else {
              allErrors.push({
                rowIndex: row.rowIndex,
                message: `Kayıt hatası: ${err?.message ?? 'Bilinmeyen hata'}`,
              });
            }
          }
        }
      });
    } catch (err: any) {
      this.logger.error(
        'Toplu üye kayıt transaction hatası',
        err?.stack ?? err,
      );
      throw new BadRequestException(
        'Toplu kayıt sırasında bir hata oluştu. Hiçbir üye kaydedilmedi.',
      );
    }

    this.logger.log(
      `Toplu üye kayıt tamamlandı: ${imported} kayıt, ${rawRows.length - imported} atlandı`,
    );

    return {
      imported,
      skipped: rawRows.length - imported,
      errors: allErrors,
      duplicateNationalIds,
    };
  }

  private normalizeHeaders(rawHeaders: string[]): string[] {
    return rawHeaders.map((h) => {
      const trimmed = (h ?? '').trim();
      const alias = MEMBER_IMPORT_HEADER_ALIASES[trimmed];
      if (alias) return alias;
      if (trimmed.indexOf(' ') === -1 && /^[a-zA-Z]+$/.test(trimmed)) {
        const lower = trimmed.toLowerCase();
        const camel = lower.charAt(0) + lower.slice(1);
        return camel;
      }
      return trimmed || '';
    });
  }

  private async loadReferenceData() {
    const [
      provinces,
      districts,
      branches,
      institutions,
      professions,
      memberGroups,
      tevkifatCenters,
      tevkifatTitles,
    ] = await Promise.all([
      this.prisma.province.findMany({ select: { id: true, name: true } }),
      this.prisma.district.findMany({
        include: { province: { select: { name: true } } },
      }),
      this.prisma.branch.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.institution.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.profession.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.memberGroup.findMany({
        select: { id: true, name: true },
      }),
      this.prisma.tevkifatCenter.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.tevkifatTitle.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
    ]);

    const provinceByName = new Map(
      provinces.map((p) => [normalizeName(p.name), p.id]),
    );
    const districtByName = new Map<string, string>();
    districts.forEach((d) => {
      const key = normalizeName(d.name);
      const keyWithProvince = normalizeName(d.province.name) + '|' + key;
      districtByName.set(key, d.id);
      districtByName.set(keyWithProvince, d.id);
    });
    const branchByName = new Map(
      branches.map((b) => [normalizeName(b.name), b.id]),
    );
    const institutionByName = new Map(
      institutions.map((i) => [normalizeName(i.name), i.id]),
    );
    const professionByName = new Map(
      professions.map((p) => [normalizeName(p.name), p.id]),
    );
    const memberGroupByName = new Map(
      memberGroups.map((g) => [normalizeName(g.name), g.id]),
    );
    const tevkifatCenterByName = new Map(
      tevkifatCenters.map((c) => [normalizeName(c.name), c.id]),
    );
    const tevkifatTitleByName = new Map(
      tevkifatTitles.map((t) => [normalizeName(t.name), t.id]),
    );

    return {
      provinces: new Map(provinces.map((p) => [p.id, p])),
      districts: new Map(districts.map((d) => [d.id, d])),
      provinceByName,
      districtByName,
      branchByName,
      institutionByName,
      professionByName,
      memberGroupByName,
      tevkifatCenterByName,
      tevkifatTitleByName,
      branchIds: new Set(branches.map((b) => b.id)),
      institutionIds: new Set(institutions.map((i) => i.id)),
      provinceIds: new Set(provinces.map((p) => p.id)),
      districtIds: new Set(districts.map((d) => d.id)),
      professionIds: new Set(professions.map((p) => p.id)),
      memberGroupIds: new Set(memberGroups.map((g) => g.id)),
      tevkifatCenterIds: new Set(tevkifatCenters.map((c) => c.id)),
      tevkifatTitleIds: new Set(tevkifatTitles.map((t) => t.id)),
    };
  }

  /**
   * Satır verilerindeki isimleri (il, ilçe, kurum vb.) ID'ye çözer.
   * Doğrulama zaten geçmiş olduğu varsayılır.
   */
  private resolveRow(
    data: Record<string, string>,
    refs: Awaited<
      ReturnType<MemberImportValidationService['loadReferenceData']>
    >,
  ): {
    provinceId: string;
    districtId: string;
    institutionId: string;
    branchId: string | null;
    tevkifatCenterId: string | null;
    tevkifatTitleId: string | null;
    memberGroupId: string | null;
    institutionProvinceId: string | null;
    institutionDistrictId: string | null;
    professionId: string | null;
  } | null {
    const get = (key: string) => (data[key] ?? '').trim();

    const resolveId = (
      value: string,
      idsSet: Set<string>,
      nameMap: Map<string, string>,
    ): string | null => {
      if (!value) return null;
      if (looksLikeId(value) && idsSet.has(value)) return value;
      return nameMap.get(normalizeName(value)) ?? null;
    };

    const provinceId = resolveId(
      get('provinceId'),
      refs.provinceIds,
      refs.provinceByName,
    );
    if (!provinceId) return null;

    // İlçe çözümü (il ile birlikte)
    const districtVal = get('districtId');
    let districtId: string | null = null;
    if (districtVal) {
      if (looksLikeId(districtVal) && refs.districtIds.has(districtVal)) {
        districtId = districtVal;
      } else {
        const key = normalizeName(districtVal);
        const prov = refs.provinces.get(provinceId);
        const keyWithProv = prov ? normalizeName(prov.name) + '|' + key : key;
        districtId =
          refs.districtByName.get(keyWithProv) ??
          refs.districtByName.get(key) ??
          null;
      }
    }
    if (!districtId) return null;

    const institutionId = resolveId(
      get('institutionId'),
      refs.institutionIds,
      refs.institutionByName,
    );
    if (!institutionId) return null;

    const branchId = resolveId(
      get('branchId'),
      refs.branchIds,
      refs.branchByName,
    );
    const tevkifatCenterId = resolveId(
      get('tevkifatCenterId'),
      refs.tevkifatCenterIds,
      refs.tevkifatCenterByName,
    );
    const tevkifatTitleId = resolveId(
      get('tevkifatTitleId'),
      refs.tevkifatTitleIds,
      refs.tevkifatTitleByName,
    );
    const memberGroupId = resolveId(
      get('memberGroupId'),
      refs.memberGroupIds,
      refs.memberGroupByName,
    );
    const institutionProvinceId = resolveId(
      get('institutionProvinceId'),
      refs.provinceIds,
      refs.provinceByName,
    );

    // Kurum ilçesi
    const instDistrictVal = get('institutionDistrictId');
    let institutionDistrictId: string | null = null;
    if (instDistrictVal) {
      if (
        looksLikeId(instDistrictVal) &&
        refs.districtIds.has(instDistrictVal)
      ) {
        institutionDistrictId = instDistrictVal;
      } else {
        const key = normalizeName(instDistrictVal);
        if (institutionProvinceId) {
          const prov = refs.provinces.get(institutionProvinceId);
          const keyWithProv = prov ? normalizeName(prov.name) + '|' + key : key;
          institutionDistrictId =
            refs.districtByName.get(keyWithProv) ??
            refs.districtByName.get(key) ??
            null;
        } else {
          institutionDistrictId = refs.districtByName.get(key) ?? null;
        }
      }
    }

    const professionId = resolveId(
      get('professionId'),
      refs.professionIds,
      refs.professionByName,
    );

    return {
      provinceId,
      districtId,
      institutionId,
      branchId,
      tevkifatCenterId,
      tevkifatTitleId,
      memberGroupId,
      institutionProvinceId,
      institutionDistrictId,
      professionId,
    };
  }

  private validateRow(
    data: Record<string, string>,
    refs: Awaited<
      ReturnType<MemberImportValidationService['loadReferenceData']>
    >,
  ): { status: RowStatus; errors: RowError[] } {
    const errors: RowError[] = [];

    const get = (key: string) => (data[key] ?? '').trim();

    const firstName = get('firstName');
    const lastName = get('lastName');
    const nationalId = get('nationalId');
    const phone = get('phone');
    const motherName = get('motherName');
    const fatherName = get('fatherName');
    const birthDateRaw = get('birthDate');
    const birthDateNormalized = normalizeBirthDate(birthDateRaw);
    const birthplace = get('birthplace');
    const gender = get('gender');
    const educationStatus = get('educationStatus');
    const provinceId = get('provinceId');
    const districtId = get('districtId');
    const institutionId = get('institutionId');

    if (!firstName)
      errors.push({ column: 'firstName', message: 'Ad zorunludur.' });
    if (!lastName)
      errors.push({ column: 'lastName', message: 'Soyad zorunludur.' });
    if (!nationalId) {
      errors.push({
        column: 'nationalId',
        message: 'TC Kimlik No zorunludur.',
      });
    } else if (!/^\d{11}$/.test(nationalId)) {
      errors.push({
        column: 'nationalId',
        message: 'TC Kimlik No 11 haneli rakam olmalıdır.',
      });
    }
    if (!phone) {
      errors.push({ column: 'phone', message: 'Telefon zorunludur.' });
    } else {
      // Telefonu normalize et ve doğrula
      const phoneNormalized = normalizePhone(phone);
      if (!/^0[0-9]{10}$/.test(phoneNormalized)) {
        errors.push({
          column: 'phone',
          message: 'Geçerli bir telefon numarası giriniz (örn: 05551234567).',
        });
      }
    }
    const email = get('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({
        column: 'email',
        message: 'Geçerli bir e-posta adresi giriniz.',
      });
    }
    if (!motherName)
      errors.push({ column: 'motherName', message: 'Anne adı zorunludur.' });
    if (!fatherName)
      errors.push({ column: 'fatherName', message: 'Baba adı zorunludur.' });
    if (!birthDateRaw) {
      errors.push({
        column: 'birthDate',
        message: 'Doğum tarihi zorunludur.',
      });
    } else if (!birthDateNormalized) {
      errors.push({
        column: 'birthDate',
        message: 'Doğum tarihi YYYY-MM-DD veya DD-MM-YYYY formatında olmalıdır.',
      });
    }
    if (!birthplace)
      errors.push({ column: 'birthplace', message: 'Doğum yeri zorunludur.' });
    if (!gender) {
      errors.push({
        column: 'gender',
        message:
          'Cinsiyet zorunludur (Erkek/Kadın/Diğer veya MALE/FEMALE/OTHER).',
      });
    } else {
      const g = this.normalizeGender(gender);
      if (!g) {
        errors.push({
          column: 'gender',
          message:
            'Cinsiyet: Erkek, Kadın, Diğer veya MALE, FEMALE, OTHER olmalıdır.',
        });
      }
    }
    if (!educationStatus) {
      errors.push({
        column: 'educationStatus',
        message:
          'Öğrenim durumu zorunludur (İlkokul/Lise/Üniversite veya PRIMARY/HIGH_SCHOOL/COLLEGE).',
      });
    } else {
      const e = this.normalizeEducation(educationStatus);
      if (!e) {
        errors.push({
          column: 'educationStatus',
          message:
            'Öğrenim: İlkokul, Lise, Üniversite veya PRIMARY, HIGH_SCHOOL, COLLEGE olmalıdır.',
        });
      }
    }

    let resolvedProvinceId: string | null = null;
    if (provinceId) {
      if (looksLikeId(provinceId) && refs.provinceIds.has(provinceId)) {
        resolvedProvinceId = provinceId;
      } else {
        const found = refs.provinceByName.get(normalizeName(provinceId));
        if (found) resolvedProvinceId = found;
        else
          errors.push({
            column: 'provinceId',
            message: `İl bulunamadı: ${provinceId}`,
          });
      }
    } else {
      errors.push({ column: 'provinceId', message: 'İl zorunludur.' });
    }

    let resolvedDistrictId: string | null = null;
    if (districtId) {
      if (looksLikeId(districtId) && refs.districtIds.has(districtId)) {
        resolvedDistrictId = districtId;
      } else {
        const key = normalizeName(districtId);
        const keyWithProv = resolvedProvinceId
          ? normalizeName(refs.provinces.get(resolvedProvinceId)?.name ?? '') +
            '|' +
            key
          : key;
        const found =
          refs.districtByName.get(keyWithProv) ?? refs.districtByName.get(key);
        if (found) resolvedDistrictId = found;
        else
          errors.push({
            column: 'districtId',
            message: `İlçe bulunamadı: ${districtId}`,
          });
      }
    } else {
      errors.push({ column: 'districtId', message: 'İlçe zorunludur.' });
    }

    let resolvedInstitutionId: string | null = null;
    if (institutionId) {
      if (
        looksLikeId(institutionId) &&
        refs.institutionIds.has(institutionId)
      ) {
        resolvedInstitutionId = institutionId;
      } else {
        const found = refs.institutionByName.get(normalizeName(institutionId));
        if (found) resolvedInstitutionId = found;
        else
          errors.push({
            column: 'institutionId',
            message: `Kurum bulunamadı: ${institutionId}`,
          });
      }
    } else {
      errors.push({ column: 'institutionId', message: 'Kurum zorunludur.' });
    }

    const branchId = get('branchId');
    if (branchId) {
      if (looksLikeId(branchId)) {
        if (!refs.branchIds.has(branchId)) {
          errors.push({
            column: 'branchId',
            message: `Şube bulunamadı: ${branchId}`,
          });
        }
      } else {
        const found = refs.branchByName.get(normalizeName(branchId));
        if (!found) {
          errors.push({
            column: 'branchId',
            message: `Şube bulunamadı: ${branchId}`,
          });
        }
      }
    }

    // Opsiyonel referans alanlarını da kontrol et (varsa geçerli olmalı)
    const tevkifatCenterId = get('tevkifatCenterId');
    if (tevkifatCenterId) {
      if (looksLikeId(tevkifatCenterId)) {
        if (!refs.tevkifatCenterIds.has(tevkifatCenterId)) {
          errors.push({
            column: 'tevkifatCenterId',
            message: `Tevkifat Merkezi bulunamadı: ${tevkifatCenterId}`,
          });
        }
      } else {
        const found = refs.tevkifatCenterByName.get(
          normalizeName(tevkifatCenterId),
        );
        if (!found) {
          errors.push({
            column: 'tevkifatCenterId',
            message: `Tevkifat Merkezi bulunamadı: ${tevkifatCenterId}`,
          });
        }
      }
    }

    const tevkifatTitleId = get('tevkifatTitleId');
    if (tevkifatTitleId) {
      if (looksLikeId(tevkifatTitleId)) {
        if (!refs.tevkifatTitleIds.has(tevkifatTitleId)) {
          errors.push({
            column: 'tevkifatTitleId',
            message: `Tevkifat Ünvanı bulunamadı: ${tevkifatTitleId}`,
          });
        }
      } else {
        const found = refs.tevkifatTitleByName.get(
          normalizeName(tevkifatTitleId),
        );
        if (!found) {
          errors.push({
            column: 'tevkifatTitleId',
            message: `Tevkifat Ünvanı bulunamadı: ${tevkifatTitleId}`,
          });
        }
      }
    }

    const memberGroupId = get('memberGroupId');
    if (memberGroupId) {
      if (looksLikeId(memberGroupId)) {
        if (!refs.memberGroupIds.has(memberGroupId)) {
          errors.push({
            column: 'memberGroupId',
            message: `Üye Grubu bulunamadı: ${memberGroupId}`,
          });
        }
      } else {
        const found = refs.memberGroupByName.get(normalizeName(memberGroupId));
        if (!found) {
          errors.push({
            column: 'memberGroupId',
            message: `Üye Grubu bulunamadı: ${memberGroupId}`,
          });
        }
      }
    }

    const professionVal = get('professionId');
    if (professionVal) {
      if (looksLikeId(professionVal)) {
        if (!refs.professionIds.has(professionVal)) {
          errors.push({
            column: 'professionId',
            message: `Meslek bulunamadı: ${professionVal}`,
          });
        }
      } else {
        const found = refs.professionByName.get(normalizeName(professionVal));
        if (!found) {
          errors.push({
            column: 'professionId',
            message: `Meslek bulunamadı: ${professionVal}`,
          });
        }
      }
    }

    const status: RowStatus = errors.length > 0 ? 'error' : 'valid';
    return { status, errors };
  }

  private normalizeGender(val: string): Gender | null {
    const v = val.trim().toLowerCase();
    if (['male', 'erkek', 'e'].includes(v)) return Gender.MALE;
    if (['female', 'kadın', 'kadin', 'k'].includes(v)) return Gender.FEMALE;
    if (['other', 'diğer', 'diger', 'd'].includes(v)) return Gender.OTHER;
    return null;
  }

  private normalizeEducation(val: string): EducationStatus | null {
    const v = val.trim().toLowerCase();
    if (['primary', 'ilkokul', 'ilk'].includes(v))
      return EducationStatus.PRIMARY;
    if (['high_school', 'lise', 'l'].includes(v))
      return EducationStatus.HIGH_SCHOOL;
    if (['college', 'üniversite', 'universite', 'yüksek', 'yuksek'].includes(v))
      return EducationStatus.COLLEGE;
    return null;
  }
}
