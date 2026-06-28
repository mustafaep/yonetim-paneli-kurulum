import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private prisma: PrismaService) {}

  private assertSafeDocumentUrl(url: string): string {
    const normalized = url.replace(/\\/g, '/');
    if (!normalized.startsWith('/uploads/invoices/')) {
      throw new BadRequestException(
        'Belge URL\'i geçersiz. Lütfen /invoices/upload-document endpoint\'ini kullanın.',
      );
    }
    if (normalized.includes('..')) {
      throw new BadRequestException('Belge URL\'i path traversal içeriyor.');
    }
    return normalized;
  }

  private defaultInclude(): Prisma.InvoiceInclude {
    return {
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    };
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async listInvoices(filters?: {
    search?: string;
    year?: number;
    month?: number;
    status?: InvoiceStatus;
  }) {
    const where: Prisma.InvoiceWhereInput = { deletedAt: null };

    if (filters?.year) where.year = filters.year;
    if (filters?.month) where.month = filters.month;
    if (filters?.status) where.status = filters.status;

    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { invoiceNo: { contains: q, mode: 'insensitive' } },
        { recipient: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      return await this.prisma.invoice.findMany({
        where,
        include: this.defaultInclude(),
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { issueDate: 'desc' }],
      });
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('Invoice')) {
        this.logger.warn('Invoice tablosu bulunamadı, boş liste döndürülüyor.');
        return [];
      }
      throw error;
    }
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Fatura bulunamadı');
    }
    return invoice;
  }

  async createInvoice(dto: CreateInvoiceDto, createdByUserId: string) {
    const docUrlRaw = dto.documentUrl?.trim();
    const safeDocUrl = docUrlRaw ? this.assertSafeDocumentUrl(docUrlRaw) : null;

    const invoiceNo = dto.invoiceNo.trim();
    const existing = await this.prisma.invoice.findFirst({
      where: { invoiceNo, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(`"${invoiceNo}" fatura numarası zaten kullanılıyor.`);
    }

    return this.prisma.invoice.create({
      data: {
        invoiceNo,
        recipient: dto.recipient.trim(),
          issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          month: dto.month,
          year: dto.year,
          amount: dto.amount,
          status: dto.status ?? InvoiceStatus.DRAFT,
          description: dto.description?.trim() || null,
          documentUrl: safeDocUrl,
          createdByUserId,
        },
        include: this.defaultInclude(),
      });
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Fatura bulunamadı');
    }

    const data: Prisma.InvoiceUncheckedUpdateInput = {};

    if (dto.invoiceNo !== undefined) {
      const newNo = dto.invoiceNo.trim();
      if (newNo !== invoice.invoiceNo) {
        const conflict = await this.prisma.invoice.findFirst({
          where: { invoiceNo: newNo, deletedAt: null, id: { not: id } },
        });
        if (conflict) {
          throw new BadRequestException(`"${newNo}" fatura numarası zaten kullanılıyor.`);
        }
      }
      data.invoiceNo = newNo;
    }
    if (dto.recipient !== undefined) data.recipient = dto.recipient.trim();
    if (dto.issueDate !== undefined) data.issueDate = new Date(dto.issueDate);
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.month !== undefined) data.month = dto.month;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;

    if (dto.documentUrl?.trim()) {
      data.documentUrl = this.assertSafeDocumentUrl(dto.documentUrl.trim());
    } else if (dto.clearDocument) {
      if (invoice.documentUrl) {
        const fileName = invoice.documentUrl.split('/').pop();
        if (fileName) {
          const filePath = path.join(process.cwd(), 'uploads', 'invoices', fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
      data.documentUrl = null;
    }

    return this.prisma.invoice.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });
  }

  async deleteInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Fatura bulunamadı');
    }

    if (invoice.documentUrl) {
      const fileName = invoice.documentUrl.split('/').pop();
      if (fileName) {
        const filePath = path.join(process.cwd(), 'uploads', 'invoices', fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date(), documentUrl: null },
    });

    return { success: true };
  }

  // ─── Belge (PDF) ─────────────────────────────────────────────────────────

  async uploadInvoiceDocument(
    file: Express.Multer.File,
    month: number,
    year: number,
    customFileName?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya yüklenmedi');
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Sadece PDF dosyaları kabul edilir');
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let fileName: string;

    if (customFileName?.trim()) {
      const cleaned = customFileName
        .trim()
        .replace(/[^a-zA-Z0-9_\-ğüşıöçĞÜŞİÖÇ\s\.]/g, '')
        .replace(/\s+/g, '_');
      fileName = path.extname(cleaned) ? cleaned : `${cleaned}.pdf`;
    } else {
      const monthNames = [
        'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
        'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik',
      ];
      const monthName = monthNames[month - 1] || `Ay${month}`;
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const ts = Date.now();
      fileName = `Fatura_${monthName}${year}_${dateStr}_${ts}.pdf`;
    }

    const filePath = path.join(uploadsDir, fileName);
    const fileUrl = `/uploads/invoices/${fileName}`;
    fs.writeFileSync(filePath, file.buffer);

    return { fileUrl, fileName };
  }

  async viewInvoiceDocument(invoiceId: string, res: Response): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      select: { id: true, documentUrl: true },
    });
    if (!invoice) throw new NotFoundException(`Fatura bulunamadı: ${invoiceId}`);
    if (!invoice.documentUrl) throw new NotFoundException('Bu fatura için belge bulunamadı');

    const fileName = invoice.documentUrl.split('/').pop() || 'fatura.pdf';
    const filePath = path.join(process.cwd(), 'uploads', 'invoices', fileName);
    if (!fs.existsSync(filePath)) throw new NotFoundException(`Dosya bulunamadı: ${fileName}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${this.toAsciiFileName(fileName)}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return new Promise<void>((resolve, reject) => {
      stream.on('end', () => resolve());
      stream.on('error', (e) => reject(e));
    });
  }

  async downloadInvoiceDocument(invoiceId: string, res: Response): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      select: { id: true, documentUrl: true },
    });
    if (!invoice) throw new NotFoundException(`Fatura bulunamadı: ${invoiceId}`);
    if (!invoice.documentUrl) throw new NotFoundException('Bu fatura için belge bulunamadı');

    const fileName = invoice.documentUrl.split('/').pop() || 'fatura.pdf';
    const filePath = path.join(process.cwd(), 'uploads', 'invoices', fileName);
    if (!fs.existsSync(filePath)) throw new NotFoundException(`Dosya bulunamadı: ${fileName}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${this.toAsciiFileName(fileName)}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return new Promise<void>((resolve, reject) => {
      stream.on('end', () => resolve());
      stream.on('error', (e) => reject(e));
    });
  }

  private toAsciiFileName(fileName: string): string {
    return fileName
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C')
      .replace(/[^\x00-\x7F]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/"/g, '').replace(/;/g, '_');
  }
}
