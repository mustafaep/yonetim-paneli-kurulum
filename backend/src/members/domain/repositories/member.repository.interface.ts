/**
 * Member Repository Interface (Port)
 *
 * Domain katmanı için repository interface'i.
 * Infrastructure katmanı bu interface'i implement edecek.
 */
import { Member } from '../entities/member.entity';
import { NationalId } from '../value-objects/national-id.vo';

export interface MemberRepository {
  /**
   * ID ile member bul
   */
  findById(id: string): Promise<Member | null>;

  /**
   * Member'ı kaydet (create veya update)
   */
  save(member: Member): Promise<void>;

  /**
   * TC ile yeni başvuruyu engelleyen üye var mı (PENDING, APPROVED, ACTIVE, REJECTED).
   * İstifa/ihraç/pasif (RESIGNED, EXPELLED, INACTIVE) kayıtları engellemez; yeniden kayıt için yeni satır açılabilir.
   */
  findBlockingMembershipByNationalId(
    nationalId: NationalId,
  ): Promise<Member | null>;

  /**
   * TC Kimlik numarasına göre iptal edilmiş üye bul
   */
  findCancelledByNationalId(nationalId: NationalId): Promise<Member | null>;

  /**
   * Tüm kayıt numaralarını getir (registration number generation için)
   */
  findAllRegistrationNumbers(): Promise<string[]>;

  /**
   * Yeni member oluştur
   */
  create(member: Member): Promise<Member>;
}
