/**
 * User Repository Interface (Port)
 *
 * Defines the contract for User persistence operations.
 */
import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
  create(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}
