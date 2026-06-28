/**
 * Accounting Controller (Presentation Layer)
 *
 * Moved from accounting.controller.ts to presentation/controllers/accounting.controller.ts
 */
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
  ForbiddenException,
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
import { TevkifatCenterApplicationService } from '../../application/services/tevkifat-center-application.service';
import { TevkifatTitleApplicationService } from '../../application/services/tevkifat-title-application.service';
import { TevkifatFileApplicationService } from '../../application/services/tevkifat-file-application.service';
import { AccountingService } from '../../accounting.service'; // Legacy service for backward compatibility
import { UploadTevkifatFileDto } from '../../dto/upload-tevkifat-file.dto';
import { CreateTevkifatCenterDto } from '../../dto/create-tevkifat-center.dto';
import { UpdateTevkifatCenterDto } from '../../dto/update-tevkifat-center.dto';
import { DeleteTevkifatCenterDto } from '../../dto/delete-tevkifat-center.dto';
import { CreateTevkifatTitleDto } from '../../dto/create-tevkifat-title.dto';
import { UpdateTevkifatTitleDto } from '../../dto/update-tevkifat-title.dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { ApprovalStatus } from '@prisma/client';
import { CreateAdvanceDto } from '../../dto/create-advance.dto';
import { UpdateAdvanceDto } from '../../dto/update-advance.dto';

function hasLegacyAdvanceBundle(
  permissions: Permission[] | undefined,
): boolean {
  return (permissions ?? []).includes(Permission.ADVANCE_ADD);
}

/** Avans PDF yükleme, değiştirme, üye evrakından ayırma */
function canManageAdvanceDocument(
  permissions: Permission[] | undefined,
): boolean {
  const p = permissions ?? [];
  return (
    p.includes(Permission.ADVANCE_DOCUMENT) || hasLegacyAdvanceBundle(p)
  );
}

@ApiTags('Accounting')
@ApiBearerAuth('JWT-auth')
@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService, // Legacy service
    private readonly tevkifatCenterApplicationService: TevkifatCenterApplicationService,
    private readonly tevkifatTitleApplicationService: TevkifatTitleApplicationService,
    private readonly tevkifatFileApplicationService: TevkifatFileApplicationService,
  ) {}

  // Legacy endpoints - using legacy service for backward compatibility
  @Permissions(Permission.TEVKIFAT_VIEW)
  @Get('members')
  @ApiOperation({
    summary: 'Muhasebe üyeleri listele',
    description: 'Excel/PDF export için üye listesi',
  })
  @ApiResponse({ status: 200, description: 'Üye listesi' })
  async getMembers(
    @Query('branchId') branchId?: string,
    @Query('tevkifatCenterId') tevkifatCenterId?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.accountingService.getMembersForAccounting({
      branchId,
      tevkifatCenterId,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
  }

  @Permissions(Permission.TEVKIFAT_FILE_UPLOAD)
  @Post('tevkifat-files')
  @ApiOperation({
    summary: 'Tevkifat dosyası yükle',
    description: 'PDF dosya yükleme (admin onayı bekler)',
  })
  @ApiResponse({ status: 201, description: 'Dosya yüklendi (onay bekliyor)' })
  async uploadTevkifatFile(
    @Body() dto: UploadTevkifatFileDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.tevkifatFileApplicationService.uploadFile({
      tevkifatCenterId: dto.tevkifatCenterId,
      totalAmount: dto.totalAmount,
      memberCount: dto.memberCount,
      month: dto.month,
      year: dto.year,
      positionTitle: dto.positionTitle,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      fileSize: dto.fileSize,
      uploadedBy: user.userId,
    });
    // Return Prisma format for backward compatibility
    return this.accountingService.uploadTevkifatFile(dto, user.userId);
  }

  @Permissions(Permission.TEVKIFAT_VIEW)
  @Get('tevkifat-files/:id/download')
  @ApiOperation({ summary: 'Tevkifat dosyası/evrakı indir' })
  @ApiParam({ name: 'id', description: 'Tevkifat dosya ID' })
  @ApiResponse({ status: 200, description: 'PDF dosyası' })
  @ApiResponse({ status: 404, description: 'Dosya bulunamadı' })
  async downloadTevkifatFile(
    @Param('id') id: string,
    @Res() res: import('express').Response,
  ) {
    await this.accountingService.downloadTevkifatFile(id, res);
  }

  @Permissions(Permission.TEVKIFAT_VIEW)
  @Get('tevkifat-files')
  @ApiOperation({
    summary: 'Tevkifat dosyalarını listele',
    description: 'Ay ve yıl bazlı listeleme',
  })
  @ApiResponse({ status: 200, description: 'Tevkifat dosya listesi' })
  async listTevkifatFiles(
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('tevkifatCenterId') tevkifatCenterId?: string,
    @Query('status') status?: ApprovalStatus,
  ) {
    // Using legacy service for now to maintain response format with relations
    return this.accountingService.listTevkifatFiles({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      tevkifatCenterId,
      status,
    });
  }

  @Permissions(Permission.TEVKIFAT_FILE_APPROVE)
  @Post('tevkifat-files/:id/approve')
  @ApiOperation({ summary: 'Tevkifat dosyasını onayla' })
  @ApiResponse({ status: 200, description: 'Dosya onaylandı' })
  async approveTevkifatFile(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.tevkifatFileApplicationService.approveFile(id, user.userId);
    // Return Prisma format for backward compatibility
    return this.accountingService.approveTevkifatFile(id, user.userId);
  }

  @Permissions(Permission.TEVKIFAT_FILE_APPROVE)
  @Post('tevkifat-files/:id/reject')
  @ApiOperation({ summary: 'Tevkifat dosyasını reddet' })
  @ApiResponse({ status: 200, description: 'Dosya reddedildi' })
  async rejectTevkifatFile(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.tevkifatFileApplicationService.rejectFile(id);
    // Return Prisma format for backward compatibility
    return this.accountingService.rejectTevkifatFile(id, user.userId);
  }

  // Tevkifat Merkezleri CRUD - Using new application service
  @Permissions(Permission.TEVKIFAT_CENTER_VIEW)
  @Get('tevkifat-centers')
  @ApiOperation({ summary: 'Tevkifat merkezlerini listele' })
  @ApiQuery({
    name: 'provinceId',
    required: false,
    description:
      'İl ID (filtreleme için - o ile bağlı olanları ve o ilin ilçelerine bağlı olanları gösterir)',
  })
  @ApiQuery({
    name: 'districtId',
    required: false,
    description: 'İlçe ID (filtreleme için)',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    description: 'true ise sadece aktif (kaldırılmamış) tevkifat merkezleri döner',
  })
  @ApiResponse({ status: 200, description: 'Tevkifat merkezleri listesi' })
  async listTevkifatCenters(
    @Query('provinceId') provinceId?: string,
    @Query('districtId') districtId?: string,
    @Query('activeOnly') activeOnly?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.accountingService.listTevkifatCenters({
      provinceId,
      districtId,
      activeOnly: activeOnly === 'true',
    }, user);
  }

  @Permissions(Permission.TEVKIFAT_CENTER_VIEW)
  @Get('tevkifat-centers/:id')
  @ApiOperation({ summary: 'Tevkifat merkezi detayını getir' })
  @ApiParam({ name: 'id', description: 'Tevkifat merkezi ID' })
  @ApiResponse({ status: 200, description: 'Tevkifat merkezi detayı' })
  @ApiResponse({ status: 404, description: 'Tevkifat merkezi bulunamadı' })
  async getTevkifatCenterById(@Param('id') id: string) {
    return this.accountingService.getTevkifatCenterById(id);
  }

  @Permissions(Permission.TEVKIFAT_CENTER_CREATE)
  @Post('tevkifat-centers')
  @ApiOperation({ summary: 'Tevkifat merkezi oluştur' })
  @ApiResponse({ status: 201, description: 'Tevkifat merkezi oluşturuldu' })
  async createTevkifatCenter(@Body() dto: CreateTevkifatCenterDto) {
    const center = await this.tevkifatCenterApplicationService.createCenter({
      name: dto.name,
      provinceId: dto.provinceId,
      districtId: dto.districtId,
    });
    // Return Prisma format for backward compatibility
    return this.accountingService.getTevkifatCenterById(center.id);
  }

  @Permissions(Permission.TEVKIFAT_CENTER_UPDATE)
  @Patch('tevkifat-centers/:id')
  @ApiOperation({ summary: 'Tevkifat merkezi güncelle' })
  @ApiParam({ name: 'id', description: 'Tevkifat merkezi ID' })
  @ApiResponse({ status: 200, description: 'Tevkifat merkezi güncellendi' })
  @ApiResponse({ status: 404, description: 'Tevkifat merkezi bulunamadı' })
  async updateTevkifatCenter(
    @Param('id') id: string,
    @Body() dto: UpdateTevkifatCenterDto,
  ) {
    const center = await this.tevkifatCenterApplicationService.updateCenter(
      id,
      {
        name: dto.name,
        provinceId: dto.provinceId,
        districtId: dto.districtId,
        isActive: dto.isActive,
      },
    );
    // Return Prisma format for backward compatibility
    return this.accountingService.getTevkifatCenterById(center.id);
  }

  @Permissions(Permission.TEVKIFAT_CENTER_DELETE)
  @Delete('tevkifat-centers/:id')
  @ApiOperation({
    summary: 'Tevkifat merkezi sil (pasif yap)',
    description:
      'Mevcut tevkifat merkezini pasif yapar. Üyelere ne yapılacağını belirtmek için body içinde memberActionType ve targetTevkifatCenterId gönderilmelidir.',
  })
  @ApiParam({ name: 'id', description: 'Tevkifat merkezi ID' })
  @ApiResponse({ status: 200, description: 'Tevkifat merkezi pasif yapıldı' })
  @ApiResponse({
    status: 404,
    description: 'Tevkifat merkezi veya hedef tevkifat merkezi bulunamadı',
  })
  async deleteTevkifatCenter(
    @Param('id') id: string,
    @Body() dto: DeleteTevkifatCenterDto,
  ) {
    await this.tevkifatCenterApplicationService.deleteCenter(
      id,
      dto.memberActionType,
      dto.targetTevkifatCenterId,
    );
    return this.accountingService.getTevkifatCenterById(id);
  }

  @Permissions(Permission.TEVKIFAT_CENTER_UPDATE)
  @Post('tevkifat-centers/:id/upload-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tevkifat merkezi evrak yükle',
    description: 'Tevkifat merkezi için PDF evrak yükleme',
  })
  @ApiParam({ name: 'id', description: 'Tevkifat merkezi ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        fileName: {
          type: 'string',
          description: 'Özel dosya adı (opsiyonel)',
        },
        description: {
          type: 'string',
          description: 'Dosya açıklaması (opsiyonel)',
        },
        tevkifatTitleId: {
          type: 'string',
          description: 'Tevkifat ünvanı ID (opsiyonel)',
        },
        month: {
          type: 'number',
          description: 'Ay (1-12)',
        },
        year: {
          type: 'number',
          description: 'Yıl',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Evrak yüklendi' })
  @ApiResponse({ status: 404, description: 'Tevkifat merkezi bulunamadı' })
  async uploadTevkifatCenterDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fileName') fileName?: string,
    @Body('description') description?: string,
    @Body('tevkifatTitleId') tevkifatTitleId?: string,
    @Body('month') month?: string,
    @Body('year') year?: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.accountingService.uploadTevkifatCenterDocument(
      id,
      file,
      fileName,
      description,
      user?.userId,
      tevkifatTitleId,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  // Tevkifat Unvanları CRUD - Using new application service
  @Permissions(Permission.TEVKIFAT_TITLE_VIEW)
  @Get('tevkifat-titles')
  @ApiOperation({ summary: 'Tevkifat unvanlarını listele' })
  @ApiResponse({ status: 200, description: 'Tevkifat unvanları listesi' })
  async listTevkifatTitles() {
    // Using legacy service for backward compatibility
    return this.accountingService.listTevkifatTitles();
  }

  @Permissions(Permission.TEVKIFAT_TITLE_VIEW)
  @Get('tevkifat-titles/:id')
  @ApiOperation({ summary: 'Tevkifat unvanı detayını getir' })
  @ApiParam({ name: 'id', description: 'Tevkifat unvanı ID' })
  @ApiResponse({ status: 200, description: 'Tevkifat unvanı detayı' })
  @ApiResponse({ status: 404, description: 'Tevkifat unvanı bulunamadı' })
  async getTevkifatTitleById(@Param('id') id: string) {
    // Using legacy service for backward compatibility
    return this.accountingService.getTevkifatTitleById(id);
  }

  @Permissions(Permission.TEVKIFAT_TITLE_CREATE)
  @Post('tevkifat-titles')
  @ApiOperation({ summary: 'Tevkifat unvanı oluştur' })
  @ApiResponse({ status: 201, description: 'Tevkifat unvanı oluşturuldu' })
  async createTevkifatTitle(@Body() dto: CreateTevkifatTitleDto) {
    await this.tevkifatTitleApplicationService.createTitle({ name: dto.name });
    // Return Prisma format for backward compatibility
    return this.accountingService.getTevkifatTitleById(
      (await this.tevkifatTitleApplicationService.listTitles()).find(
        (t) => t.name === dto.name,
      )!.id,
    );
  }

  @Permissions(Permission.TEVKIFAT_TITLE_UPDATE)
  @Patch('tevkifat-titles/:id')
  @ApiOperation({ summary: 'Tevkifat unvanı güncelle' })
  @ApiParam({ name: 'id', description: 'Tevkifat unvanı ID' })
  @ApiResponse({ status: 200, description: 'Tevkifat unvanı güncellendi' })
  @ApiResponse({ status: 404, description: 'Tevkifat unvanı bulunamadı' })
  async updateTevkifatTitle(
    @Param('id') id: string,
    @Body() dto: UpdateTevkifatTitleDto,
  ) {
    await this.tevkifatTitleApplicationService.updateTitle(id, {
      name: dto.name,
      isActive: dto.isActive,
    });
    // Return Prisma format for backward compatibility
    return this.accountingService.getTevkifatTitleById(id);
  }

  @Permissions(Permission.TEVKIFAT_TITLE_DELETE)
  @Delete('tevkifat-titles/:id')
  @ApiOperation({ summary: 'Tevkifat unvanı sil (kalıcı silme)' })
  @ApiParam({ name: 'id', description: 'Tevkifat unvanı ID' })
  @ApiResponse({ status: 200, description: 'Tevkifat unvanı silindi' })
  @ApiResponse({ status: 404, description: 'Tevkifat unvanı bulunamadı' })
  async deleteTevkifatTitle(@Param('id') id: string) {
    await this.tevkifatTitleApplicationService.deleteTitle(id);
    return { message: 'Tevkifat unvanı silindi' };
  }

  // Avans Sistemi

  @Permissions(Permission.ADVANCE_VIEW)
  @Get('advances')
  @ApiOperation({
    summary: 'Avansları listele',
    description: 'Yıl, ay, il ve arama filtresi ile avans listesi',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Ad, soyad veya üye kayıt no ile arama',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Yıl filtresi',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    description:
      'Ay filtresi (1-12). Gönderilmezse veya 0 ise seçili yılda tüm aylar dahil edilir.',
  })
  @ApiQuery({
    name: 'provinceId',
    required: false,
    description: 'İl filtresi',
  })
  async listAdvances(
    @Query('search') search?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('provinceId') provinceId?: string,
  ) {
    return this.accountingService.listAdvances({
      search: search?.trim() || undefined,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      provinceId,
    });
  }

  @Permissions(Permission.ADVANCE_CREATE)
  @Post('advances')
  @ApiOperation({
    summary: 'Yeni avans oluştur',
    description: 'Üye için manuel avans kaydı oluşturur',
  })
  @ApiResponse({ status: 201, description: 'Avans kaydı oluşturuldu' })
  async createAdvance(
    @Body() dto: CreateAdvanceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const docUrl = dto.documentUrl?.trim();
    if (docUrl && !canManageAdvanceDocument(user.permissions)) {
      throw new ForbiddenException(
        'Avans belgesi eklemek için "Avans belgesi yönet" izni gereklidir',
      );
    }
    return this.accountingService.createAdvance(dto, user.userId);
  }

  @Permissions(Permission.ADVANCE_DOCUMENT)
  @Post('advances/upload-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Avans evrakı yükle',
    description: 'Avans için PDF yükleme (kesinti evrakı ile aynı akış)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        memberId: { type: 'string' },
        month: { type: 'number', description: 'Dönem ayı (1-12)' },
        year: { type: 'number' },
        fileName: {
          type: 'string',
          description: 'Özel dosya adı (opsiyonel)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Dosya yüklendi' })
  async uploadAdvanceDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('memberId') memberId: string,
    @Body('month') month: string,
    @Body('year') year: string,
    @Body('fileName') fileName?: string,
  ) {
    return this.accountingService.uploadAdvanceDocument(
      file,
      memberId,
      Number(month),
      Number(year),
      fileName,
    );
  }

  @Permissions(Permission.ADVANCE_VIEW)
  @Get('advances/:id/document/view')
  @ApiOperation({
    summary: 'Avans belgesi görüntüle',
    description: 'Avans PDF’ini yeni sekmede aç',
  })
  @ApiParam({ name: 'id', description: 'Avans ID' })
  @ApiResponse({ status: 200, description: 'Dosya görüntüleniyor' })
  async viewAdvanceDocument(@Param('id') id: string, @Res() res: Response) {
    await this.accountingService.viewAdvanceDocument(id, res);
  }

  @Permissions(Permission.ADVANCE_VIEW)
  @Get('advances/:id/document/download')
  @ApiOperation({
    summary: 'Avans belgesi indir',
    description: 'Avans PDF’ini indir',
  })
  @ApiParam({ name: 'id', description: 'Avans ID' })
  @ApiResponse({ status: 200, description: 'Dosya indiriliyor' })
  async downloadAdvanceDocument(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    await this.accountingService.downloadAdvanceDocument(id, res);
  }

  @Permissions(Permission.ADVANCE_VIEW)
  @Get('advances/:id')
  @ApiOperation({
    summary: 'Avans detayı',
    description: 'Belirli bir avans kaydının detaylarını getirir',
  })
  @ApiParam({ name: 'id', description: 'Avans ID' })
  async getAdvanceById(@Param('id') id: string) {
    return this.accountingService.getAdvanceById(id);
  }

  @Permissions(Permission.ADVANCE_UPDATE)
  @Patch('advances/:id')
  @ApiOperation({
    summary: 'Avansı güncelle',
    description: 'Mevcut avans kaydını günceller',
  })
  @ApiParam({ name: 'id', description: 'Avans ID' })
  async updateAdvance(
    @Param('id') id: string,
    @Body() dto: UpdateAdvanceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const touchesDocument =
      Boolean(dto.documentUrl?.trim()) || Boolean(dto.clearDocument);
    if (touchesDocument && !canManageAdvanceDocument(user.permissions)) {
      throw new ForbiddenException(
        'Belge eklemek, değiştirmek veya kaldırmak için yetkiniz yok',
      );
    }
    return this.accountingService.updateAdvance(id, dto, user.userId);
  }

  @Permissions(Permission.ADVANCE_DELETE)
  @Delete('advances/:id')
  @ApiOperation({
    summary: 'Avansı sil',
    description: 'Avans kaydını soft delete ile siler',
  })
  @ApiParam({ name: 'id', description: 'Avans ID' })
  async deleteAdvance(@Param('id') id: string) {
    return this.accountingService.deleteAdvance(id);
  }
}
