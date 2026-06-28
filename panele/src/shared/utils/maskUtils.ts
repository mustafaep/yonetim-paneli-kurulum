/**
 * Hassas verilerin UI'da maskelemesi için yardımcı fonksiyonlar.
 * Örn: iptal edilmiş üye bilgisi pop-up'ında Ad Soyad ve TC Kimlik No gösterimi.
 */

const MASK_PLACEHOLDER = '***';

/**
 * Ad Soyad'ı "M*** K***" formatında maskeler.
 * Her kelimenin sadece ilk harfi gösterilir, geri kalanı *** ile değiştirilir.
 */
export function maskFullName(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (!first && !last) return MASK_PLACEHOLDER;
  const parts: string[] = [];
  if (first) parts.push(first.charAt(0).toUpperCase() + MASK_PLACEHOLDER);
  if (last) parts.push(last.charAt(0).toUpperCase() + MASK_PLACEHOLDER);
  return parts.join(' ');
}

/**
 * TC Kimlik No'yu tamamen maskeler (***).
 */
export function maskNationalId(nationalId?: string | null): string {
  if (nationalId == null || String(nationalId).trim() === '') return '-';
  return MASK_PLACEHOLDER;
}
