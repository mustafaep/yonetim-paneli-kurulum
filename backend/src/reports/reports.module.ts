import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MembersModule } from '../members/members.module';
import { ExcelExportService } from './services/excel-export.service';
import { PdfReportService } from './services/pdf-report.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [PrismaModule, MembersModule, DocumentsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ExcelExportService, PdfReportService],
  exports: [ReportsService, ExcelExportService, PdfReportService],
})
export class ReportsModule {}
