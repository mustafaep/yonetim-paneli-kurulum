/**
 * Profession Repository Interface (Port)
 */
import { Profession } from '../entities/profession.entity';

export interface ProfessionRepository {
  findById(id: string): Promise<Profession | null>;
  findByName(name: string): Promise<Profession | null>;
  findAll(includeInactive?: boolean): Promise<Profession[]>;
  save(profession: Profession): Promise<void>;
  create(profession: Profession): Promise<Profession>;
  delete(id: string): Promise<void>;
  countMembersByProfessionId(professionId: string): Promise<number>;
}
