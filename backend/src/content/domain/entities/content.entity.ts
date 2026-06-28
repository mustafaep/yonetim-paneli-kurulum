/**
 * Content Domain Entity
 */
import { ContentType, ContentStatus } from '@prisma/client';

export interface CreateContentData {
  title: string;
  content: string;
  type: ContentType;
  status?: ContentStatus;
  authorId: string;
}

export interface UpdateContentData {
  title?: string;
  content?: string;
  type?: ContentType;
  status?: ContentStatus;
}

export class Content {
  private _id: string;
  private _title: string;
  private _content: string;
  private _type: ContentType;
  private _status: ContentStatus;
  private _authorId: string;
  private _publishedAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {}

  static create(data: CreateContentData, id: string = ''): Content {
    const content = new Content();
    content._id = id;
    content._title = data.title.trim();
    content._content = data.content.trim();
    content._type = data.type;
    content._status = data.status || ContentStatus.DRAFT;
    content._authorId = data.authorId;
    content._createdAt = new Date();
    content._updatedAt = new Date();
    return content;
  }

  static fromPersistence(data: any): Content {
    const content = new Content();
    content._id = data.id;
    content._title = data.title;
    content._content = data.content;
    content._type = data.type;
    content._status = data.status;
    content._authorId = data.authorId;
    content._publishedAt = data.publishedAt
      ? new Date(data.publishedAt)
      : undefined;
    content._createdAt = new Date(data.createdAt);
    content._updatedAt = new Date(data.updatedAt);
    return content;
  }

  update(data: UpdateContentData): void {
    if (data.title !== undefined) {
      this._title = data.title.trim();
    }
    if (data.content !== undefined) {
      this._content = data.content.trim();
    }
    if (data.type !== undefined) {
      this._type = data.type;
    }
    if (data.status !== undefined) {
      this._status = data.status;
    }
    this._updatedAt = new Date();
  }

  publish(): void {
    if (this._status === ContentStatus.PUBLISHED) {
      throw new Error('Content is already published');
    }
    this._status = ContentStatus.PUBLISHED;
    this._publishedAt = new Date();
    this._updatedAt = new Date();
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get content(): string {
    return this._content;
  }

  get type(): ContentType {
    return this._type;
  }

  get status(): ContentStatus {
    return this._status;
  }

  get authorId(): string {
    return this._authorId;
  }

  get publishedAt(): Date | undefined {
    return this._publishedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
