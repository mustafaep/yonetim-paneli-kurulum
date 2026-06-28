import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { MemberGroupsService } from '../../member-groups.service';
import { CreateMemberGroupDto } from '../../application/dto/create-member-group.dto';
import { UpdateMemberGroupDto } from '../../application/dto/update-member-group.dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { MemberGroupApplicationService } from '../../application/services/member-group-application.service';
import { MemberGroupExceptionFilter } from '../filters/member-group-exception.filter';
import { MemberGroupValidationPipe } from '../pipes/member-group-validation.pipe';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Member Groups')
@ApiBearerAuth('JWT-auth')
@Controller('member-groups')
@UseFilters(MemberGroupExceptionFilter)
export class MemberGroupsController {
  constructor(
    private readonly memberGroupsService: MemberGroupsService,
    private readonly memberGroupApplicationService: MemberGroupApplicationService,
    private readonly prisma: PrismaService,
  ) {}

  @Permissions(
    Permission.MEMBER_CREATE_APPLICATION,
    Permission.MEMBER_UPDATE,
    Permission.SYSTEM_SETTINGS_VIEW,
  )
  @Get()
  @ApiOperation({
    summary: 'Üye grubu listesini getir',
    description: 'Aktif üye gruplarını listeler',
  })
  @ApiResponse({ status: 200, description: 'Üye grubu listesi' })
  async listMemberGroups() {
    return this.memberGroupsService.listMemberGroups();
  }

  @Permissions(Permission.SYSTEM_SETTINGS_VIEW)
  @Get('all')
  @ApiOperation({
    summary: 'Tüm üye gruplarını listele',
    description: 'Aktif ve pasif tüm üye gruplarını listeler',
  })
  @ApiResponse({ status: 200, description: 'Tüm üye grubu listesi' })
  async listAllMemberGroups() {
    return this.memberGroupsService.listAllMemberGroups();
  }

  @Permissions(Permission.SYSTEM_SETTINGS_VIEW)
  @Get(':id')
  @ApiOperation({ summary: 'Üye grubu detayını getir' })
  @ApiParam({ name: 'id', description: 'Üye grubu ID' })
  @ApiResponse({ status: 200, description: 'Üye grubu detayı' })
  @ApiResponse({ status: 404, description: 'Üye grubu bulunamadı' })
  async getMemberGroupById(@Param('id') id: string) {
    return this.memberGroupsService.getMemberGroupById(id);
  }

  @Permissions(Permission.SYSTEM_SETTINGS_MANAGE)
  @Post()
  @UsePipes(MemberGroupValidationPipe)
  @ApiOperation({ summary: 'Üye grubu oluştur' })
  @ApiBody({ type: CreateMemberGroupDto })
  @ApiResponse({ status: 201, description: 'Üye grubu oluşturuldu' })
  async createMemberGroup(@Body() dto: CreateMemberGroupDto) {
    const memberGroup =
      await this.memberGroupApplicationService.createMemberGroup({ dto });
    return await this.prisma.memberGroup.findUnique({
      where: { id: memberGroup.id },
    });
  }

  @Permissions(Permission.SYSTEM_SETTINGS_MANAGE)
  @Patch(':id')
  @UsePipes(MemberGroupValidationPipe)
  @ApiOperation({ summary: 'Üye grubu güncelle' })
  @ApiParam({ name: 'id', description: 'Üye grubu ID' })
  @ApiBody({ type: UpdateMemberGroupDto })
  @ApiResponse({ status: 200, description: 'Üye grubu güncellendi' })
  @ApiResponse({ status: 404, description: 'Üye grubu bulunamadı' })
  async updateMemberGroup(
    @Param('id') id: string,
    @Body() dto: UpdateMemberGroupDto,
  ) {
    const memberGroup =
      await this.memberGroupApplicationService.updateMemberGroup({
        memberGroupId: id,
        dto,
      });
    return await this.prisma.memberGroup.findUnique({
      where: { id: memberGroup.id },
    });
  }

  @Permissions(Permission.SYSTEM_SETTINGS_MANAGE)
  @Delete(':id')
  @ApiOperation({
    summary: 'Üye grubu sil',
    description: 'Kullanımda ise pasif yapar, değilse kalıcı olarak siler',
  })
  @ApiParam({ name: 'id', description: 'Üye grubu ID' })
  @ApiResponse({
    status: 200,
    description: 'Üye grubu silindi veya pasif yapıldı',
  })
  @ApiResponse({ status: 404, description: 'Üye grubu bulunamadı' })
  async deleteMemberGroup(@Param('id') id: string) {
    await this.memberGroupApplicationService.deleteMemberGroup({
      memberGroupId: id,
    });
    return { message: 'Üye grubu başarıyla silindi veya pasif yapıldı' };
  }

  @Permissions(Permission.SYSTEM_SETTINGS_MANAGE)
  @Post(':id/move')
  @ApiOperation({
    summary: 'Üye grubu sırasını değiştir',
    description: 'Yukarı veya aşağı taşıma',
  })
  @ApiParam({ name: 'id', description: 'Üye grubu ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { direction: { type: 'string', enum: ['up', 'down'] } },
    },
  })
  @ApiResponse({ status: 200, description: 'Sıra güncellendi' })
  @ApiResponse({ status: 404, description: 'Üye grubu bulunamadı' })
  async moveMemberGroup(
    @Param('id') id: string,
    @Body() body: { direction: 'up' | 'down' },
  ) {
    const memberGroup =
      await this.memberGroupApplicationService.moveMemberGroup({
        memberGroupId: id,
        direction: body.direction,
      });
    return await this.prisma.memberGroup.findUnique({
      where: { id: memberGroup.id },
    });
  }
}
