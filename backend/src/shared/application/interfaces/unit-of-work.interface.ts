/**
 * Unit of Work Interface (Port)
 *
 * Shared Application: Transaction management için interface
 *
 * Unit of Work pattern: Bir işlem içinde yapılan tüm değişiklikleri
 * tek bir transaction'da commit etmek için kullanılır.
 */
export interface IUnitOfWork {
  /**
   * Transaction başlat
   */
  begin(): Promise<void>;

  /**
   * Değişiklikleri commit et
   */
  commit(): Promise<void>;

  /**
   * Değişiklikleri rollback et
   */
  rollback(): Promise<void>;

  /**
   * Transaction içinde mi kontrol et
   */
  isInTransaction(): boolean;
}
