/**
 * Province Application Service
 *
 * Orchestrates province operations.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Province } from '../../domain/entities/province.entity';
import type { ProvinceRepository } from '../../domain/repositories/region.repository.interface';
import { CreateProvinceDto } from '../dto/create-province.dto';

export interface CreateProvinceCommand {
  dto: CreateProvinceDto;
}

export interface UpdateProvinceCommand {
  provinceId: string;
  dto: CreateProvinceDto;
}

@Injectable()
export class ProvinceApplicationService {
  private readonly logger = new Logger(ProvinceApplicationService.name);

  constructor(
    @Inject('ProvinceRepository')
    private readonly provinceRepository: ProvinceRepository,
  ) {}

  async createProvince(command: CreateProvinceCommand): Promise<Province> {
    const { dto } = command;
    const province = Province.create({ name: dto.name, code: dto.code }, '');
    const created = await this.provinceRepository.create(province);
    this.logger.log(`Province created: ${created.id} (${created.name})`);
    return created;
  }

  async updateProvince(command: UpdateProvinceCommand): Promise<Province> {
    const { provinceId, dto } = command;
    const province = await this.provinceRepository.findById(provinceId);
    if (!province) {
      throw new Error('Province not found');
    }
    province.update({ name: dto.name, code: dto.code });
    await this.provinceRepository.save(province);
    this.logger.log(`Province updated: ${province.id} (${province.name})`);
    return province;
  }

  async findAll(): Promise<Province[]> {
    return await this.provinceRepository.findAll();
  }

  async findById(id: string): Promise<Province> {
    const province = await this.provinceRepository.findById(id);
    if (!province) {
      throw new Error('Province not found');
    }
    return province;
  }
}
