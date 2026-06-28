import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '../config/config.service';
import { CreateDocumentTemplateDto } from './application/dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from './application/dto/update-document-template.dto';
import { GenerateDocumentDto, GenerateMemberListDocumentDto } from './dto';
import {
  DocumentTemplateType,
  DocumentUploadStatus,
  MemberDocument,
  Prisma,
} from '@prisma/client';

/** Üye + ilişkiler: tek üye PDF şablonu değişkenleri için */
type MemberWithDocumentRelations = Prisma.MemberGetPayload<{
  include: {
    province: true;
    district: true;
    institution: true;
    branch: true;
    membershipInfoOption: true;
    memberGroup: true;
  };
}>;
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PdfService } from './services/pdf.service';
import { FileStorageService } from './services/file-storage.service';
import { DocumentTemplateApplicationService } from './application/services/document-template-application.service';
import { sanitizePdfFileBaseName } from './utils/sanitize-pdf-file-base-name';
import {
  DocumentPreviewStoreService,
  type DocumentPreviewRecord,
} from './services/document-preview-store.service';
import * as crypto from 'crypto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private fileStorageService: FileStorageService,
    private configService: ConfigService,
    private documentTemplateApplicationService: DocumentTemplateApplicationService,
    private previewStore: DocumentPreviewStoreService,
  ) {}

  private resolveHeaderPaperPath(
    templateType?: DocumentTemplateType | string,
  ): string | undefined {
    const shouldUseHeaderPaper = templateType !== DocumentTemplateType.MEMBER_CARD;
    if (!shouldUseHeaderPaper) return undefined;

    const headerPaperPath = this.configService.getSystemSetting(
      'DOCUMENT_HEADER_PAPER_PATH',
    );
    if (!headerPaperPath) return undefined;

    let finalHeaderPaperPath: string;
    if (headerPaperPath.startsWith('/uploads/')) {
      finalHeaderPaperPath = path.join(process.cwd(), headerPaperPath);
    } else if (!path.isAbsolute(headerPaperPath)) {
      finalHeaderPaperPath = path.join(process.cwd(), headerPaperPath);
    } else {
      finalHeaderPaperPath = headerPaperPath;
    }

    if (!fs.existsSync(finalHeaderPaperPath)) {
      this.logger.warn(`Antetli kağıt dosyası bulunamadı: ${finalHeaderPaperPath}`);
      return undefined;
    }

    return finalHeaderPaperPath;
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Üye dokümanının disk yolu: onaylı yükleme → permanentPath, incelemedeki yükleme → stagingPath,
   * şablondan üretilen PDF / eski kayıtlar → uploads/documents/fileName
   */
  private resolveMemberDocumentFilePath(document: {
    fileName: string;
    uploadStatus: DocumentUploadStatus;
    permanentPath: string | null;
    stagingPath: string | null;
  }): string {
    if (
      document.uploadStatus === DocumentUploadStatus.APPROVED &&
      document.permanentPath
    ) {
      return document.permanentPath;
    }
    if (
      document.uploadStatus === DocumentUploadStatus.STAGING &&
      document.stagingPath
    ) {
      return document.stagingPath;
    }
    return path.join(process.cwd(), 'uploads', 'documents', document.fileName);
  }

  /**
   * Tek üye PDF şablonu için değişken haritası (önizleme ve doğrudan üretim aynı kaynaktan).
   * dto.variables ile sonradan merge edilir (override).
   */
  private buildMemberDocumentVariables(
    member: MemberWithDocumentRelations,
    now: Date = new Date(),
  ): Record<string, string> {
    const joinDate = member.approvedAt
      ? new Date(member.approvedAt).toLocaleDateString('tr-TR')
      : member.createdAt
        ? new Date(member.createdAt).toLocaleDateString('tr-TR')
        : '';
    const birthDate = member.birthDate
      ? new Date(member.birthDate).toLocaleDateString('tr-TR')
      : '';
    const boardDecisionDate = member.boardDecisionDate
      ? new Date(member.boardDecisionDate).toLocaleDateString('tr-TR')
      : '';

    return {
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      fullName: `${member.firstName || ''} ${member.lastName || ''}`.trim(),
      memberNumber: member.registrationNumber || '',
      nationalId: member.nationalId || '',
      phone: member.phone || '',
      email: member.email || '',
      province: member.province?.name || '',
      district: member.district?.name || '',
      institution: member.institution?.name || '',
      branch: member.branch?.name || '',
      date: now.toLocaleDateString('tr-TR'),
      joinDate,
      applicationDate: member.createdAt
        ? new Date(member.createdAt).toLocaleDateString('tr-TR')
        : '',
      validUntil: new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        now.getDate(),
      ).toLocaleDateString('tr-TR'),
      birthPlace: member.birthplace || '',
      birthDate,
      motherName: member.motherName || '',
      fatherName: member.fatherName || '',
      gender: member.gender
        ? member.gender === 'MALE'
          ? 'Erkek'
          : member.gender === 'FEMALE'
            ? 'Kadın'
            : 'Diğer'
        : '',
      educationStatus: member.educationStatus
        ? member.educationStatus === 'PRIMARY'
          ? 'İlkokul'
          : member.educationStatus === 'HIGH_SCHOOL'
            ? 'Lise'
            : member.educationStatus === 'COLLEGE'
              ? 'Üniversite'
              : member.educationStatus
        : '',
      position: '',
      workUnitAddress: '',
      dutyUnit: member.dutyUnit || '',
      institutionAddress: member.institutionAddress || '',
      boardDecisionDate,
      boardDecisionBookNo: member.boardDecisionBookNo || '',
      membershipInfoOption: member.membershipInfoOption?.label || '',
      memberGroup: member.memberGroup?.name || '',
      photoDataUrl:
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      oldProvince: '',
      oldDistrict: '',
      oldInstitution: '',
      oldBranch: '',
      transferReason: '',
    };
  }

  // Şablonlar
  async findAllTemplates() {
    return this.prisma.documentTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findTemplateById(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Şablon bulunamadı: ${id}`);
    }

    return template;
  }

  async createTemplate(dto: CreateDocumentTemplateDto) {
    const template =
      await this.documentTemplateApplicationService.createTemplate({ dto });
    return await this.prisma.documentTemplate.findUnique({
      where: { id: template.id },
    });
  }

  async updateTemplate(id: string, dto: UpdateDocumentTemplateDto) {
    const template =
      await this.documentTemplateApplicationService.updateTemplate({
        templateId: id,
        dto,
      });
    return await this.prisma.documentTemplate.findUnique({
      where: { id: template.id },
    });
  }

  async deleteTemplate(id: string) {
    await this.documentTemplateApplicationService.deleteTemplate({
      templateId: id,
    });
    return await this.prisma.documentTemplate.findUnique({ where: { id } });
  }

  // Üye dokümanları
  async findMemberDocuments(memberId: string) {
    // Önce üyenin var olup olmadığını kontrol et
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${memberId}`);
    }

    return this.prisma.memberDocument.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
      include: {
        template: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        generatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * PDF Oluştur sayfası: son üretilen / yüklenen PDF üye belgeleri.
   * Admin: sistemdeki son 10; diğer panel kullanıcıları: yalnızca kendi oluşturdukları son 10.
   *
   * Admin tespiti JWT `roles` ile değil, veritabanındaki aktif custom roller ile yapılır
   * (JWT ile DB sapması veya `generatedBy: undefined` ile filtrenin düşmesi önlenir).
   */
  async listRecentPanelPdfs(userId: string) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new UnauthorizedException('Oturum kullanıcı bilgisi geçersiz');
    }

    const panelUser = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      select: {
        id: true,
        customRoles: {
          where: { deletedAt: null, isActive: true },
          select: { name: true },
        },
      },
    });

    if (!panelUser) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya pasif');
    }

    const isAdmin = panelUser.customRoles.some((r) => r.name === 'ADMIN');

    const pdfWhere: Prisma.MemberDocumentWhereInput = {
      deletedAt: null,
      uploadStatus: { not: DocumentUploadStatus.REJECTED },
      OR: [
        { mimeType: 'application/pdf' },
        { fileName: { endsWith: '.pdf', mode: 'insensitive' } },
      ],
    };

    const documents = await this.prisma.memberDocument.findMany({
      where: {
        ...pdfWhere,
        ...(isAdmin ? {} : { generatedBy: panelUser.id }),
      },
      include: {
        template: { select: { id: true, name: true, type: true } },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        generatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });

    return documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      documentType: doc.documentType,
      uploadStatus: doc.uploadStatus,
      generatedAt: doc.generatedAt.toISOString(),
      fileUrl: doc.fileUrl,
      templateId: doc.templateId,
      templateName: doc.template?.name ?? null,
      memberId: doc.memberId,
      member: doc.member,
      generatedBy: doc.generatedBy,
      generatedByUser: doc.generatedByUser,
      /** Şablondan üretildiyse true; dosya yükleme vb. için false */
      fromTemplate: doc.templateId != null,
    }));
  }

  // PDF oluştur (şimdilik basit bir implementasyon)
  async generateDocument(dto: GenerateDocumentDto, generatedBy: string) {
    // Şablonu al
    const template = await this.findTemplateById(dto.templateId);

    if ((template.type as string) === 'BULK_MEMBER_LIST') {
      throw new BadRequestException(
        'Toplu üye listesi şablonları yalnızca toplu liste PDF akışı ile kullanılabilir.',
      );
    }

    // Üyeyi al
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      include: {
        province: true,
        district: true,
        institution: true,
        branch: true,
        membershipInfoOption: true,
        memberGroup: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${dto.memberId}`);
    }

    const now = new Date();
    const variables: Record<string, string> = {
      ...this.buildMemberDocumentVariables(member, now),
      ...dto.variables,
    };

    // Şablon içindeki değişkenleri değiştir
    let htmlContent = this.pdfService.replaceTemplateVariables(
      template.template,
      variables,
    );

    // HTML wrapper ekle (eğer yoksa)
    htmlContent = this.pdfService.wrapTemplateWithHtml(htmlContent);

    // Dosya adı ve yolu oluştur (isteğe bağlı custom fileName)
    const suggestedBase = dto.fileName
      ? sanitizePdfFileBaseName(dto.fileName)
      : '';
    const defaultBase = `${template.type}_${member.registrationNumber || member.id}_${Date.now()}`;
    const baseName = suggestedBase || defaultBase;

    let fileName = `${baseName}.pdf`;
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    let filePath = path.join(uploadsDir, fileName);

    // Çakışma varsa sonuna timestamp ekle
    if (fs.existsSync(filePath)) {
      fileName = `${baseName}_${Date.now()}.pdf`;
      filePath = path.join(uploadsDir, fileName);
    }
    const fileUrl = `/uploads/documents/${fileName}`;

    this.ensureDirectoryExists(uploadsDir);

    try {
      const finalHeaderPaperPath = this.resolveHeaderPaperPath(template.type);

      // HTML'i PDF'e dönüştür
      await this.pdfService.generatePdfFromHtml(htmlContent, filePath, {
        format: 'A4',
        printBackground: true,
        headerPaperPath: finalHeaderPaperPath,
      });

      this.logger.log(`PDF document generated: ${filePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`PDF oluşturma hatası: ${error.message}`);
    }

    // Doküman kaydını oluştur
    const document = await this.prisma.memberDocument.create({
      data: {
        memberId: dto.memberId,
        templateId: dto.templateId,
        documentType: template.type,
        fileName,
        fileUrl,
        generatedBy,
        // Şablondan üretilen PDF doğrudan kalıcı dizinde; yükleme onay akışı yok
        uploadStatus: DocumentUploadStatus.APPROVED,
      },
      include: {
        template: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        generatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      fileUrl,
      fileName,
      document,
    };
  }

  async previewDocument(dto: GenerateDocumentDto, generatedBy: string) {
    const template = await this.findTemplateById(dto.templateId);

    if ((template.type as string) === 'BULK_MEMBER_LIST') {
      throw new BadRequestException(
        'Toplu üye listesi şablonları yalnızca toplu liste PDF akışı ile kullanılabilir.',
      );
    }

    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      include: {
        province: true,
        district: true,
        institution: true,
        branch: true,
        membershipInfoOption: true,
        memberGroup: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${dto.memberId}`);
    }

    const now = new Date();
    const variables: Record<string, string> = {
      ...this.buildMemberDocumentVariables(member, now),
      ...dto.variables,
    };

    let htmlContent = this.pdfService.replaceTemplateVariables(
      template.template,
      variables,
    );
    htmlContent = this.pdfService.wrapTemplateWithHtml(htmlContent);

    const previewId = crypto.randomUUID();
    const baseName = sanitizePdfFileBaseName(dto.fileName || `preview_${template.type}_${Date.now()}`);
    const fileName = `${baseName}_${previewId}.pdf`;
    const filePath = this.previewStore.getPreviewFilePath(fileName);

    await this.pdfService.generatePdfFromHtml(htmlContent, filePath, {
      format: 'A4',
      printBackground: true,
      headerPaperPath: this.resolveHeaderPaperPath(template.type),
    });

    const createdAt = new Date();
    const ttlSeconds = 60 * 60;
    const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);
    const record: DocumentPreviewRecord = {
      previewId,
      mode: 'SINGLE',
      generatedBy,
      memberId: dto.memberId,
      templateId: dto.templateId,
      variables: dto.variables,
      fileName,
      filePath,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    await this.previewStore.set(record, ttlSeconds);

    return {
      previewId,
      fileName,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Toplu üye bazlı PDF (her üye ayrı dosya): önizleme yalnızca ilk seçilen üye için üretilir;
   * kayıtta tüm üyeler için generateDocument çalışır.
   */
  async previewBulkMemberDocuments(
    dto: GenerateMemberListDocumentDto,
    generatedBy: string,
  ) {
    if (!dto.memberIds || dto.memberIds.length === 0) {
      throw new BadRequestException('En az bir üye seçilmelidir');
    }

    const template = await this.findTemplateById(dto.templateId);
    if ((template.type as string) === 'BULK_MEMBER_LIST') {
      throw new BadRequestException(
        'Toplu üye listesi şablonları yalnızca toplu liste PDF akışı ile kullanılabilir.',
      );
    }

    const found = await this.prisma.member.findMany({
      where: { id: { in: dto.memberIds } },
      select: { id: true },
    });
    if (found.length !== dto.memberIds.length) {
      throw new BadRequestException(
        'Seçilen üyelerden bazıları bulunamadı veya geçersiz.',
      );
    }

    const firstMemberId = dto.memberIds[0];
    const member = await this.prisma.member.findUnique({
      where: { id: firstMemberId },
      include: {
        province: true,
        district: true,
        institution: true,
        branch: true,
        membershipInfoOption: true,
        memberGroup: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${firstMemberId}`);
    }

    const now = new Date();
    const variables: Record<string, string> = {
      ...this.buildMemberDocumentVariables(member, now),
      ...(dto.variables || {}),
    };

    let htmlContent = this.pdfService.replaceTemplateVariables(
      template.template,
      variables,
    );
    htmlContent = this.pdfService.wrapTemplateWithHtml(htmlContent);

    const previewId = crypto.randomUUID();
    const prefix = dto.fileName
      ? sanitizePdfFileBaseName(dto.fileName)
      : '';
    const previewBase = prefix
      ? sanitizePdfFileBaseName(
          `${prefix}_${member.firstName || ''}_${member.lastName || ''}`.trim(),
        )
      : sanitizePdfFileBaseName(`preview_bulk_${template.type}_${Date.now()}`);
    const fileName = `${previewBase}_${previewId}.pdf`;
    const filePath = this.previewStore.getPreviewFilePath(fileName);

    await this.pdfService.generatePdfFromHtml(htmlContent, filePath, {
      format: 'A4',
      printBackground: true,
      headerPaperPath: this.resolveHeaderPaperPath(template.type),
    });

    const createdAt = new Date();
    const ttlSeconds = 60 * 60;
    const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);
    const record: DocumentPreviewRecord = {
      previewId,
      mode: 'BULK',
      generatedBy,
      memberIds: dto.memberIds,
      templateId: dto.templateId,
      variables: dto.variables,
      bulkFileNamePrefix: prefix || undefined,
      fileName,
      filePath,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    await this.previewStore.set(record, ttlSeconds);

    return {
      previewId,
      fileName,
      expiresAt: expiresAt.toISOString(),
      memberCount: dto.memberIds.length,
    };
  }

  // Toplu üye listesi PDF oluştur (tek PDF, birden fazla üye)
  async generateMemberListDocument(
    dto: GenerateMemberListDocumentDto,
    generatedBy: string,
  ) {
    if (!dto.memberIds || dto.memberIds.length === 0) {
      throw new BadRequestException('En az bir üye seçilmelidir');
    }

    const template = await this.findTemplateById(dto.templateId);

    if ((template.type as string) !== 'BULK_MEMBER_LIST') {
      throw new BadRequestException(
        'Toplu üye listesi PDF\'i yalnızca türü "Toplu üye listesi" (BULK_MEMBER_LIST) olan şablonlarla oluşturulabilir.',
      );
    }

    // Tüm üyeleri çek
    const members = await this.prisma.member.findMany({
      where: { id: { in: dto.memberIds } },
      include: {
        tevkifatTitle: true,
        profession: true,
      },
      orderBy: { registrationNumber: 'asc' },
    });

    if (members.length === 0) {
      throw new NotFoundException('Seçilen üyeler bulunamadı');
    }

    // Üye tablo satırlarını oluştur
    const memberTableRows = members
      .map(
        (m, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${[m.firstName, m.lastName].filter(Boolean).join(' ')}</td>
        <td>${m.nationalId || ''}</td>
        <td>${m.tevkifatTitle?.name || m.profession?.name || ''}</td>
        <td>${m.registrationNumber || ''}</td>
      </tr>`,
      )
      .join('');

    // Tarih ve genel değişkenler
    const now = new Date();
    const variables: Record<string, string> = {
      date: now.toLocaleDateString('tr-TR'),
      memberTable: memberTableRows,
      ...(dto.variables || {}),
    };

    // Şablon değişkenlerini değiştir
    let htmlContent = this.pdfService.replaceTemplateVariables(
      template.template,
      variables,
    );
    htmlContent = this.pdfService.wrapTemplateWithHtml(htmlContent);

    // Dosya adı
    const suggestedBase = dto.fileName
      ? sanitizePdfFileBaseName(dto.fileName)
      : '';
    const defaultBase = `${template.type}_liste_${Date.now()}`;
    const baseName = suggestedBase || defaultBase;

    let fileName = `${baseName}.pdf`;
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    let filePath = path.join(uploadsDir, fileName);

    if (fs.existsSync(filePath)) {
      fileName = `${baseName}_${Date.now()}.pdf`;
      filePath = path.join(uploadsDir, fileName);
    }
    const fileUrl = `/uploads/documents/${fileName}`;

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    try {
      const headerPaperPath = this.configService.getSystemSetting(
        'DOCUMENT_HEADER_PAPER_PATH',
      );
      let finalHeaderPaperPath: string | undefined;

      if (headerPaperPath) {
        if (headerPaperPath.startsWith('/uploads/')) {
          finalHeaderPaperPath = path.join(process.cwd(), headerPaperPath);
        } else if (!path.isAbsolute(headerPaperPath)) {
          finalHeaderPaperPath = path.join(process.cwd(), headerPaperPath);
        } else {
          finalHeaderPaperPath = headerPaperPath;
        }
        if (!fs.existsSync(finalHeaderPaperPath)) {
          finalHeaderPaperPath = undefined;
        }
      }

      await this.pdfService.generatePdfFromHtml(htmlContent, filePath, {
        format: 'A4',
        printBackground: true,
        headerPaperPath: finalHeaderPaperPath,
      });
    } catch (error) {
      throw new BadRequestException(`PDF oluşturma hatası: ${error.message}`);
    }

    // İlk üyeye bağlı doküman kaydı oluştur
    const firstMember = members[0];
    const document = await this.prisma.memberDocument.create({
      data: {
        memberId: firstMember.id,
        templateId: dto.templateId,
        documentType: template.type,
        fileName,
        fileUrl,
        generatedBy,
        uploadStatus: DocumentUploadStatus.APPROVED,
      },
      include: {
        template: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        generatedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return { fileUrl, fileName, document, memberCount: members.length };
  }

  async previewMemberListDocument(
    dto: GenerateMemberListDocumentDto,
    generatedBy: string,
  ) {
    if (!dto.memberIds || dto.memberIds.length === 0) {
      throw new BadRequestException('En az bir üye seçilmelidir');
    }

    const template = await this.findTemplateById(dto.templateId);
    if ((template.type as string) !== 'BULK_MEMBER_LIST') {
      throw new BadRequestException(
        'Toplu üye listesi PDF\'i için BULK_MEMBER_LIST türünde şablon kullanılmalıdır.',
      );
    }

    const members = await this.prisma.member.findMany({
      where: { id: { in: dto.memberIds } },
      include: {
        tevkifatTitle: true,
        profession: true,
      },
      orderBy: { registrationNumber: 'asc' },
    });
    if (members.length === 0) {
      throw new NotFoundException('Seçilen üyeler bulunamadı');
    }

    const memberTableRows = members
      .map(
        (m, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${[m.firstName, m.lastName].filter(Boolean).join(' ')}</td>
        <td>${m.nationalId || ''}</td>
        <td>${m.tevkifatTitle?.name || m.profession?.name || ''}</td>
        <td>${m.registrationNumber || ''}</td>
      </tr>`,
      )
      .join('');

    let htmlContent = this.pdfService.replaceTemplateVariables(template.template, {
      date: new Date().toLocaleDateString('tr-TR'),
      memberTable: memberTableRows,
      ...(dto.variables || {}),
    });
    htmlContent = this.pdfService.wrapTemplateWithHtml(htmlContent);

    const previewId = crypto.randomUUID();
    const baseName = sanitizePdfFileBaseName(dto.fileName || `preview_list_${Date.now()}`);
    const fileName = `${baseName}_${previewId}.pdf`;
    const filePath = this.previewStore.getPreviewFilePath(fileName);

    await this.pdfService.generatePdfFromHtml(htmlContent, filePath, {
      format: 'A4',
      printBackground: true,
      headerPaperPath: this.resolveHeaderPaperPath(template.type),
    });

    const createdAt = new Date();
    const ttlSeconds = 60 * 60;
    const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);
    const record: DocumentPreviewRecord = {
      previewId,
      mode: 'LIST',
      generatedBy,
      memberIds: dto.memberIds,
      templateId: dto.templateId,
      variables: dto.variables,
      fileName,
      filePath,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    await this.previewStore.set(record, ttlSeconds);

    return {
      previewId,
      fileName,
      expiresAt: expiresAt.toISOString(),
      memberCount: members.length,
    };
  }

  async viewPreview(previewId: string, userId: string, res: Response): Promise<void> {
    const record = await this.previewStore.get(previewId);
    if (!record) {
      throw new NotFoundException('Preview bulunamadı veya süresi dolmuş');
    }
    if (record.generatedBy !== userId) {
      throw new BadRequestException('Bu preview kaydını görüntüleme yetkiniz yok');
    }
    if (!fs.existsSync(record.filePath)) {
      await this.previewStore.delete(previewId);
      throw new NotFoundException('Preview dosyası bulunamadı');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${record.fileName}"`);
    const fileStream = fs.createReadStream(record.filePath);
    fileStream.pipe(res);
    return new Promise<void>((resolve, reject) => {
      fileStream.on('end', () => resolve());
      fileStream.on('error', (error) => reject(error));
    });
  }

  async commitPreview(previewId: string, userId: string) {
    const record = await this.previewStore.get(previewId);
    if (!record) {
      throw new NotFoundException('Preview bulunamadı veya süresi dolmuş');
    }
    if (record.generatedBy !== userId) {
      throw new BadRequestException('Bu preview kaydını kaydetme yetkiniz yok');
    }

    if (record.mode === 'BULK') {
      const memberIds = record.memberIds || [];
      if (memberIds.length === 0) {
        throw new BadRequestException('Toplu preview kaydında üye yok');
      }
      if (!fs.existsSync(record.filePath)) {
        await this.previewStore.delete(previewId);
        throw new NotFoundException('Preview dosyası bulunamadı');
      }
      await this.previewStore.delete(previewId, record.filePath);

      const documents: MemberDocument[] = [];
      const prefix = record.bulkFileNamePrefix;

      for (const memberId of memberIds) {
        const m = await this.prisma.member.findUnique({
          where: { id: memberId },
          select: { firstName: true, lastName: true },
        });
        if (!m) {
          continue;
        }
        const perFileName = prefix
          ? sanitizePdfFileBaseName(
              `${prefix}_${m.firstName || ''}_${m.lastName || ''}`.trim(),
            )
          : undefined;
        const result = await this.generateDocument(
          {
            memberId,
            templateId: record.templateId,
            variables: record.variables,
            fileName: perFileName,
          },
          userId,
        );
        documents.push(result.document);
      }

      return {
        mode: record.mode,
        memberCount: documents.length,
        documents,
      };
    }

    if (!fs.existsSync(record.filePath)) {
      await this.previewStore.delete(previewId);
      throw new NotFoundException('Preview dosyası bulunamadı');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    this.ensureDirectoryExists(uploadsDir);
    const targetFileName = record.fileName;
    let finalFileName = targetFileName;
    let finalPath = path.join(uploadsDir, finalFileName);
    if (fs.existsSync(finalPath)) {
      const ext = path.extname(targetFileName);
      const base = path.basename(targetFileName, ext);
      finalFileName = `${base}_${Date.now()}${ext}`;
      finalPath = path.join(uploadsDir, finalFileName);
    }
    fs.renameSync(record.filePath, finalPath);

    const template = await this.findTemplateById(record.templateId);
    const memberId = record.mode === 'SINGLE' ? record.memberId : record.memberIds?.[0];
    if (!memberId) {
      throw new BadRequestException('Preview kaydı üyeye bağlanmamış');
    }

    const document = await this.prisma.memberDocument.create({
      data: {
        memberId,
        templateId: record.templateId,
        documentType: template.type,
        fileName: finalFileName,
        fileUrl: `/uploads/documents/${finalFileName}`,
        generatedBy: userId,
        // Önizlemede kullanıcı zaten kaydı onayladı; yükleme inceleme akışı yok
        uploadStatus: DocumentUploadStatus.APPROVED,
      },
    });

    await this.previewStore.delete(previewId);
    return { document, mode: record.mode };
  }

  async discardPreview(previewId: string, userId: string) {
    const record = await this.previewStore.get(previewId);
    if (!record) {
      return { discarded: true };
    }
    if (record.generatedBy !== userId) {
      throw new BadRequestException('Bu preview kaydını silme yetkiniz yok');
    }
    await this.previewStore.delete(previewId, record.filePath);
    return { discarded: true };
  }

  // Doküman yükle (yeni güvenli staging sistemi)
  async uploadMemberDocument(
    memberId: string,
    file: Express.Multer.File,
    documentType: string,
    description: string | undefined,
    uploadedBy: string,
    customFileName?: string,
  ) {
    // Üyeyi kontrol et
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${memberId}`);
    }

    // Dosya validasyonu (FileStorageService ile)
    this.fileStorageService.validateFile(file);

    // Güvenli dosya adı oluştur
    const originalFileName =
      customFileName?.trim() || file.originalname || 'document.pdf';
    const secureFileName = this.fileStorageService.generateSecureFileName(
      originalFileName,
      file.buffer,
    );

    // Staging'e kaydet
    const stagingPath = this.fileStorageService.saveToStaging(
      file.buffer,
      secureFileName,
    );

    // Veritabanına kaydet (STAGING durumunda)
    const document = await this.prisma.memberDocument.create({
      data: {
        memberId,
        templateId: null, // Yüklenen dosya için şablon yok
        documentType: documentType || 'UPLOADED',
        fileName: originalFileName, // Orijinal dosya adı (gösterim için)
        secureFileName, // Güvenli dosya adı
        fileUrl: null, // Henüz onaylanmadı, URL yok
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadStatus: DocumentUploadStatus.STAGING,
        stagingPath,
        permanentPath: null,
        generatedBy: uploadedBy,
      },
      include: {
        template: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        generatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(
      `Document uploaded to staging: ${document.id}, member: ${memberId}`,
    );

    return document;
  }

  /**
   * Üye dokümanını sil (soft delete + dosyayı diskten kaldır)
   */
  async deleteMemberDocument(documentId: string): Promise<void> {
    const document = await this.prisma.memberDocument.findFirst({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException(`Doküman bulunamadı: ${documentId}`);
    }

    if (document.stagingPath) {
      this.fileStorageService.deleteFromStaging(document.stagingPath);
    }
    if (document.permanentPath) {
      this.fileStorageService.deleteFileUnderUploadsRoot(document.permanentPath);
    }

    await this.prisma.memberDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Member document deleted (soft): ${documentId}`);
  }

  // Admin: Dokümanı onayla (staging'den permanent'e taşı)
  async approveDocument(
    documentId: string,
    adminId: string,
    adminNote?: string,
  ) {
    const document = await this.prisma.memberDocument.findUnique({
      where: { id: documentId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Doküman bulunamadı: ${documentId}`);
    }

    if (document.uploadStatus !== DocumentUploadStatus.STAGING) {
      throw new BadRequestException(
        `Bu doküman onaylanamaz. Mevcut durum: ${document.uploadStatus}`,
      );
    }

    if (!document.stagingPath || !document.secureFileName) {
      throw new BadRequestException('Doküman staging bilgileri eksik');
    }

    // Dosyayı staging'den permanent'e taşı
    const permanentPath = this.fileStorageService.moveToPermanent(
      document.stagingPath,
      document.secureFileName,
    );

    // File URL oluştur
    const fileUrl = this.fileStorageService.getFileUrl(permanentPath, true);

    // Veritabanını güncelle
    const updatedDocument = await this.prisma.memberDocument.update({
      where: { id: documentId },
      data: {
        uploadStatus: DocumentUploadStatus.APPROVED,
        permanentPath,
        stagingPath: null, // Staging'den taşındı
        fileUrl,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNote: adminNote || null,
        rejectionReason: null, // Onaylandı, red nedeni yok
      },
      include: {
        template: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        generatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`Document approved: ${documentId}, admin: ${adminId}`);

    return updatedDocument;
  }

  // Admin: Dokümanı reddet (staging'den sil)
  async rejectDocument(
    documentId: string,
    adminId: string,
    rejectionReason: string,
  ) {
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new BadRequestException('Red nedeni belirtilmelidir');
    }

    const document = await this.prisma.memberDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Doküman bulunamadı: ${documentId}`);
    }

    if (document.uploadStatus !== DocumentUploadStatus.STAGING) {
      throw new BadRequestException(
        `Bu doküman reddedilemez. Mevcut durum: ${document.uploadStatus}`,
      );
    }

    // Staging dosyasını sil
    if (document.stagingPath) {
      this.fileStorageService.deleteFromStaging(document.stagingPath);
    }

    // Veritabanını güncelle
    const updatedDocument = await this.prisma.memberDocument.update({
      where: { id: documentId },
      data: {
        uploadStatus: DocumentUploadStatus.REJECTED,
        stagingPath: null, // Silindi
        rejectionReason: rejectionReason.trim(),
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNote: null,
      },
      include: {
        template: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        generatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(
      `Document rejected: ${documentId}, admin: ${adminId}, reason: ${rejectionReason}`,
    );

    return updatedDocument;
  }

  // Admin: İnceleme bekleyen dokümanları getir
  async getPendingReviewDocuments() {
    return this.prisma.memberDocument.findMany({
      where: {
        uploadStatus: DocumentUploadStatus.STAGING,
        deletedAt: null,
      },
      include: {
        template: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
            nationalId: true,
          },
        },
        generatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // En eski önce
      },
    });
  }

  // Duruma göre dokümanları getir
  async getDocumentsByStatus(status: DocumentUploadStatus) {
    return this.prisma.memberDocument.findMany({
      where: {
        uploadStatus: status,
        deletedAt: null,
      },
      include: {
        template: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        generatedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Üye onaylandığında evrak dosya isimlerini güncelle (kayıt numarası ekle)
  async updateMemberDocumentFileNames(
    memberId: string,
    registrationNumber: string,
  ) {
    // Üyeyi kontrol et
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nationalId: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Üye bulunamadı: ${memberId}`);
    }

    // Üyenin tüm evraklarını al
    const documents = await this.prisma.memberDocument.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
    });

    if (documents.length === 0) {
      return; // Evrak yoksa işlem yapma
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    const updatedDocuments: Array<{ oldName: string; newName: string }> = [];

    for (const doc of documents) {
      const currentFileName = doc.fileName;
      const fileExtension = path.extname(currentFileName);
      const nameWithoutExt = path.basename(currentFileName, fileExtension);

      // Eğer dosya adında kayıt numarası zaten varsa, güncelleme
      if (nameWithoutExt.startsWith(registrationNumber + '_')) {
        continue; // Zaten güncellenmiş
      }

      // Yeni dosya adı: UyeKayidi_BelgeTipi_TC_AdSoyad
      const newFileName = `${registrationNumber}_${nameWithoutExt}${fileExtension}`;
      const oldFilePath = path.join(uploadsDir, currentFileName);
      const newFilePath = path.join(uploadsDir, newFileName);

      // Dosya sisteminde dosyayı yeniden adlandır
      if (fs.existsSync(oldFilePath)) {
        // Aynı isimde dosya varsa timestamp ekle
        let finalNewFileName = newFileName;
        if (fs.existsSync(newFilePath)) {
          const timestamp = Date.now();
          const nameWithoutExt2 = path.basename(newFileName, fileExtension);
          finalNewFileName = `${nameWithoutExt2}_${timestamp}${fileExtension}`;
        }

        const finalNewFilePath = path.join(uploadsDir, finalNewFileName);
        fs.renameSync(oldFilePath, finalNewFilePath);

        // Veritabanında dosya adını güncelle
        await this.prisma.memberDocument.update({
          where: { id: doc.id },
          data: {
            fileName: finalNewFileName,
            fileUrl: `/uploads/documents/${finalNewFileName}`,
          },
        });

        updatedDocuments.push({
          oldName: currentFileName,
          newName: finalNewFileName,
        });
      }
    }

    return {
      updatedCount: updatedDocuments.length,
      documents: updatedDocuments,
    };
  }

  // PDF görüntüle (inline)
  async viewDocument(documentId: string, res: Response): Promise<void> {
    const document = await this.prisma.memberDocument.findUnique({
      where: { id: documentId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Doküman bulunamadı: ${documentId}`);
    }

    const filePath = this.resolveMemberDocumentFilePath(document);

    // Dosyanın var olup olmadığını kontrol et
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(
        `Dosya bulunamadı: ${document.fileName || document.secureFileName}`,
      );
    }

    // Content-Type header'ını ayarla (inline olarak göster)
    res.setHeader('Content-Type', 'application/pdf');

    // HTTP header'larında sadece ASCII karakterler kullanılabilir
    // Türkçe karakterler için ASCII-safe dosya adı oluştur
    const asciiFileName = document.fileName
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
      .replace(/[^\x00-\x7F]/g, '_') // Kalan ASCII olmayan karakterleri _ ile değiştir
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // Özel karakterleri de temizle

    // Inline için basit bir header kullan (görüntüleme için dosya adı çok kritik değil)
    const safeAsciiFileName = asciiFileName
      .replace(/"/g, '')
      .replace(/;/g, '_');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeAsciiFileName}"`,
    );

    // Dosyayı gönder
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Promise döndür - stream tamamlanana kadar bekle
    return new Promise<void>((resolve, reject) => {
      fileStream.on('end', () => resolve());
      fileStream.on('error', (error) => reject(error));
    });
  }

  // PDF indir
  async downloadDocument(documentId: string, res: Response): Promise<void> {
    const document = await this.prisma.memberDocument.findUnique({
      where: { id: documentId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Doküman bulunamadı: ${documentId}`);
    }

    // Reddedilen belge indirilemez; diğer durumlar görüntüleme ile aynı dosya çözümlemesi
    if (document.uploadStatus === DocumentUploadStatus.REJECTED) {
      throw new BadRequestException('Bu doküman reddedildiği için indirilemez.');
    }

    const filePath = this.resolveMemberDocumentFilePath(document);

    // Dosyanın var olup olmadığını kontrol et
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(
        `Dosya bulunamadı: ${document.fileName || document.secureFileName}`,
      );
    }

    // Content-Type ve Content-Disposition header'larını ayarla
    res.setHeader('Content-Type', 'application/pdf');

    // HTTP header'larında sadece ASCII karakterler kullanılabilir
    // Türkçe karakterler için RFC 5987 formatını kullanıyoruz
    // filename: ASCII-only fallback (Türkçe karakterleri temizle)
    const asciiFileName = document.fileName
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
      .replace(/[^\x00-\x7F]/g, '_') // Kalan ASCII olmayan karakterleri _ ile değiştir
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // Özel karakterleri de temizle

    // filename* için RFC 5987 formatında encode et
    // UTF-8'' prefix'i ile başlamalı ve encodeURIComponent kullanılmalı
    const encodedFileName = encodeURIComponent(document.fileName);

    // Content-Disposition header'ını oluştur
    // Sadece ASCII-safe karakterler kullanarak oluştur
    // filename: ASCII-only fallback (eski tarayıcılar için)
    // filename*: UTF-8 encoded (modern tarayıcılar için)
    // Header'da tırnak ve özel karakterler sorun çıkarabilir, bu yüzden dikkatli oluşturuyoruz
    const safeAsciiFileName = asciiFileName
      .replace(/"/g, '')
      .replace(/;/g, '_');
    const contentDisposition = `attachment; filename="${safeAsciiFileName}"; filename*=UTF-8''${encodedFileName}`;

    // Header'ı set et
    res.setHeader('Content-Disposition', contentDisposition);

    // Dosyayı gönder
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Promise döndür - stream tamamlanana kadar bekle
    return new Promise<void>((resolve, reject) => {
      fileStream.on('end', () => resolve());
      fileStream.on('error', (error) => reject(error));
    });
  }
}
