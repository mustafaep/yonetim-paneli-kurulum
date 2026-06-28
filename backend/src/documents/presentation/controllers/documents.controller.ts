import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  UseInterceptors,
  UploadedFile,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentsService } from '../../documents.service';
import { CreateDocumentTemplateDto } from '../../application/dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from '../../application/dto/update-document-template.dto';
import {
  GenerateDocumentDto,
  GenerateMemberListDocumentDto,
  UploadMemberDocumentDto,
  ApproveDocumentDto,
  RejectDocumentDto,
} from '../../dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { DocumentExceptionFilter } from '../filters/document-exception.filter';
import { DocumentValidationPipe } from '../pipes/document-validation.pipe';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('documents')
@UseFilters(DocumentExceptionFilter)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Şablonlar
  @Permissions(
    Permission.DOCUMENT_TEMPLATE_MANAGE,
    Permission.DOCUMENT_GENERATE_PDF,
  )
  @Get('templates')
  @ApiOperation({ summary: 'Doküman şablonlarını listele' })
  @ApiResponse({ status: 200, description: 'Şablon listesi' })
  async findAllTemplates() {
    return this.documentsService.findAllTemplates();
  }

  @Permissions(Permission.DOCUMENT_TEMPLATE_MANAGE)
  @Get('templates/:id')
  @ApiOperation({ summary: 'Şablon detayı' })
  @ApiParam({ name: 'id', description: 'Şablon ID' })
  @ApiResponse({ status: 200, description: 'Şablon detayı' })
  @ApiResponse({ status: 404, description: 'Şablon bulunamadı' })
  async findTemplateById(@Param('id') id: string) {
    return this.documentsService.findTemplateById(id);
  }

  @Permissions(Permission.DOCUMENT_TEMPLATE_MANAGE)
  @Post('templates')
  @UsePipes(DocumentValidationPipe)
  @ApiOperation({ summary: 'Yeni şablon oluştur' })
  @ApiResponse({ status: 201, description: 'Şablon oluşturuldu' })
  async createTemplate(@Body() dto: CreateDocumentTemplateDto) {
    return this.documentsService.createTemplate(dto);
  }

  @Permissions(Permission.DOCUMENT_TEMPLATE_MANAGE)
  @Patch('templates/:id')
  @UsePipes(DocumentValidationPipe)
  @ApiOperation({ summary: 'Şablon güncelle' })
  @ApiParam({ name: 'id', description: 'Şablon ID' })
  @ApiResponse({ status: 200, description: 'Şablon güncellendi' })
  @ApiResponse({ status: 404, description: 'Şablon bulunamadı' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentTemplateDto,
  ) {
    return this.documentsService.updateTemplate(id, dto);
  }

  @Permissions(Permission.DOCUMENT_TEMPLATE_MANAGE)
  @Delete('templates/:id')
  @ApiOperation({ summary: 'Şablon sil' })
  @ApiParam({ name: 'id', description: 'Şablon ID' })
  @ApiResponse({ status: 200, description: 'Şablon silindi' })
  @ApiResponse({ status: 404, description: 'Şablon bulunamadı' })
  async deleteTemplate(@Param('id') id: string) {
    return this.documentsService.deleteTemplate(id);
  }

  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Get('recent-panel-pdfs')
  @ApiOperation({
    summary:
      'PDF Oluştur sayfası — son 10 PDF (admin: tümü, diğer kullanıcılar: kendi oluşturdukları)',
  })
  @ApiResponse({ status: 200, description: 'Son PDF kayıtları' })
  async listRecentPanelPdfs(@CurrentUser() user: CurrentUserData) {
    return this.documentsService.listRecentPanelPdfs(user.userId);
  }

  // Üye dokümanları
  @Permissions(
    Permission.DOCUMENT_MEMBER_HISTORY_VIEW,
    Permission.DOCUMENT_GENERATE_PDF,
  )
  @Get('members/:memberId')
  @ApiOperation({ summary: 'Üye dokümanlarını listele' })
  @ApiParam({ name: 'memberId', description: 'Üye ID' })
  @ApiResponse({ status: 200, description: 'Doküman listesi' })
  @ApiResponse({ status: 404, description: 'Üye bulunamadı' })
  async findMemberDocuments(@Param('memberId') memberId: string) {
    return this.documentsService.findMemberDocuments(memberId);
  }

  // PDF oluştur
  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Post('generate')
  @ApiOperation({ summary: 'PDF doküman oluştur' })
  @ApiBody({ type: GenerateDocumentDto })
  @ApiResponse({ status: 201, description: 'PDF doküman oluşturuldu' })
  @ApiResponse({ status: 404, description: 'Şablon veya üye bulunamadı' })
  async generateDocument(
    @Body() dto: GenerateDocumentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.generateDocument(dto, user.userId);
  }

  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Post('preview')
  @ApiOperation({ summary: 'PDF doküman önizleme oluştur (kaydetmeden)' })
  async previewDocument(
    @Body() dto: GenerateDocumentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.previewDocument(dto, user.userId);
  }

  // Toplu üye listesi PDF oluştur (tek PDF, birden fazla üye)
  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Post('generate-list')
  @ApiOperation({ summary: 'Toplu üye listesi PDF dokümanı oluştur (tek PDF)' })
  @ApiBody({ type: GenerateMemberListDocumentDto })
  @ApiResponse({ status: 201, description: 'Toplu liste PDF oluşturuldu' })
  async generateMemberListDocument(
    @Body() dto: GenerateMemberListDocumentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.generateMemberListDocument(dto, user.userId);
  }

  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Post('preview-list')
  @ApiOperation({ summary: 'Toplu liste PDF önizleme oluştur (kaydetmeden)' })
  async previewMemberListDocument(
    @Body() dto: GenerateMemberListDocumentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.previewMemberListDocument(dto, user.userId);
  }

  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Post('preview-bulk')
  @ApiOperation({
    summary:
      'Toplu üye PDF önizleme (her üye ayrı dosya; önizleme ilk üye için)',
  })
  async previewBulkMemberDocuments(
    @Body() dto: GenerateMemberListDocumentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.previewBulkMemberDocuments(dto, user.userId);
  }

  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Get('preview/:previewId/view')
  @ApiOperation({ summary: 'Önizleme PDF görüntüle' })
  async viewPreview(
    @Param('previewId') previewId: string,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ) {
    await this.documentsService.viewPreview(previewId, user.userId, res);
  }

  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Post('preview/:previewId/commit')
  @ApiOperation({ summary: 'Önizleme PDF kaydet (kalıcılaştır)' })
  async commitPreview(
    @Param('previewId') previewId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.commitPreview(previewId, user.userId);
  }

  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Delete('preview/:previewId')
  @ApiOperation({ summary: 'Önizleme PDF sil (vazgeç)' })
  async discardPreview(
    @Param('previewId') previewId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.discardPreview(previewId, user.userId);
  }

  // Doküman yükle
  @Permissions(Permission.DOCUMENT_UPLOAD)
  @Post('members/:memberId/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Üye dokümanı yükle' })
  @ApiParam({ name: 'memberId', description: 'Üye ID' })
  @ApiBody({ type: UploadMemberDocumentDto })
  @ApiResponse({ status: 201, description: 'Doküman yüklendi' })
  @ApiResponse({ status: 404, description: 'Üye bulunamadı' })
  async uploadMemberDocument(
    @Param('memberId') memberId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: { documentType?: string; description?: string; fileName?: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.uploadMemberDocument(
      memberId,
      file,
      body.documentType || 'UPLOADED',
      body.description,
      user.userId,
      body.fileName,
    );
  }

  // PDF görüntüle (inline)
  @Permissions(
    Permission.DOCUMENT_MEMBER_HISTORY_VIEW,
    Permission.DOCUMENT_GENERATE_PDF,
  )
  @Get('view/:documentId')
  @ApiOperation({ summary: 'PDF dokümanı görüntüle (inline)' })
  @ApiParam({ name: 'documentId', description: 'Doküman ID' })
  @ApiResponse({ status: 200, description: 'Dosya görüntüleniyor' })
  @ApiResponse({ status: 404, description: 'Doküman bulunamadı' })
  async viewDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    await this.documentsService.viewDocument(documentId, res);
  }

  // PDF indir
  @Permissions(Permission.DOCUMENT_DOWNLOAD)
  @Get('download/:documentId')
  @ApiOperation({ summary: 'PDF dokümanı indir' })
  @ApiParam({ name: 'documentId', description: 'Doküman ID' })
  @ApiResponse({ status: 200, description: 'Dosya indiriliyor' })
  @ApiResponse({ status: 404, description: 'Doküman bulunamadı' })
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    await this.documentsService.downloadDocument(documentId, res);
  }

  // Üye dokümanını sil
  @Permissions(Permission.DOCUMENT_GENERATE_PDF)
  @Delete(':documentId')
  @ApiOperation({ summary: 'Üye dokümanını sil' })
  @ApiParam({ name: 'documentId', description: 'Doküman ID' })
  @ApiResponse({ status: 200, description: 'Doküman silindi' })
  @ApiResponse({ status: 404, description: 'Doküman bulunamadı' })
  async deleteMemberDocument(@Param('documentId') documentId: string) {
    await this.documentsService.deleteMemberDocument(documentId);
    return { message: 'Doküman silindi' };
  }

  // Admin: İnceleme bekleyen dokümanları getir
  @Permissions(
    Permission.DOCUMENT_TEMPLATE_MANAGE,
    Permission.DOCUMENT_GENERATE_PDF,
  )
  @Get('pending-review')
  @ApiOperation({ summary: 'İnceleme bekleyen dokümanları listele (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'İnceleme bekleyen doküman listesi',
  })
  async getPendingReviewDocuments() {
    return this.documentsService.getPendingReviewDocuments();
  }

  // Admin: Dokümanı onayla
  @Permissions(
    Permission.DOCUMENT_TEMPLATE_MANAGE,
    Permission.DOCUMENT_GENERATE_PDF,
  )
  @Post(':documentId/approve')
  @ApiOperation({ summary: 'Dokümanı onayla (Admin)' })
  @ApiParam({ name: 'documentId', description: 'Doküman ID' })
  @ApiBody({ type: ApproveDocumentDto })
  @ApiResponse({ status: 200, description: 'Doküman onaylandı' })
  @ApiResponse({ status: 404, description: 'Doküman bulunamadı' })
  @ApiResponse({ status: 400, description: 'Doküman onaylanamaz durumda' })
  async approveDocument(
    @Param('documentId') documentId: string,
    @Body() dto: ApproveDocumentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.approveDocument(
      documentId,
      user.userId,
      dto.adminNote,
    );
  }

  // Admin: Dokümanı reddet
  @Permissions(
    Permission.DOCUMENT_TEMPLATE_MANAGE,
    Permission.DOCUMENT_GENERATE_PDF,
  )
  @Post(':documentId/reject')
  @ApiOperation({ summary: 'Dokümanı reddet (Admin)' })
  @ApiParam({ name: 'documentId', description: 'Doküman ID' })
  @ApiBody({ type: RejectDocumentDto })
  @ApiResponse({ status: 200, description: 'Doküman reddedildi' })
  @ApiResponse({ status: 404, description: 'Doküman bulunamadı' })
  @ApiResponse({
    status: 400,
    description: 'Doküman reddedilemez durumda veya red nedeni eksik',
  })
  async rejectDocument(
    @Param('documentId') documentId: string,
    @Body() dto: RejectDocumentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.rejectDocument(
      documentId,
      user.userId,
      dto.rejectionReason,
    );
  }
}
