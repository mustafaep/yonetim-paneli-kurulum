/**
 * Prisma Content Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ContentRepository } from '../../domain/repositories/content.repository.interface';
import { Content } from '../../domain/entities/content.entity';
import { ContentType, ContentStatus } from '@prisma/client';

@Injectable()
export class PrismaContentRepository implements ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Content | null> {
    const data = await this.prisma.content.findUnique({
      where: { id },
    });
    return data ? Content.fromPersistence(data) : null;
  }

  async findAll(params?: {
    type?: ContentType;
    status?: ContentStatus;
  }): Promise<Content[]> {
    const where: any = {};
    if (params?.type) where.type = params.type;
    if (params?.status) where.status = params.status;

    const data = await this.prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return data.map((item) => Content.fromPersistence(item));
  }

  async save(content: Content): Promise<void> {
    await this.prisma.content.update({
      where: { id: content.id },
      data: {
        title: content.title,
        content: content.content,
        type: content.type,
        status: content.status,
        publishedAt: content.publishedAt,
      },
    });
  }

  async create(content: Content): Promise<Content> {
    const createData: any = {
      title: content.title,
      content: content.content,
      type: content.type,
      status: content.status,
      authorId: content.authorId,
    };
    delete createData.id;

    const created = await this.prisma.content.create({
      data: createData,
    });

    return Content.fromPersistence(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.content.delete({
      where: { id },
    });
  }
}
