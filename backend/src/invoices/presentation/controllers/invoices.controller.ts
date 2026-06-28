import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { InvoicesService } from '../../invoices.service';
import { CreateInvoiceDto } from '../../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../../dto/update-invoice.dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Permissions(Permission.INVOICE_VIEW)
  @Get()
  @ApiOperation({ summary: 'Faturaları listele' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  async listInvoices(
    @Query('search') search?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.invoicesService.listInvoices({
      search: search?.trim() || undefined,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      status,
    });
  }

  @Permissions(Permission.INVOICE_CREATE)
  @Post()
  @ApiOperation({ summary: 'Yeni fatura oluştur' })
  @ApiResponse({ status: 201, description: 'Fatura oluşturuldu' })
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.invoicesService.createInvoice(dto, user.userId);
  }

  @Permissions(Permission.INVOICE_CREATE, Permission.INVOICE_UPDATE)
  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Fatura evrakı yükle (PDF)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        month: { type: 'number' },
        year: { type: 'number' },
        fileName: { type: 'string', description: 'Özel dosya adı (opsiyonel)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Dosya yüklendi' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('month') month: string,
    @Body('year') year: string,
    @Body('fileName') fileName?: string,
  ) {
    return this.invoicesService.uploadInvoiceDocument(
      file,
      Number(month),
      Number(year),
      fileName,
    );
  }

  @Permissions(Permission.INVOICE_VIEW)
  @Get(':id/document/view')
  @ApiOperation({ summary: 'Fatura belgesi görüntüle' })
  @ApiParam({ name: 'id', description: 'Fatura ID' })
  async viewDocument(@Param('id') id: string, @Res() res: Response) {
    await this.invoicesService.viewInvoiceDocument(id, res);
  }

  @Permissions(Permission.DOCUMENT_DOWNLOAD)
  @Get(':id/document/download')
  @ApiOperation({ summary: 'Fatura belgesi indir' })
  @ApiParam({ name: 'id', description: 'Fatura ID' })
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    await this.invoicesService.downloadInvoiceDocument(id, res);
  }

  @Permissions(Permission.INVOICE_VIEW)
  @Get(':id')
  @ApiOperation({ summary: 'Fatura detayı' })
  @ApiParam({ name: 'id', description: 'Fatura ID' })
  async getById(@Param('id') id: string) {
    return this.invoicesService.getInvoiceById(id);
  }

  @Permissions(Permission.INVOICE_UPDATE)
  @Patch(':id')
  @ApiOperation({ summary: 'Faturayı güncelle' })
  @ApiParam({ name: 'id', description: 'Fatura ID' })
  async updateInvoice(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.updateInvoice(id, dto);
  }

  @Permissions(Permission.INVOICE_DELETE)
  @Delete(':id')
  @ApiOperation({ summary: 'Faturayı sil (soft delete)' })
  @ApiParam({ name: 'id', description: 'Fatura ID' })
  async deleteInvoice(@Param('id') id: string) {
    return this.invoicesService.deleteInvoice(id);
  }
}
