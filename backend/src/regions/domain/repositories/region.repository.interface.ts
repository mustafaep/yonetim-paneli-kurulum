/**
 * Region Repository Interface (Port)
 *
 * Defines the contract for Region persistence operations.
 */
import { Province } from '../entities/province.entity';
import { District } from '../entities/district.entity';

export interface ProvinceRepository {
  findById(id: string): Promise<Province | null>;
  findAll(): Promise<Province[]>;
  save(province: Province): Promise<void>;
  create(province: Province): Promise<Province>;
}

export interface DistrictRepository {
  findById(id: string): Promise<District | null>;
  findByProvinceId(provinceId: string): Promise<District[]>;
  findAll(): Promise<District[]>;
  save(district: District): Promise<void>;
  create(district: District): Promise<District>;
}
