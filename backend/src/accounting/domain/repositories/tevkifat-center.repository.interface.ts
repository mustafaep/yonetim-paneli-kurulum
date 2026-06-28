/**
 * TevkifatCenter Repository Interface (Port)
 */
import { TevkifatCenter } from '../entities/tevkifat-center.entity';

export interface TevkifatCenterRepository {
  findById(id: string): Promise<TevkifatCenter | null>;
  findByName(name: string): Promise<TevkifatCenter | null>;
  findAll(filters?: {
    provinceId?: string;
    districtId?: string;
  }): Promise<TevkifatCenter[]>;
  save(center: TevkifatCenter): Promise<void>;
  create(center: TevkifatCenter): Promise<TevkifatCenter>;
  delete(id: string): Promise<void>;
}
