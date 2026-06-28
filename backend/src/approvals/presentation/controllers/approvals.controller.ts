/**
 * Approvals Controller (Presentation Layer)
 */
import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApprovalApplicationService } from '../../application/services/approval-application.service';
import { ApprovalsService } from '../../approvals.service'; // Legacy service
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';

@ApiTags('Approvals')
@ApiBearerAuth('JWT-auth')
@Controller('approvals')
export class ApprovalsController {
  constructor(
    private readonly approvalsService: ApprovalsService, // Legacy service
    private readonly approvalApplicationService: ApprovalApplicationService,
  ) {}

  @Permissions(Permission.APPROVAL_VIEW)
  @Get('pending')
  @ApiOperation({ summary: 'Bekleyen onayları listele' })
  @ApiResponse({ status: 200, description: 'Bekleyen onay listesi' })
  async findPending(@CurrentUser() user: CurrentUserData) {
    // Using legacy service for backward compatibility
    return this.approvalsService.findPending();
  }

  @Permissions(Permission.APPROVAL_VIEW)
  @Get('my-requests')
  @ApiOperation({ summary: 'Kullanıcının onay isteklerini listele' })
  @ApiResponse({ status: 200, description: 'Onay istekleri listesi' })
  async findByUser(@CurrentUser() user: CurrentUserData) {
    // Using legacy service for backward compatibility
    return this.approvalsService.findByUser(user.userId);
  }

  @Permissions(Permission.APPROVAL_APPROVE)
  @Post(':id/approve')
  @ApiOperation({ summary: 'Onay isteğini onayla' })
  @ApiResponse({ status: 200, description: 'Onay isteği onaylandı' })
  async approve(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.approvalApplicationService.approve(id, user.userId, body.note);
    // Return Prisma format for backward compatibility
    return this.approvalsService.approve(id, user.userId, body.note);
  }

  @Permissions(Permission.APPROVAL_REJECT)
  @Post(':id/reject')
  @ApiOperation({ summary: 'Onay isteğini reddet' })
  @ApiResponse({ status: 200, description: 'Onay isteği reddedildi' })
  async reject(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.approvalApplicationService.reject(id, user.userId, body.note);
    // Return Prisma format for backward compatibility
    return this.approvalsService.reject(id, user.userId, body.note);
  }
}
