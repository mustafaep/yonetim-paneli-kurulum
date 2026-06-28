/**
 * Document Template Domain Entity
 */
import { DocumentTemplateType } from '@prisma/client';

export interface CreateDocumentTemplateData {
  name: string;
  description?: string;
  template: string;
  type: DocumentTemplateType;
  isActive?: boolean;
}

export interface UpdateDocumentTemplateData {
  name?: string;
  description?: string;
  template?: string;
  type?: DocumentTemplateType;
  isActive?: boolean;
}

export class DocumentTemplate {
  private _id: string;
  private _name: string;
  private _description?: string;
  private _template: string;
  private _type: DocumentTemplateType;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(
    data: CreateDocumentTemplateData,
    id: string = '',
  ): DocumentTemplate {
    const template = new DocumentTemplate();
    template._id = id;
    template._name = data.name.trim();
    template._description = data.description?.trim();
    template._template = data.template;
    template._type = data.type;
    template._isActive = data.isActive ?? true;
    template._createdAt = new Date();
    template._updatedAt = new Date();
    return template;
  }

  static fromPersistence(data: any): DocumentTemplate {
    const template = new DocumentTemplate();
    template._id = data.id;
    template._name = data.name;
    template._description = data.description;
    template._template = data.template;
    template._type = data.type;
    template._isActive = data.isActive ?? true;
    template._createdAt = new Date(data.createdAt);
    template._updatedAt = new Date(data.updatedAt);
    return template;
  }

  update(data: UpdateDocumentTemplateData): void {
    if (data.name !== undefined) {
      this._name = data.name.trim();
    }
    if (data.description !== undefined) {
      this._description = data.description?.trim();
    }
    if (data.template !== undefined) {
      this._template = data.template;
    }
    if (data.type !== undefined) {
      this._type = data.type;
    }
    if (data.isActive !== undefined) {
      this._isActive = data.isActive;
    }
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get template(): string {
    return this._template;
  }

  get type(): DocumentTemplateType {
    return this._type;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
