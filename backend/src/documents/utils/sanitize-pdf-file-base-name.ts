const TURKISH_TO_ASCII: Record<string, string> = {
  ç: 'c',
  Ç: 'C',
  ğ: 'g',
  Ğ: 'G',
  ı: 'i',
  İ: 'I',
  ö: 'o',
  Ö: 'O',
  ş: 's',
  Ş: 'S',
  ü: 'u',
  Ü: 'U',
};

/**
 * PDF kayıt dosya adı tabanı: Türkçe harfleri ASCII karşılıklarına çevirir,
 * boşlukları alt çizgi yapar, dosya sistemi için geçersiz karakterleri alt çizgiye indirger.
 */
export function sanitizePdfFileBaseName(raw: string, maxLength = 120): string {
  const withoutExt = raw.replace(/\.pdf$/i, '');
  let s = '';
  for (const ch of withoutExt) {
    s += TURKISH_TO_ASCII[ch] ?? ch;
  }
  s = s.replace(/\s+/g, '_');
  s = s.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
  s = s.replace(/_+/g, '_');
  s = s.replace(/^_+|_+$/g, '');
  return s.slice(0, maxLength);
}
