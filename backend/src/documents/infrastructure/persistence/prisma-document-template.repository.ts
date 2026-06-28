/**
 * Prisma Document Template Repository Implementation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentTemplateRepository } from '../../domain/repositories/document.repository.interface';
import { DocumentTemplate } from '../../domain/entities/document-template.entity';

@Injectable()
export class PrismaDocumentTemplateRepository implements DocumentTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<DocumentTemplate | null> {
    const data = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    return data ? DocumentTemplate.fromPersistence(data) : null;
  }

  async findAll(includeInactive: boolean = false): Promise<DocumentTemplate[]> {
    const where = includeInactive ? {} : { isActive: true };
    const data = await this.prisma.documentTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return data.map((item) => DocumentTemplate.fromPersistence(item));
  }

  async save(template: DocumentTemplate): Promise<void> {
    await this.prisma.documentTemplate.update({
      where: { id: template.id },
      data: {
        name: template.name,
        description: template.description,
        template: template.template,
        type: template.type,
        isActive: template.isActive,
      },
    });
  }

  async create(template: DocumentTemplate): Promise<DocumentTemplate> {
    const createData: any = {
      name: template.name,
      description: template.description,
      template: template.template,
      type: template.type,
      isActive: template.isActive,
    };
    delete createData.id;

    const created = await this.prisma.documentTemplate.create({
      data: createData,
    });

    return DocumentTemplate.fromPersistence(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.documentTemplate.delete({
      where: { id },
    });
  }
}
