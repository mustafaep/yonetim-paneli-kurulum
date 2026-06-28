/**
 * PanelUserApplications Controller (Presentation Layer)
 */
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PanelUserApplicationApplicationService } from '../../application/services/panel-user-application-application.service';
import { PanelUserApplicationsService } from '../../panel-user-applications.service'; // Legacy service
import { CreatePanelUserApplicationDto } from '../../dto/create-panel-user-application.dto';
import { ApprovePanelUserApplicationDto } from '../../dto/approve-panel-user-application.dto';
import { RejectPanelUserApplicationDto } from '../../dto/reject-panel-user-application.dto';
import { DirectPromotePanelUserDto } from '../../dto/direct-promote-panel-user.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';

@ApiTags('Panel User Applications')
@ApiBearerAuth('JWT-auth')
@Controller('panel-user-applications')
export class PanelUserApplicationsController {
  constructor(
    private readonly service: PanelUserApplicationsService, // Legacy service
    private readonly applicationService: PanelUserApplicationApplicationService,
  ) {}

  @Permissions(Permission.PANEL_USER_APPLICATION_CREATE)
  @Post('members/:memberId')
  @ApiOperation({
    summary: 'Panel kullanıcı başvurusu oluştur',
    description: 'Bir üye için panel kullanıcı başvurusu oluşturur',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Üye ID',
    example: 'member-id-123',
  })
  @ApiResponse({
    status: 201,
    description: 'Başvuru başarıyla oluşturuldu',
  })
  @ApiResponse({
    status: 409,
    description:
      'Bu üye için zaten bir başvuru mevcut veya üye zaten panel kullanıcısı',
  })
  async create(
    @Param('memberId') memberId: string,
    @Body() dto: CreatePanelUserApplicationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.applicationService.createApplication({
      memberId,
      requestedRoleId: dto.requestedRoleId,
      requestNote: dto.requestNote,
      scopes: dto.scopes,
      requestedByUserId: user.userId,
    });
    // Return Prisma format for backward compatibility
    return this.service.create(memberId, dto, user.userId);
  }

  @Permissions(Permission.PANEL_USER_APPLICATION_APPROVE)
  @Post('members/:memberId/direct')
  @ApiOperation({
    summary: 'Üyeyi direkt panel kullanıcısına terfi ettir',
    description: 'Başvuru süreci olmaksızın üyeyi direkt panel kullanıcısına terfi ettirir',
  })
  @ApiParam({
    name: 'memberId',
    description: 'Üye ID',
    example: 'member-id-123',
  })
  @ApiResponse({
    status: 201,
    description: 'Kullanıcı başarıyla oluşturuldu',
  })
  @ApiResponse({ status: 400, description: 'Geçersiz veri veya üye aktif değil' })
  @ApiResponse({ status: 404, description: 'Üye veya rol bulunamadı' })
  @ApiResponse({ status: 409, description: 'Üye zaten panel kullanıcısı veya email kullanımda' })
  async directPromote(
    @Param('memberId') memberId: string,
    @Body() dto: DirectPromotePanelUserDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.applicationService.directPromote({
      memberId,
      requestedRoleId: dto.requestedRoleId,
      email: dto.email,
      password: dto.password,
      note: dto.note,
      scopes: dto.scopes,
      reviewedByUserId: user.userId,
    });
  }

  @Permissions(Permission.PANEL_USER_APPLICATION_LIST)
  @Get()
  @ApiOperation({
    summary: 'Panel kullanıcı başvurularını listele',
    description:
      'Tüm panel kullanıcı başvurularını listeler, isteğe bağlı olarak duruma göre filtreler',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    description: 'Başvuru durumu filtresi',
  })
  @ApiResponse({
    status: 200,
    description: 'Başvuru listesi',
  })
  async findAll(@Query('status') status?: string) {
    // Using legacy service for backward compatibility
    return this.service.findAll(
      status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
    );
  }

  @Permissions(Permission.PANEL_USER_APPLICATION_VIEW)
  @Get(':id')
  @ApiOperation({
    summary: 'Başvuru detayını getir',
    description: 'ID ile başvuru detayını getirir',
  })
  @ApiParam({
    name: 'id',
    description: 'Başvuru ID',
    example: 'application-id-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Başvuru detayı',
  })
  @ApiResponse({ status: 404, description: 'Başvuru bulunamadı' })
  async findById(@Param('id') id: string) {
    const application = await this.service.findById(id);
    if (!application) {
      throw new NotFoundException('Başvuru bulunamadı');
    }
    return application;
  }

  @Permissions(Permission.PANEL_USER_APPLICATION_APPROVE)
  @Post(':id/approve')
  @ApiOperation({
    summary: 'Başvuruyu onayla ve User oluştur',
    description:
      'Başvuruyu onaylar, yeni bir User oluşturur ve Member ile ilişkilendirir',
  })
  @ApiParam({
    name: 'id',
    description: 'Başvuru ID',
    example: 'application-id-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Başvuru onaylandı ve User oluşturuldu',
  })
  @ApiResponse({ status: 404, description: 'Başvuru bulunamadı' })
  @ApiResponse({ status: 400, description: 'Başvuru zaten işleme alınmış' })
  @ApiResponse({ status: 409, description: 'Email adresi zaten kullanılıyor' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApprovePanelUserApplicationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.applicationService.approveApplication(
      id,
      {
        email: dto.email,
        password: dto.password,
        reviewNote: dto.reviewNote,
        scopes: dto.scopes,
      },
      user.userId,
    );
    // Onay zaten applicationService ile yapıldı; yanıtı Prisma formatında döndür (tekrar service.approve çağrılmaz, "zaten işleme alınmış" hatası önlenir)
    return this.service.findById(id);
  }

  @Permissions(Permission.PANEL_USER_APPLICATION_REJECT)
  @Post(':id/reject')
  @ApiOperation({
    summary: 'Başvuruyu reddet',
    description: 'Başvuruyu reddeder',
  })
  @ApiParam({
    name: 'id',
    description: 'Başvuru ID',
    example: 'application-id-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Başvuru reddedildi',
  })
  @ApiResponse({ status: 404, description: 'Başvuru bulunamadı' })
  @ApiResponse({ status: 400, description: 'Başvuru zaten işleme alınmış' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectPanelUserApplicationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.applicationService.rejectApplication(
      id,
      dto.reviewNote,
      user.userId,
    );
    // Reddetme zaten applicationService ile yapıldı; yanıtı Prisma formatında döndür
    return this.service.findById(id);
  }
}
