/**
 * Repository Interface (Port)
 *
 * Shared Application: Tüm repository'ler için base interface
 *
 * Generic repository pattern için base interface.
 * Her domain kendi repository interface'ini buradan extend edebilir.
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}
