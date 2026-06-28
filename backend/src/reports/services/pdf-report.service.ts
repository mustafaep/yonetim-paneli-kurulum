import { Injectable, Logger } from '@nestjs/common';
import { PdfService } from '../../documents/services/pdf.service';
import type { Response } from 'express';

@Injectable()
export class PdfReportService {
  private readonly logger = new Logger(PdfReportService.name);

  constructor(private pdfService: PdfService) {}

  /**
   * Rapor verisini PDF olarak export et
   */
  async exportReportToPdf(
    data: any,
    reportType: 'global' | 'region' | 'dues' | 'member-status',
    filename: string,
    res: Response,
  ): Promise<void> {
    try {
      const htmlContent = this.generateReportHtml(data, reportType);
      const pdfBuffer = await this.pdfService.generatePdfBufferFromHtml(
        htmlContent,
        {
          format: 'A4',
          printBackground: true,
        },
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.pdf"`,
      );
      res.send(pdfBuffer);

      this.logger.log(`PDF report exported: ${filename}.pdf`);
    } catch (error) {
      this.logger.error(
        `Failed to export PDF report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Rapor verisini HTML'e dönüştür
   */
  private generateReportHtml(
    data: any,
    reportType: 'global' | 'region' | 'dues' | 'member-status',
  ): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let content = '';

    switch (reportType) {
      case 'global':
        content = this.generateGlobalReportHtml(data);
        break;
      case 'region':
        content = this.generateRegionReportHtml(data);
        break;
      case 'dues':
        content = this.generateDuesReportHtml(data);
        break;
      case 'member-status':
        content = this.generateMemberStatusReportHtml(data);
        break;
    }

    return `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rapor</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            color: #333;
            padding: 20px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1976d2;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .header .date {
            color: #666;
            font-size: 14px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 15px;
            border-left: 4px solid #1976d2;
            padding-left: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #1976d2;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .metric-row {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .metric-label {
            font-weight: bold;
            color: #555;
          }
          .metric-value {
            color: #1976d2;
            font-weight: bold;
          }
          .summary-box {
            background-color: #f5f5f5;
            border: 2px solid #1976d2;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
          }
          .summary-box h3 {
            color: #1976d2;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sendika Yönetim Sistemi - Rapor</h1>
          <div class="date">Tarih: ${dateStr}</div>
        </div>
        ${content}
      </body>
      </html>
    `;
  }

  private generateGlobalReportHtml(data: any): string {
    return `
      <div class="section">
        <div class="section-title">Genel İstatistikler</div>
        <div class="summary-box">
          <div class="metric-row">
            <span class="metric-label">Toplam Üye:</span>
            <span class="metric-value">${data.totalMembers}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Aktif Üye:</span>
            <span class="metric-value">${data.activeMembers}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">İptal Edilmiş Üye:</span>
            <span class="metric-value">${data.cancelledMembers}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Toplam Kullanıcı:</span>
            <span class="metric-value">${data.totalUsers}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Toplam Kesinti:</span>
            <span class="metric-value">${data.totalPayments.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Toplam Borç:</span>
            <span class="metric-value">${data.totalDebt.toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>
      </div>
      ${
        data.byProvince && data.byProvince.length > 0
          ? `
        <div class="section">
          <div class="section-title">İl Bazlı Dağılım</div>
          <table>
            <thead>
              <tr>
                <th>İl</th>
                <th>Üye Sayısı</th>
              </tr>
            </thead>
            <tbody>
              ${data.byProvince
                .map(
                  (item: any) => `
                <tr>
                  <td>${item.provinceName}</td>
                  <td>${item.memberCount}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
          : ''
      }
      ${
        data.byStatus && data.byStatus.length > 0
          ? `
        <div class="section">
          <div class="section-title">Durum Bazlı Dağılım</div>
          <table>
            <thead>
              <tr>
                <th>Durum</th>
                <th>Sayı</th>
              </tr>
            </thead>
            <tbody>
              ${data.byStatus
                .map(
                  (item: any) => `
                <tr>
                  <td>${this.translateStatus(item.status)}</td>
                  <td>${item.count}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
          : ''
      }
    `;
  }

  private generateRegionReportHtml(data: any): string {
    if (Array.isArray(data)) {
      // Birden fazla bölge
      return `
        <div class="section">
          <div class="section-title">Bölge Raporları</div>
          <table>
            <thead>
              <tr>
                <th>İl</th>
                <th>Üye Sayısı</th>
                <th>Aktif Üye</th>
                <th>İptal Edilmiş</th>
                <th>Toplam Kesinti</th>
                <th>Toplam Borç</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (region: any) => `
                <tr>
                  <td>${region.regionName}</td>
                  <td>${region.memberCount}</td>
                  <td>${region.activeMembers}</td>
                  <td>${region.cancelledMembers}</td>
                  <td>${region.totalPayments.toLocaleString('tr-TR')} ₺</td>
                  <td>${region.totalDebt.toLocaleString('tr-TR')} ₺</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      // Tek bölge
      return `
        <div class="section">
          <div class="section-title">${data.regionName} Raporu</div>
          <div class="summary-box">
            <div class="metric-row">
              <span class="metric-label">Üye Sayısı:</span>
              <span class="metric-value">${data.memberCount}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Aktif Üye:</span>
              <span class="metric-value">${data.activeMembers}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">İptal Edilmiş:</span>
              <span class="metric-value">${data.cancelledMembers}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Toplam Kesinti:</span>
              <span class="metric-value">${data.totalPayments.toLocaleString('tr-TR')} ₺</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Toplam Borç:</span>
              <span class="metric-value">${data.totalDebt.toLocaleString('tr-TR')} ₺</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  private generateDuesReportHtml(data: any): string {
    return `
      <div class="section">
        <div class="section-title">Kesinti Raporu</div>
        <div class="summary-box">
          <div class="metric-row">
            <span class="metric-label">Toplam Kesinti:</span>
            <span class="metric-value">${data.totalPayments.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Toplam Borç:</span>
            <span class="metric-value">${data.totalDebt.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Kesinti Yapan Üye:</span>
            <span class="metric-value">${data.paidMembers}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Kesinti Yapmayan Üye:</span>
            <span class="metric-value">${data.unpaidMembers}</span>
          </div>
        </div>
      </div>
      ${
        data.byMonth && data.byMonth.length > 0
          ? `
        <div class="section">
          <div class="section-title">Aylık Kesintiler</div>
          <table>
            <thead>
              <tr>
                <th>Yıl</th>
                <th>Ay</th>
                <th>Toplam</th>
                <th>Adet</th>
              </tr>
            </thead>
            <tbody>
              ${data.byMonth
                .map(
                  (item: any) => `
                <tr>
                  <td>${item.year}</td>
                  <td>${item.month}</td>
                  <td>${item.total.toLocaleString('tr-TR')} ₺</td>
                  <td>${item.count}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
          : ''
      }
    `;
  }

  private generateMemberStatusReportHtml(data: any): string {
    return `
      <div class="section">
        <div class="section-title">Üye Durum Raporu</div>
        <table>
          <thead>
            <tr>
              <th>Durum</th>
              <th>Sayı</th>
              <th>Yüzde</th>
            </tr>
          </thead>
          <tbody>
            ${
              Array.isArray(data)
                ? data
                    .map(
                      (item: any) => `
              <tr>
                <td>${this.translateStatus(item.status)}</td>
                <td>${item.count}</td>
                <td>${item.percentage.toFixed(2)}%</td>
              </tr>
            `,
                    )
                    .join('')
                : ''
            }
          </tbody>
        </table>
      </div>
    `;
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
