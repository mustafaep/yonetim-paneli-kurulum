import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './application/dto/create-content.dto';
import { UpdateContentDto } from './application/dto/update-content.dto';
import { ContentType, ContentStatus } from '@prisma/client';
import { ContentApplicationService } from './application/services/content-application.service';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private contentApplicationService: ContentApplicationService,
  ) {}

  async findAll(params?: { type?: ContentType; status?: ContentStatus }) {
    return this.prisma.content.findMany({
      where: {
        ...(params?.type && { type: params.type }),
        ...(params?.status && { status: params.status }),
      },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
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

    if (!content) {
      throw new NotFoundException('İçerik bulunamadı');
    }

    return content;
  }

  async create(dto: CreateContentDto, authorId: string) {
    const content = await this.contentApplicationService.createContent({
      dto,
      authorId,
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

  async update(id: string, dto: UpdateContentDto) {
    const content = await this.contentApplicationService.updateContent({
      contentId: id,
      dto,
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

  async remove(id: string) {
    await this.contentApplicationService.deleteContent({ contentId: id });
    return await this.prisma.content.findUnique({ where: { id } });
  }

  async publish(id: string) {
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
