/**
 * Document Template Application Service
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { DocumentTemplate } from '../../domain/entities/document-template.entity';
import type { DocumentTemplateRepository } from '../../domain/repositories/document.repository.interface';
import { CreateDocumentTemplateDto } from '../dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from '../dto/update-document-template.dto';
import { DocumentTemplateNotFoundException } from '../../domain/exceptions/document-domain.exception';

export interface CreateDocumentTemplateCommand {
  dto: CreateDocumentTemplateDto;
}

export interface UpdateDocumentTemplateCommand {
  templateId: string;
  dto: UpdateDocumentTemplateDto;
}

export interface DeleteDocumentTemplateCommand {
  templateId: string;
}

@Injectable()
export class DocumentTemplateApplicationService {
  private readonly logger = new Logger(DocumentTemplateApplicationService.name);

  constructor(
    @Inject('DocumentTemplateRepository')
    private readonly templateRepository: DocumentTemplateRepository,
  ) {}

  async createTemplate(
    command: CreateDocumentTemplateCommand,
  ): Promise<DocumentTemplate> {
    const { dto } = command;
    const template = DocumentTemplate.create(
      {
        name: dto.name,
        description: dto.description,
        template: dto.template,
        type: dto.type,
        isActive: dto.isActive,
      },
      '',
    );
    const created = await this.templateRepository.create(template);
    this.logger.log(
      `Document template created: ${created.id} (${created.name})`,
    );
    return created;
  }

  async updateTemplate(
    command: UpdateDocumentTemplateCommand,
  ): Promise<DocumentTemplate> {
    const { templateId, dto } = command;
    const template = await this.templateRepository.findById(templateId);
    if (!template) {
      throw new DocumentTemplateNotFoundException(templateId);
    }
    template.update(dto);
    await this.templateRepository.save(template);
    this.logger.log(
      `Document template updated: ${template.id} (${template.name})`,
    );
    return template;
  }

  async findAll(includeInactive: boolean = false): Promise<DocumentTemplate[]> {
    return await this.templateRepository.findAll(includeInactive);
  }

  async findById(id: string): Promise<DocumentTemplate> {
    const template = await this.templateRepository.findById(id);
    if (!template) {
      throw new DocumentTemplateNotFoundException(id);
    }
    return template;
  }

  async deleteTemplate(command: DeleteDocumentTemplateCommand): Promise<void> {
    const { templateId } = command;
    const template = await this.templateRepository.findById(templateId);
    if (!template) {
      throw new DocumentTemplateNotFoundException(templateId);
    }
    template.deactivate();
    await this.templateRepository.save(template);
    this.logger.log(
      `Document template deleted: ${template.id} (${template.name})`,
    );
  }
}
