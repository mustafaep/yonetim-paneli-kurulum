/**
 * Role Repository Interface (Port)
 *
 * Defines the contract for Role persistence operations.
 */
import { Role } from '../entities/role.entity';
import { RoleName } from '../value-objects/role-name.vo';

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  save(role: Role): Promise<void>;
  create(role: Role): Promise<Role>;
  delete(id: string): Promise<void>;
  countUsersByRoleId(roleId: string): Promise<number>;
}
