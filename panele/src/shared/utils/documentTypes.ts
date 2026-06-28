// src/shared/utils/documentTypes.ts
// Doküman tipleri ve Türkçe karşılıkları

/** Yükleme formunda gösterilecek doküman türleri */
export const DOCUMENT_TYPES = [
  { value: 'UPLOADED', label: 'Yüklenen' },
  { value: 'MEMBER_REGISTRATION', label: 'Üye Kayıt Belgesi' },
  { value: 'IDENTITY', label: 'Kimlik Fotokopisi' },
  { value: 'CERTIFICATE', label: 'Sertifika' },
  { value: 'CONTRACT', label: 'Sözleşme' },
  { value: 'OTHER', label: 'Diğer' },
] as const;

/** Tüm doküman türleri için Türkçe etiket eşlemesi (tablo ve backend değerleri dahil) */
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  // Form tipleri
  UPLOADED: 'Yüklenen',
  MEMBER_REGISTRATION: 'Üye Kayıt Belgesi',
  IDENTITY: 'Kimlik Fotokopisi',
  CERTIFICATE: 'Sertifika',
  CONTRACT: 'Sözleşme',
  OTHER: 'Diğer',
  // Şablon / backend tipleri
  MEMBER_CERTIFICATE: 'Üye Sertifikası',
  MEMBER_CARD: 'Üye Kartı',
  LETTER: 'Yazı',
  RESIGNATION_LETTER: 'İstifa Yazısı',
  EXPULSION_LETTER: 'İhraç Yazısı',
  APPROVAL_CERTIFICATE: 'Onay Sertifikası',
  INVITATION_LETTER: 'Davet Mektubu',
  CONGRATULATION_LETTER: 'Tebrik Mektubu',
  WARNING_LETTER: 'Uyarı Yazısı',
  NOTIFICATION_LETTER: 'Bildirim Yazısı',
  MEMBERSHIP_APPLICATION: 'Üyelik Başvurusu',
  TRANSFER_CERTIFICATE: 'Nakil Belgesi',
  BULK_MEMBER_LIST: 'Toplu üye listesi',
  // Diğer kullanılan tipler
  PAYMENT_RECEIPT: 'Kesinti Makbuzu',
  ADVANCE_DOCUMENT: 'Avans Belgesi',
  DOCUMENT: 'Doküman',
};

// Doküman tipini Türkçeye çevir (bilinmeyen tipler için orijinal değer döner)
export const getDocumentTypeLabel = (type: string): string => {
  if (!type) return 'Yüklenen';
  return DOCUMENT_TYPE_LABELS[type] ?? type;
};
