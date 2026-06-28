/**
 * TevkifatTitle Application Service
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { TevkifatTitleRepository } from '../../domain/repositories/tevkifat-title.repository.interface';
import { TevkifatTitle } from '../../domain/entities/tevkifat-title.entity';

@Injectable()
export class TevkifatTitleApplicationService {
  constructor(
    @Inject('TevkifatTitleRepository')
    private readonly repository: TevkifatTitleRepository,
  ) {}

  async createTitle(data: { name: string }): Promise<TevkifatTitle> {
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new ConflictException('Bu unvan zaten mevcut');
    }

    const title = TevkifatTitle.create(data);
    return await this.repository.create(title);
  }

  async updateTitle(
    id: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<TevkifatTitle> {
    const title = await this.repository.findById(id);
    if (!title) {
      throw new NotFoundException('Tevkifat unvanı bulunamadı');
    }

    if (data.name && data.name !== title.name) {
      const existing = await this.repository.findByName(data.name);
      if (existing) {
        throw new ConflictException('Bu unvan zaten mevcut');
      }
    }

    title.update(data);
    await this.repository.save(title);
    return title;
  }

  async deleteTitle(id: string): Promise<void> {
    const title = await this.repository.findById(id);
    if (!title) {
      throw new NotFoundException('Tevkifat unvanı bulunamadı');
    }

    await this.repository.delete(id);
  }

  async getTitleById(id: string): Promise<TevkifatTitle> {
    const title = await this.repository.findById(id);
    if (!title) {
      throw new NotFoundException('Tevkifat unvanı bulunamadı');
    }
    return title;
  }

  async listTitles(): Promise<TevkifatTitle[]> {
    return await this.repository.findAll();
  }
}
