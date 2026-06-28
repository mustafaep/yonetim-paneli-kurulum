import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberPaymentDto } from './dto/create-member-payment.dto';
import { UpdateMemberPaymentDto } from './dto/update-member-payment.dto';
import {
  PaymentType,
  MemberStatus,
  NotificationType,
  NotificationTargetType,
} from '@prisma/client';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Üye Kesintisi oluştur
   */
  async createPayment(
    dto: CreateMemberPaymentDto,
    createdBy: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Üyenin var olduğunu ve aktif olduğunu kontrol et
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      select: {
        id: true,
        registrationNumber: true,
        status: true,
        isActive: true,
        deletedAt: true,
        tevkifatCenterId: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    // ACTIVE veya APPROVED durumundaki üyelere Kesinti kabul edilir
    if (
      (member.status !== MemberStatus.ACTIVE &&
        member.status !== MemberStatus.APPROVED) ||
      !member.isActive ||
      member.deletedAt
    ) {
      throw new BadRequestException(
        'Aktif veya onaylanmış olmayan üye için Kesinti kaydedilemez',
      );
    }

    // TEVKIFAT tipinde tevkifatCenterId zorunlu
    if (dto.paymentType === PaymentType.TEVKIFAT && !dto.tevkifatCenterId) {
      throw new BadRequestException(
        'Tevkifat Kesintisi için tevkifat merkezi seçilmelidir',
      );
    }

    // Tevkifat merkezi kontrolü (varsa)
    if (dto.tevkifatCenterId) {
      const tevkifatCenter = await this.prisma.tevkifatCenter.findUnique({
        where: { id: dto.tevkifatCenterId },
      });

      if (!tevkifatCenter) {
        throw new NotFoundException('Tevkifat merkezi bulunamadı');
      }
    }

    // Tevkifat dosyası kontrolü (varsa)
    if (dto.tevkifatFileId) {
      const tevkifatFile = await this.prisma.tevkifatFile.findUnique({
        where: { id: dto.tevkifatFileId },
      });

      if (!tevkifatFile) {
        throw new NotFoundException('Tevkifat dosyası bulunamadı');
      }
    }

    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();

    const payment = await this.prisma.memberPayment.create({
      data: {
        memberId: dto.memberId,
        registrationNumber: member.registrationNumber,
        paymentDate,
        paymentPeriodMonth: dto.paymentPeriodMonth,
        paymentPeriodYear: dto.paymentPeriodYear,
        amount: dto.amount,
        paymentType: dto.paymentType,
        tevkifatCenterId: dto.tevkifatCenterId || null,
        tevkifatFileId: dto.tevkifatFileId || null,
        description: dto.description || null,
        documentUrl: dto.documentUrl || null,
        isApproved: true, // Otomatik olarak onaylanmış olarak kaydedilir
        approvedByUserId: createdBy,
        approvedAt: new Date(),
        createdByUserId: createdBy,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
            status: true,
          },
        },
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // APPROVED durumundaki üyeye Kesinti geldiğinde adminlere bildirim gönder
    if (payment.member.status === MemberStatus.APPROVED) {
      try {
        await this.notifyAdminsAboutApprovedMemberPayment(payment);
      } catch (error) {
        // Bildirim gönderme hatası Kesinti kaydını engellemez, sadece log'lanır
        this.logger.error(
          `Beklemedeki üye (${payment.member.registrationNumber}) için Kesinti bildirimi gönderilirken hata: ${error.message}`,
          error.stack,
        );
      }
    }

    return payment;
  }

  /**
   * APPROVED durumundaki üyeye Kesinti geldiğinde adminlere bildirim gönder
   */
  private async notifyAdminsAboutApprovedMemberPayment(payment: any) {
    try {
      // ADMIN rolüne sahip aktif kullanıcıları bul
      const adminUsers = await this.prisma.user.findMany({
        where: {
          customRoles: {
            some: {
              name: 'ADMIN',
              isActive: true,
              deletedAt: null,
            },
          },
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (adminUsers.length === 0) {
        this.logger.warn('ADMIN rolüne sahip aktif kullanıcı bulunamadı');
        return;
      }

      const member = payment.member;
      const amount = payment.amount.toLocaleString('tr-TR', {
        style: 'currency',
        currency: 'TRY',
      });

      // Admin kullanıcılarına bildirim gönder
      // Sistem bildirimi için ilk admin kullanıcıyı sender olarak kullan
      const senderUserId = adminUsers[0].id;
      const notification = await this.notificationsService.create(
        {
          title: 'Beklemedeki Üyeye Kesinti Geldi',
          message: `${member.firstName} ${member.lastName} (${member.registrationNumber}) isimli beklemedeki üyeye ${amount} tutarında Kesinti kaydedildi. Üyeyi aktifleştirmek için Üyelik Kabul Ekranı'nı kontrol edebilirsiniz.`,
          type: NotificationType.IN_APP,
          targetType: NotificationTargetType.USER,
          metadata: {
            userIds: adminUsers.map((u) => u.id),
            userNames: adminUsers.map((u) => `${u.firstName} ${u.lastName}`),
            memberId: member.id,
            paymentId: payment.id,
          },
        },
        senderUserId, // Sistem bildirimi için ilk admin kullanıcıyı sender olarak kullan
      );

      // Bildirimi gönder
      if (notification) {
        await this.notificationsService.send(notification.id);
      }

      this.logger.log(
        `Beklemedeki üye (${member.registrationNumber}) için Kesinti bildirimi ${adminUsers.length} admin kullanıcıya gönderildi`,
      );
    } catch (error) {
      this.logger.error(
        `Admin bildirimi gönderilirken hata: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Kesinti listesi (filtreleme ile)
   */
  async listPayments(filters?: {
    memberId?: string;
    year?: number;
    month?: number;
    paymentType?: PaymentType;
    tevkifatCenterId?: string;
    branchId?: string;
    provinceId?: string;
    districtId?: string;
    isApproved?: boolean;
    registrationNumber?: string;
  }) {
    const where: any = {};

    if (filters?.memberId) {
      where.memberId = filters.memberId;
    }

    if (filters?.year) {
      where.paymentPeriodYear = filters.year;
    }

    if (filters?.month) {
      where.paymentPeriodMonth = filters.month;
    }

    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    if (filters?.tevkifatCenterId) {
      where.tevkifatCenterId = filters.tevkifatCenterId;
    }

    if (filters?.registrationNumber) {
      where.registrationNumber = filters.registrationNumber;
    }

    if (filters?.isApproved !== undefined) {
      where.isApproved = filters.isApproved;
    }

    // Şube filtresi
    if (filters?.branchId) {
      where.member = {
        branchId: filters.branchId,
      };
    }

    // İl/İlçe filtresi
    if (filters?.provinceId || filters?.districtId) {
      where.member = {
        ...where.member,
        ...(filters.provinceId && { provinceId: filters.provinceId }),
        ...(filters.districtId && { districtId: filters.districtId }),
      };
    }

    return this.prisma.memberPayment.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
            institution: {
              select: {
                id: true,
                name: true,
              },
            },
            tevkifatCenter: {
              select: {
                id: true,
                name: true,
              },
            },
            province: {
              select: {
                id: true,
                name: true,
              },
            },
            district: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { paymentPeriodYear: 'desc' },
        { paymentPeriodMonth: 'desc' },
        { paymentDate: 'desc' },
      ],
    });
  }

  /**
   * Üye Kesintilerini listele (memberId'ye göre)
   */
  async getMemberPayments(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    return this.prisma.memberPayment.findMany({
      where: { memberId },
      include: {
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { paymentPeriodYear: 'desc' },
        { paymentPeriodMonth: 'desc' },
        { paymentDate: 'desc' },
      ],
    });
  }

  /**
   * Kesinti detayı
   */
  async getPaymentById(id: string) {
    const payment = await this.prisma.memberPayment.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
            institution: {
              select: {
                id: true,
                name: true,
              },
            },
            tevkifatCenter: {
              select: {
                id: true,
                name: true,
              },
            },
            province: {
              select: {
                id: true,
                name: true,
              },
            },
            district: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        tevkifatFile: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Kesinti kaydı bulunamadı');
    }

    return payment;
  }

  /**
   * Kesintiyi onayla (Admin)
   */
  async approvePayment(id: string, approvedBy: string) {
    const payment = await this.prisma.memberPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Kesinti kaydı bulunamadı');
    }

    if (payment.isApproved) {
      throw new BadRequestException('Bu Kesinti zaten onaylanmış');
    }

    return this.prisma.memberPayment.update({
      where: { id },
      data: {
        isApproved: true,
        approvedByUserId: approvedBy,
        approvedAt: new Date(),
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Kesintiyi güncelle
   */
  async updatePayment(
    id: string,
    dto: UpdateMemberPaymentDto,
    updatedBy: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Kesinti kaydını bul
    const payment = await this.prisma.memberPayment.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            status: true,
            isActive: true,
            deletedAt: true,
            tevkifatCenterId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Kesinti kaydı bulunamadı');
    }

    // Onaylı Kesintiler güncellenebilir (hızlı Kesinti sayfasından düzenleme için)
    // Not: Onaylı Kesintilerin güncellenmesi iş mantığı açısından uygun olabilir
    // Eğer ileride sadece belirli alanların güncellenmesine izin verilmesi gerekiyorsa,
    // bu kontrol tekrar eklenebilir veya daha detaylı hale getirilebilir

    // Üye değişikliği varsa kontrol et
    if (dto.memberId && dto.memberId !== payment.memberId) {
      const member = await this.prisma.member.findUnique({
        where: { id: dto.memberId },
        select: {
          id: true,
          registrationNumber: true,
          status: true,
          isActive: true,
          deletedAt: true,
          tevkifatCenterId: true,
        },
      });

      if (!member) {
        throw new NotFoundException('Üye bulunamadı');
      }

      // ACTIVE veya APPROVED durumundaki üyelere Kesinti kabul edilir
      if (
        (member.status !== MemberStatus.ACTIVE &&
          member.status !== MemberStatus.APPROVED) ||
        !member.isActive ||
        member.deletedAt
      ) {
        throw new BadRequestException(
          'Aktif veya onaylanmış olmayan üye için Kesinti kaydedilemez',
        );
      }
    }

    // Kesinti türü ve tevkifat merkezi kontrolü
    const paymentType = dto.paymentType ?? payment.paymentType;
    const tevkifatCenterId = dto.tevkifatCenterId ?? payment.tevkifatCenterId;

    if (paymentType === PaymentType.TEVKIFAT && !tevkifatCenterId) {
      throw new BadRequestException(
        'Tevkifat Kesintisi için tevkifat merkezi seçilmelidir',
      );
    }

    // Tevkifat merkezi kontrolü (varsa)
    if (tevkifatCenterId) {
      const tevkifatCenter = await this.prisma.tevkifatCenter.findUnique({
        where: { id: tevkifatCenterId },
      });

      if (!tevkifatCenter) {
        throw new NotFoundException('Tevkifat merkezi bulunamadı');
      }
    }

    // Tevkifat dosyası kontrolü (varsa)
    if (dto.tevkifatFileId) {
      const tevkifatFile = await this.prisma.tevkifatFile.findUnique({
        where: { id: dto.tevkifatFileId },
      });

      if (!tevkifatFile) {
        throw new NotFoundException('Tevkifat dosyası bulunamadı');
      }
    }

    // Güncelleme verilerini hazırla
    const updateData: any = {};

    if (dto.memberId) updateData.memberId = dto.memberId;
    if (dto.paymentDate) updateData.paymentDate = new Date(dto.paymentDate);
    if (dto.paymentPeriodMonth !== undefined)
      updateData.paymentPeriodMonth = dto.paymentPeriodMonth;
    if (dto.paymentPeriodYear !== undefined)
      updateData.paymentPeriodYear = dto.paymentPeriodYear;
    if (dto.amount) updateData.amount = dto.amount;
    if (dto.paymentType) updateData.paymentType = dto.paymentType;
    if (dto.tevkifatCenterId !== undefined)
      updateData.tevkifatCenterId = dto.tevkifatCenterId;
    if (dto.tevkifatFileId !== undefined)
      updateData.tevkifatFileId = dto.tevkifatFileId;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.documentUrl !== undefined) updateData.documentUrl = dto.documentUrl;

    // IP adresi ve user agent güncelle (varsa)
    if (ipAddress) updateData.ipAddress = ipAddress;
    if (userAgent) updateData.userAgent = userAgent;

    // Kesintiyi güncelle
    const updatedPayment = await this.prisma.memberPayment.update({
      where: { id },
      data: updateData,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationNumber: true,
            status: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
            institution: {
              select: {
                id: true,
                name: true,
              },
            },
            tevkifatCenter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedPayment;
  }

  /**
   * Kesintiyi iptal et / sil (Admin)
   */
  async deletePayment(id: string) {
    const payment = await this.prisma.memberPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Kesinti kaydı bulunamadı');
    }

    // Onaylı Kesintiler de silinebilir (hızlı Kesinti sayfasından düzenleme/silme için)
    // Not: Onaylı Kesintilerin silinmesi iş mantığı açısından uygun olabilir
    // Eğer ileride sadece belirli durumlarda silinmesine izin verilmesi gerekiyorsa,
    // bu kontrol tekrar eklenebilir veya daha detaylı hale getirilebilir

    return this.prisma.memberPayment.delete({
      where: { id },
    });
  }

  /**
   * Muhasebe için Kesinti listesi (Excel/PDF export için)
   */
  async getPaymentsForAccounting(filters?: {
    branchId?: string;
    tevkifatCenterId?: string;
    year?: number;
    month?: number;
    isApproved?: boolean;
  }) {
    const where: any = {
      ...(filters?.isApproved !== undefined && {
        isApproved: filters.isApproved,
      }),
    };

    if (filters?.branchId) {
      where.member = {
        branchId: filters.branchId,
        status: MemberStatus.ACTIVE,
        isActive: true,
        deletedAt: null,
      };
    }

    if (filters?.tevkifatCenterId) {
      where.tevkifatCenterId = filters.tevkifatCenterId;
    }

    if (filters?.year) {
      where.paymentPeriodYear = filters.year;
    }

    if (filters?.month) {
      where.paymentPeriodMonth = filters.month;
    }

    return this.prisma.memberPayment.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            registrationNumber: true,
            firstName: true,
            lastName: true,
            institution: {
              select: {
                id: true,
                name: true,
              },
            },
            tevkifatCenter: {
              select: {
                id: true,
                name: true,
              },
            },
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        tevkifatCenter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { paymentPeriodYear: 'desc' },
        { paymentPeriodMonth: 'desc' },
        { member: { registrationNumber: 'asc' } },
      ],
    });
  }

  /**
   * Kesinti için dosya yükle
   */
  async uploadPaymentDocument(
    file: Express.Multer.File,
    memberId: string,
    paymentPeriodMonth: number,
    paymentPeriodYear: number,
    customFileName?: string,
  ) {
    // Dosya kontrolü
    if (!file) {
      throw new BadRequestException('Dosya yüklenmedi');
    }

    // Sadece PDF kabul et
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Sadece PDF dosyaları kabul edilir');
    }

    // Üyeyi kontrol et
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        registrationNumber: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Üye bulunamadı');
    }

    // Uploads klasörünü oluştur (yoksa)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'payments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Dosya adını oluştur
    let fileName: string;

    if (customFileName && customFileName.trim()) {
      // Özel dosya adı varsa onu kullan
      const cleanedName = customFileName
        .trim()
        .replace(/[^a-zA-Z0-9_\-ğüşıöçĞÜŞİÖÇ\s\.]/g, '')
        .replace(/\s+/g, '_');
      // Uzantıyı kontrol et, yoksa .pdf ekle
      const hasExtension = path.extname(cleanedName);
      if (hasExtension) {
        fileName = cleanedName;
      } else {
        fileName = `${cleanedName}.pdf`;
      }
    } else {
      // Otomatik dosya adı oluştur: Odeme_[UyeAdi]_[AyYil]_[Tarih].pdf
      const monthNames = [
        'Ocak',
        'Subat',
        'Mart',
        'Nisan',
        'Mayis',
        'Haziran',
        'Temmuz',
        'Agustos',
        'Eylul',
        'Ekim',
        'Kasim',
        'Aralik',
      ];
      const monthName =
        monthNames[paymentPeriodMonth - 1] || `Ay${paymentPeriodMonth}`;

      // Üye adını temizle (Türkçe karakterleri koru, özel karakterleri kaldır)
      const memberName = `${member.firstName}_${member.lastName}`
        .replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50); // Maksimum 50 karakter

      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const timestamp = Date.now();

      fileName = `Odeme_${memberName}_${monthName}${paymentPeriodYear}_${dateStr}_${timestamp}.pdf`;
    }

    const filePath = path.join(uploadsDir, fileName);
    const fileUrl = `/uploads/payments/${fileName}`;

    // Dosyayı kaydet
    fs.writeFileSync(filePath, file.buffer);

    return {
      fileUrl,
      fileName,
    };
  }

  /**
   * Kesinti belgesi görüntüle (inline)
   */
  async viewPaymentDocument(paymentId: string, res: Response): Promise<void> {
    const payment = await this.prisma.memberPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        documentUrl: true,
        memberId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Kesinti kaydı bulunamadı: ${paymentId}`);
    }

    let filePath: string;
    let fileName: string;

    // Eğer documentUrl varsa, önce onu dene
    if (payment.documentUrl) {
      // documentUrl formatı: /uploads/payments/fileName.pdf
      // Dosya yolunu oluştur
      fileName = payment.documentUrl.split('/').pop() || 'document.pdf';
      filePath = path.join(process.cwd(), 'uploads', 'payments', fileName);

      // Dosyanın var olup olmadığını kontrol et
      // Eğer dosya yoksa, varsayılan Odeme.pdf dosyasını kullan
      if (!fs.existsSync(filePath)) {
        const defaultPdfPath = path.join(process.cwd(), 'prisma', 'Odeme.pdf');
        if (fs.existsSync(defaultPdfPath)) {
          this.logger.warn(
            `Kesinti belgesi bulunamadı: ${fileName}, varsayılan Odeme.pdf kullanılıyor`,
          );
          filePath = defaultPdfPath;
          fileName = 'Odeme.pdf';
        } else {
          throw new NotFoundException(`Dosya bulunamadı: ${fileName}`);
        }
      }
    } else {
      // documentUrl yoksa, direkt varsayılan PDF'i kullan
      const defaultPdfPath = path.join(process.cwd(), 'prisma', 'Odeme.pdf');
      if (fs.existsSync(defaultPdfPath)) {
        this.logger.warn(
          `Kesinti için belge URL'i yok, varsayılan Odeme.pdf kullanılıyor`,
        );
        filePath = defaultPdfPath;
        fileName = 'Odeme.pdf';
      } else {
        throw new NotFoundException(
          'Bu Kesinti için belge bulunamadı ve varsayılan belge de mevcut değil',
        );
      }
    }

    // Content-Type header'ını ayarla (inline olarak göster)
    res.setHeader('Content-Type', 'application/pdf');

    // HTTP header'larında sadece ASCII karakterler kullanılabilir
    const asciiFileName = fileName
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
      .replace(/[^\x00-\x7F]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

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

    return new Promise<void>((resolve, reject) => {
      fileStream.on('end', () => resolve());
      fileStream.on('error', (error) => reject(error));
    });
  }

  /**
   * Kesinti belgesi indir
   */
  async downloadPaymentDocument(
    paymentId: string,
    res: Response,
  ): Promise<void> {
    const payment = await this.prisma.memberPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        documentUrl: true,
        memberId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Kesinti kaydı bulunamadı: ${paymentId}`);
    }

    if (!payment.documentUrl) {
      throw new NotFoundException('Bu Kesinti için belge bulunamadı');
    }

    // documentUrl formatı: /uploads/payments/fileName.pdf veya uploads/payments/fileName.pdf
    // Dosya yolunu oluştur
    const fileName = payment.documentUrl.split('/').pop() || 'document.pdf';
    const filePath = path.join(process.cwd(), 'uploads', 'payments', fileName);

    // Dosyanın var olup olmadığını kontrol et
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Dosya bulunamadı: ${fileName}`);
    }

    // Content-Type header'ını ayarla (download olarak göster)
    res.setHeader('Content-Type', 'application/pdf');

    // HTTP header'larında sadece ASCII karakterler kullanılabilir
    const asciiFileName = fileName
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
      .replace(/[^\x00-\x7F]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const safeAsciiFileName = asciiFileName
      .replace(/"/g, '')
      .replace(/;/g, '_');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeAsciiFileName}"`,
    );

    // Dosyayı gönder
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    return new Promise<void>((resolve, reject) => {
      fileStream.on('end', () => resolve());
      fileStream.on('error', (error) => reject(error));
    });
  }
}
