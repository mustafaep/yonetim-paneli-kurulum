/**
 * Content Application Service
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Content } from '../../domain/entities/content.entity';
import type { ContentRepository } from '../../domain/repositories/content.repository.interface';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import {
  ContentNotFoundException,
  ContentAlreadyPublishedException,
} from '../../domain/exceptions/content-domain.exception';
import { ContentType, ContentStatus } from '@prisma/client';

export interface CreateContentCommand {
  dto: CreateContentDto;
  authorId: string;
}

export interface UpdateContentCommand {
  contentId: string;
  dto: UpdateContentDto;
}

export interface DeleteContentCommand {
  contentId: string;
}

export interface PublishContentCommand {
  contentId: string;
}

@Injectable()
export class ContentApplicationService {
  private readonly logger = new Logger(ContentApplicationService.name);

  constructor(
    @Inject('ContentRepository')
    private readonly contentRepository: ContentRepository,
  ) {}

  async createContent(command: CreateContentCommand): Promise<Content> {
    const { dto, authorId } = command;
    const content = Content.create(
      {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        status: dto.status,
        authorId,
      },
      '',
    );
    const created = await this.contentRepository.create(content);
    this.logger.log(`Content created: ${created.id} (${created.title})`);
    return created;
  }

  async updateContent(command: UpdateContentCommand): Promise<Content> {
    const { contentId, dto } = command;
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new ContentNotFoundException(contentId);
    }
    content.update(dto);
    await this.contentRepository.save(content);
    this.logger.log(`Content updated: ${content.id} (${content.title})`);
    return content;
  }

  async findAll(params?: {
    type?: ContentType;
    status?: ContentStatus;
  }): Promise<Content[]> {
    return await this.contentRepository.findAll(params);
  }

  async findById(id: string): Promise<Content> {
    const content = await this.contentRepository.findById(id);
    if (!content) {
      throw new ContentNotFoundException(id);
    }
    return content;
  }

  async deleteContent(command: DeleteContentCommand): Promise<void> {
    const { contentId } = command;
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new ContentNotFoundException(contentId);
    }
    await this.contentRepository.delete(contentId);
    this.logger.log(`Content deleted: ${content.id} (${content.title})`);
  }

  async publishContent(command: PublishContentCommand): Promise<Content> {
    const { contentId } = command;
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new ContentNotFoundException(contentId);
    }
    if (content.status === ContentStatus.PUBLISHED) {
      throw new ContentAlreadyPublishedException();
    }
    content.publish();
    await this.contentRepository.save(content);
    this.logger.log(`Content published: ${content.id} (${content.title})`);
    return content;
  }
}
