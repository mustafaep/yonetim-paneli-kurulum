import {
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { MemberImportValidationService } from '../../application/services/member-import-validation.service';
import { MAX_IMPORT_FILE_BYTES } from '../../constants/member-import-schema';

const allowedMimes = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
];

@ApiTags('Imports')
@ApiBearerAuth('JWT-auth')
@Controller('imports')
export class MemberImportController {
  constructor(
    private readonly validationService: MemberImportValidationService,
  ) {}

  @Permissions(Permission.MEMBER_CREATE_APPLICATION)
  @Get('members/template')
  @ApiOperation({
    summary: 'Toplu üye CSV şablonunu indir',
    description:
      'Türkçe Excel uyumlu (noktalı virgül ayırıcı) şablon ve sistemdeki gerçek il/ilçe/kurum ile doldurulmuş örnek satır döner. Örnek satır doğrulanıp kaydedilebilir.',
  })
  @ApiResponse({ status: 200, description: 'CSV dosyası' })
  async getMemberImportTemplate(
    @Res() res: Response,
    @CurrentUser() _user: CurrentUserData,
  ) {
    const csv = await this.validationService.getTemplateCsv();
    const filename = `toplu_uye_sablonu_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(csv, 'utf-8'));
  }

  @Permissions(Permission.MEMBER_CREATE_APPLICATION)
  @Get('members/sample-csv')
  @ApiOperation({
    summary: '10 rastgele üyeli örnek CSV indir',
    description:
      'Sistemdeki üyelerden 10 tanesi rastgele seçilip aynı CSV formatında döner. Test için kullanılabilir.',
  })
  @ApiResponse({ status: 200, description: 'CSV dosyası' })
  async getSampleMembersCsv(
    @Res() res: Response,
    @CurrentUser() _user: CurrentUserData,
  ) {
    const csv = await this.validationService.getSampleMembersCsv(10);
    const filename = `ornek_10_uye_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(csv, 'utf-8'));
  }

  @Permissions(Permission.MEMBER_CREATE_APPLICATION)
  @Post('members/validate')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMPORT_FILE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Toplu üye dosyasını doğrula',
    description:
      'CSV dosyasını yükler, parse eder ve satır satır doğrular. Önizleme ve hata listesi döner.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV dosyası' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Doğrulama sonucu (preview + hatalar)',
  })
  @ApiResponse({ status: 400, description: 'Geçersiz dosya veya format' })
  async validateMemberImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() _user: CurrentUserData,
  ) {
    if (!file) {
      throw new BadRequestException('Lütfen bir CSV dosyası seçin.');
    }
    const isCsv =
      allowedMimes.includes(file.mimetype) ||
      file.originalname?.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      throw new BadRequestException('Sadece CSV dosyası yükleyebilirsiniz.');
    }
    return this.validationService.validate(file);
  }

  @Permissions(Permission.MEMBER_CREATE_APPLICATION)
  @Post('members/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMPORT_FILE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Toplu üye içe aktar',
    description:
      'CSV dosyasındaki geçerli üyeleri sisteme kaydeder. Hatalı satırları atlayabilir (skipErrors=true) veya tüm satırlar geçerli olmalı (skipErrors=false).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV dosyası' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'İçe aktarma sonucu' })
  @ApiResponse({
    status: 400,
    description: 'Geçersiz dosya veya doğrulama hatası',
  })
  async importMembers(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserData,
    @Query('skipErrors') skipErrors?: string,
    @Query('makeActive') makeActive?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Lütfen bir CSV dosyası seçin.');
    }
    const isCsv =
      allowedMimes.includes(file.mimetype) ||
      file.originalname?.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      throw new BadRequestException('Sadece CSV dosyası yükleyebilirsiniz.');
    }
    return this.validationService.bulkImport(
      file,
      user.userId,
      skipErrors === 'true',
      makeActive === 'true',
    );
  }
}
