import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';

@Injectable()
export class ExcelExportService {
  private readonly logger = new Logger(ExcelExportService.name);

  /**
   * Veriyi Excel dosyası olarak export et
   */
  async exportToExcel(
    data: any[],
    columns: Array<{ header: string; key: string; width?: number }>,
    filename: string,
    res: Response,
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rapor');

      // Kolonları ekle
      worksheet.columns = columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width || 15,
      }));

      // Başlık stili
      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = {
        ...worksheet.getRow(1).font,
        color: { argb: 'FFFFFFFF' },
      };
      worksheet.getRow(1).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      // Verileri ekle
      data.forEach((row) => {
        worksheet.addRow(row);
      });

      // Tüm hücrelere border ekle
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });

      // Response header'larını ayarla
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.xlsx"`,
      );

      // Excel dosyasını stream olarak gönder
      await workbook.xlsx.write(res);
      res.end();

      this.logger.log(`Excel file exported: ${filename}.xlsx`);
    } catch (error) {
      this.logger.error(
        `Failed to export Excel: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Rapor verisini Excel formatına dönüştür
   */
  formatReportDataForExcel(
    data: any,
    reportType: 'global' | 'region' | 'dues' | 'member-status',
  ): any[] {
    switch (reportType) {
      case 'global':
        return this.formatGlobalReportForExcel(data);
      case 'region':
        return this.formatRegionReportForExcel(data);
      case 'dues':
        return this.formatDuesReportForExcel(data);
      case 'member-status':
        return this.formatMemberStatusReportForExcel(data);
      default:
        return [];
    }
  }

  private formatGlobalReportForExcel(data: any): any[] {
    const rows: any[] = [
      { A: 'Metrik', B: 'Değer' },
      { A: 'Toplam Üye', B: data.totalMembers },
      { A: 'Aktif Üye', B: data.activeMembers },
      { A: 'İptal Edilmiş Üye', B: data.cancelledMembers },
      { A: 'Toplam Kullanıcı', B: data.totalUsers },
      { A: 'Toplam Rol', B: data.totalRoles },
      { A: 'Toplam Kesinti', B: data.totalPayments },
      { A: 'Toplam Borç', B: data.totalDebt },
      { A: '', B: '' },
      { A: 'İl Bazlı Dağılım', B: '' },
    ];

    if (data.byProvince && Array.isArray(data.byProvince)) {
      data.byProvince.forEach((item: any) => {
        rows.push({ A: item.provinceName, B: item.memberCount });
      });
    }

    return rows;
  }

  private formatRegionReportForExcel(data: any): any[] {
    if (Array.isArray(data)) {
      // Birden fazla bölge
      const rows: any[] = [
        {
          A: 'İl',
          B: 'Üye Sayısı',
          C: 'Aktif Üye',
          D: 'İptal Edilmiş',
          E: 'Toplam Kesinti',
          F: 'Toplam Borç',
        },
      ];

      data.forEach((region: any) => {
        rows.push({
          A: region.regionName,
          B: region.memberCount,
          C: region.activeMembers,
          D: region.cancelledMembers,
          E: region.totalPayments,
          F: region.totalDebt,
        });
      });

      return rows;
    } else {
      // Tek bölge
      return [
        { A: 'Metrik', B: 'Değer' },
        { A: 'Bölge', B: data.regionName },
        { A: 'Üye Sayısı', B: data.memberCount },
        { A: 'Aktif Üye', B: data.activeMembers },
        { A: 'İptal Edilmiş', B: data.cancelledMembers },
        { A: 'Toplam Kesinti', B: data.totalPayments },
        { A: 'Toplam Borç', B: data.totalDebt },
      ];
    }
  }

  private formatDuesReportForExcel(data: any): any[] {
    const rows: any[] = [
      { A: 'Metrik', B: 'Değer' },
      { A: 'Toplam Kesinti', B: data.totalPayments },
      { A: 'Toplam Borç', B: data.totalDebt },
      { A: 'Kesinti Yapan Üye', B: data.paidMembers },
      { A: 'Kesinti Yapmayan Üye', B: data.unpaidMembers },
      { A: '', B: '' },
      { A: 'Aylık Kesintiler', B: '' },
      { A: 'Yıl', B: 'Ay', C: 'Toplam', D: 'Adet' },
    ];

    if (data.byMonth && Array.isArray(data.byMonth)) {
      data.byMonth.forEach((item: any) => {
        rows.push({
          A: item.year,
          B: item.month,
          C: item.total,
          D: item.count,
        });
      });
    }

    return rows;
  }

  private formatMemberStatusReportForExcel(data: any): any[] {
    const rows: any[] = [{ A: 'Durum', B: 'Sayı', C: 'Yüzde' }];

    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        rows.push({
          A: this.translateStatus(item.status),
          B: item.count,
          C: `${item.percentage.toFixed(2)}%`,
        });
      });
    }

    return rows;
  }

  private translateStatus(status: string): string {
    const translations: Record<string, string> = {
      PENDING: 'Beklemede',
      ACTIVE: 'Aktif',
      INACTIVE: 'Pasif',
      RESIGNED: 'İstifa',
      EXPELLED: 'İhraç',
      REJECTED: 'Reddedildi',
    };
    return translations[status] || status;
  }
}
