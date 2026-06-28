/**
 * District Application Service
 *
 * Orchestrates district operations.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { District } from '../../domain/entities/district.entity';
import type { DistrictRepository } from '../../domain/repositories/region.repository.interface';
import { CreateDistrictDto } from '../dto/create-district.dto';

export interface CreateDistrictCommand {
  dto: CreateDistrictDto;
}

export interface UpdateDistrictCommand {
  districtId: string;
  dto: CreateDistrictDto;
}

@Injectable()
export class DistrictApplicationService {
  private readonly logger = new Logger(DistrictApplicationService.name);

  constructor(
    @Inject('DistrictRepository')
    private readonly districtRepository: DistrictRepository,
  ) {}

  async createDistrict(command: CreateDistrictCommand): Promise<District> {
    const { dto } = command;
    const district = District.create(
      { name: dto.name, provinceId: dto.provinceId },
      '',
    );
    const created = await this.districtRepository.create(district);
    this.logger.log(`District created: ${created.id} (${created.name})`);
    return created;
  }

  async updateDistrict(command: UpdateDistrictCommand): Promise<District> {
    const { districtId, dto } = command;
    const district = await this.districtRepository.findById(districtId);
    if (!district) {
      throw new Error('District not found');
    }
    district.update({ name: dto.name, provinceId: dto.provinceId });
    await this.districtRepository.save(district);
    this.logger.log(`District updated: ${district.id} (${district.name})`);
    return district;
  }

  async findAll(provinceId?: string): Promise<District[]> {
    if (provinceId) {
      return await this.districtRepository.findByProvinceId(provinceId);
    }
    return await this.districtRepository.findAll();
  }

  async findById(id: string): Promise<District> {
    const district = await this.districtRepository.findById(id);
    if (!district) {
      throw new Error('District not found');
    }
    return district;
  }
}
