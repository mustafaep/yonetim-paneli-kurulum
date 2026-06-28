/**
 * TevkifatTitle Repository Interface (Port)
 */
import { TevkifatTitle } from '../entities/tevkifat-title.entity';

export interface TevkifatTitleRepository {
  findById(id: string): Promise<TevkifatTitle | null>;
  findByName(name: string): Promise<TevkifatTitle | null>;
  findAll(): Promise<TevkifatTitle[]>;
  save(title: TevkifatTitle): Promise<void>;
  create(title: TevkifatTitle): Promise<TevkifatTitle>;
  delete(id: string): Promise<void>;
}
