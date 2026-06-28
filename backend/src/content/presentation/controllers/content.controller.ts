import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContentService } from '../../content.service';
import { CreateContentDto } from '../../application/dto/create-content.dto';
import { UpdateContentDto } from '../../application/dto/update-content.dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../auth/permission.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../../auth/decorators/current-user.decorator';
import { ContentType, ContentStatus } from '@prisma/client';
import { ContentApplicationService } from '../../application/services/content-application.service';
import { ContentExceptionFilter } from '../filters/content-exception.filter';
import { ContentValidationPipe } from '../pipes/content-validation.pipe';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Content')
@ApiBearerAuth('JWT-auth')
@Controller('content')
@UseFilters(ContentExceptionFilter)
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly contentApplicationService: ContentApplicationService,
    private readonly prisma: PrismaService,
  ) {}

  @Permissions(Permission.CONTENT_MANAGE)
  @Get()
  @ApiOperation({ summary: 'İçerikleri listele' })
  @ApiResponse({ status: 200 })
  async findAll(
    @Query('type') type?: ContentType,
    @Query('status') status?: ContentStatus,
  ) {
    return this.contentService.findAll({ type, status });
  }

  @Permissions(Permission.CONTENT_MANAGE)
  @Get(':id')
  @ApiOperation({ summary: 'İçerik detayı' })
  @ApiResponse({ status: 200 })
  async findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @Permissions(Permission.CONTENT_MANAGE)
  @Post()
  @UsePipes(ContentValidationPipe)
  @ApiOperation({ summary: 'Yeni içerik oluştur' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() createContentDto: CreateContentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const content = await this.contentApplicationService.createContent({
      dto: createContentDto,
      authorId: user.userId,
    });
    return await this.prisma.content.findUnique({
      where: { id: content.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  @Permissions(Permission.CONTENT_MANAGE)
  @Patch(':id')
  @UsePipes(ContentValidationPipe)
  @ApiOperation({ summary: 'İçerik güncelle' })
  @ApiResponse({ status: 200 })
  async update(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    const content = await this.contentApplicationService.updateContent({
      contentId: id,
      dto: updateContentDto,
    });
    return await this.prisma.content.findUnique({
      where: { id: content.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  @Permissions(Permission.CONTENT_MANAGE)
  @Delete(':id')
  @ApiOperation({ summary: 'İçerik sil' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    await this.contentApplicationService.deleteContent({ contentId: id });
    return { message: 'İçerik başarıyla silindi' };
  }

  @Permissions(Permission.CONTENT_PUBLISH)
  @Post(':id/publish')
  @ApiOperation({ summary: 'İçeriği yayınla' })
  @ApiResponse({ status: 200 })
  async publish(@Param('id') id: string) {
    const content = await this.contentApplicationService.publishContent({
      contentId: id,
    });
    return await this.prisma.content.findUnique({
      where: { id: content.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }
}
