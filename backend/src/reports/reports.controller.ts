import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import type { ReportFilterParams } from './reports.service';
import { ExcelExportService } from './services/excel-export.service';
import { PdfReportService } from './services/pdf-report.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permission.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly excelExportService: ExcelExportService,
    private readonly pdfReportService: PdfReportService,
  ) {}

  private parseFilters(
    provinceId?: string,
    districtId?: string,
    branchId?: string,
    institutionId?: string,
  ): ReportFilterParams | undefined {
    if (!provinceId && !districtId && !branchId && !institutionId) return undefined;
    return { provinceId, districtId, branchId, institutionId };
  }

  @Permissions(Permission.REPORT_GLOBAL_VIEW)
  @Get('global')
  @ApiOperation({ summary: 'Genel rapor' })
  @ApiResponse({ status: 200 })
  async getGlobalReport(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('branchId') branchId?: string,
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.reportsService.getGlobalReport(user, this.parseFilters(provinceId, districtId, branchId, institutionId));
  }

  @Permissions(Permission.REPORT_REGION_VIEW)
  @Get('region')
  @ApiOperation({ summary: 'Bölge raporu' })
  @ApiResponse({ status: 200 })
  async getRegionReport(
    @Query('regionId') regionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.reportsService.getRegionReport(regionId, user);
  }

  @Permissions(Permission.REPORT_MEMBER_STATUS_VIEW)
  @Get('member-status')
  @ApiOperation({ summary: 'Üye durum raporu' })
  @ApiResponse({ status: 200 })
  async getMemberStatusReport(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('branchId') branchId?: string,
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.reportsService.getMemberStatusReport(user, this.parseFilters(provinceId, districtId, branchId, institutionId));
  }

  @Permissions(Permission.REPORT_DUES_VIEW)
  @Get('dues')
  @ApiOperation({ summary: 'Kesinti raporu' })
  @ApiResponse({ status: 200 })
  async getDuesReport(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('branchId') branchId?: string,
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const params = {
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
    };
    return this.reportsService.getDuesReport(user, params, this.parseFilters(provinceId, districtId, branchId, institutionId));
  }

  // Excel Export Endpoints
  @Permissions(Permission.REPORT_GLOBAL_VIEW)
  @Get('global/export/excel')
  @ApiOperation({ summary: 'Genel raporu Excel olarak export et' })
  @ApiResponse({ status: 200, description: 'Excel dosyası indiriliyor' })
  async exportGlobalReportToExcel(
    @Res() res: Response,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const data = await this.reportsService.getGlobalReport(user);
    const excelData = this.excelExportService.formatReportDataForExcel(
      data,
      'global',
    );
    await this.excelExportService.exportToExcel(
      excelData,
      [
        { header: 'A', key: 'A', width: 30 },
        { header: 'B', key: 'B', width: 20 },
        { header: 'C', key: 'C', width: 20 },
        { header: 'D', key: 'D', width: 20 },
        { header: 'E', key: 'E', width: 20 },
        { header: 'F', key: 'F', width: 20 },
      ],
      `Genel_Rapor_${new Date().toISOString().split('T')[0]}`,
      res,
    );
  }

  @Permissions(Permission.REPORT_REGION_VIEW)
  @Get('region/export/excel')
  @ApiOperation({ summary: 'Bölge raporunu Excel olarak export et' })
  @ApiResponse({ status: 200, description: 'Excel dosyası indiriliyor' })
  async exportRegionReportToExcel(
    @Res() res: Response,
    @Query('regionId') regionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const data = await this.reportsService.getRegionReport(regionId, user);
    const excelData = this.excelExportService.formatReportDataForExcel(
      data,
      'region',
    );
    await this.excelExportService.exportToExcel(
      excelData,
      [
        { header: 'A', key: 'A', width: 30 },
        { header: 'B', key: 'B', width: 20 },
        { header: 'C', key: 'C', width: 20 },
        { header: 'D', key: 'D', width: 20 },
        { header: 'E', key: 'E', width: 20 },
        { header: 'F', key: 'F', width: 20 },
      ],
      `Bolge_Raporu_${new Date().toISOString().split('T')[0]}`,
      res,
    );
  }

  @Permissions(Permission.REPORT_DUES_VIEW)
  @Get('dues/export/excel')
  @ApiOperation({ summary: 'Kesinti raporunu Excel olarak export et' })
  @ApiResponse({ status: 200, description: 'Excel dosyası indiriliyor' })
  async exportDuesReportToExcel(
    @Res() res: Response,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const params = {
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
    };
    const data = await this.reportsService.getDuesReport(user, params);
    const excelData = this.excelExportService.formatReportDataForExcel(
      data,
      'dues',
    );
    await this.excelExportService.exportToExcel(
      excelData,
      [
        { header: 'A', key: 'A', width: 30 },
        { header: 'B', key: 'B', width: 20 },
        { header: 'C', key: 'C', width: 20 },
        { header: 'D', key: 'D', width: 20 },
      ],
      `Kesinti_Raporu_${new Date().toISOString().split('T')[0]}`,
      res,
    );
  }

  @Permissions(Permission.REPORT_MEMBER_STATUS_VIEW)
  @Get('member-status/export/excel')
  @ApiOperation({ summary: 'Üye durum raporunu Excel olarak export et' })
  @ApiResponse({ status: 200, description: 'Excel dosyası indiriliyor' })
  async exportMemberStatusReportToExcel(
    @Res() res: Response,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const data = await this.reportsService.getMemberStatusReport(user);
    const excelData = this.excelExportService.formatReportDataForExcel(
      data,
      'member-status',
    );
    await this.excelExportService.exportToExcel(
      excelData,
      [
        { header: 'Durum', key: 'A', width: 20 },
        { header: 'Sayı', key: 'B', width: 15 },
        { header: 'Yüzde', key: 'C', width: 15 },
      ],
      `Uye_Durum_Raporu_${new Date().toISOString().split('T')[0]}`,
      res,
    );
  }

  // PDF Export Endpoints
  @Permissions(Permission.REPORT_GLOBAL_VIEW)
  @Get('global/export/pdf')
  @ApiOperation({ summary: 'Genel raporu PDF olarak export et' })
  @ApiResponse({ status: 200, description: 'PDF dosyası indiriliyor' })
  async exportGlobalReportToPdf(
    @Res() res: Response,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const data = await this.reportsService.getGlobalReport(user);
    await this.pdfReportService.exportReportToPdf(
      data,
      'global',
      `Genel_Rapor_${new Date().toISOString().split('T')[0]}`,
      res,
    );
  }

  @Permissions(Permission.REPORT_REGION_VIEW)
  @Get('region/export/pdf')
  @ApiOperation({ summary: 'Bölge raporunu PDF olarak export et' })
  @ApiResponse({ status: 200, description: 'PDF dosyası indiriliyor' })
  async exportRegionReportToPdf(
    @Res() res: Response,
    @Query('regionId') regionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const data = await this.reportsService.getRegionReport(regionId, user);
    await this.pdfReportService.exportReportToPdf(
      data,
      'region',
      `Bolge_Raporu_${new Date().toISOString().split('T')[0]}`,
      res,
    );
  }

  @Permissions(Permission.REPORT_DUES_VIEW)
  @Get('dues/export/pdf')
  @ApiOperation({ summary: 'Kesinti raporunu PDF olarak export et' })
  @ApiResponse({ status: 200, description: 'PDF dosyası indiriliyor' })
  async exportDuesReportToPdf(
    @Res() res: Response,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const params = {
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
    };
    const data = await this.reportsService.getDuesReport(user, params);
    await this.pdfReportService.exportReportToPdf(
      data,
      'dues',
      `Kesinti_Raporu_${new Date().toISOString().split('T')[0]}`,
      res,
    );
  }

  @Permissions(Permission.REPORT_MEMBER_STATUS_VIEW)
  @Get('member-status/export/pdf')
  @ApiOperation({ summary: 'Üye durum raporunu PDF olarak export et' })
  @ApiResponse({ status: 200, description: 'PDF dosyası indiriliyor' })
  async exportMemberStatusReportToPdf(
    @Res() res: Response,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const data = await this.reportsService.getMemberStatusReport(user);
    await this.pdfReportService.exportReportToPdf(
      data,
      'member-status',
      `Uye_Durum_Raporu_${new Date().toISOString().split('T')[0]}`,
      res,
    );
  }

  @Permissions(Permission.REPORT_GLOBAL_VIEW)
  @Get('member-growth')
  @ApiOperation({ summary: 'Üye artış/azalış istatistikleri' })
  @ApiResponse({ status: 200 })
  async getMemberGrowthStats(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('branchId') branchId?: string,
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.reportsService.getMemberGrowthStats(user, this.parseFilters(provinceId, districtId, branchId, institutionId));
  }

  @Permissions(Permission.REPORT_GLOBAL_VIEW)
  @Get('trends')
  @ApiOperation({ summary: 'Trend istatistikleri' })
  @ApiResponse({ status: 200 })
  async getTrendStats(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('branchId') branchId?: string,
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.reportsService.getTrendStats(user, this.parseFilters(provinceId, districtId, branchId, institutionId));
  }

  @Permissions(Permission.REPORT_GLOBAL_VIEW)
  @Get('alerts')
  @ApiOperation({ summary: 'Hızlı uyarılar' })
  @ApiResponse({ status: 200 })
  async getQuickAlerts(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('branchId') branchId?: string,
    @Query('institutionId') institutionId?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.reportsService.getQuickAlerts(user, this.parseFilters(provinceId, districtId, branchId, institutionId));
  }
}
