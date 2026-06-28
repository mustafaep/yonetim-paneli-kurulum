/**
 * Toplu üye kayıt limitleri ve önizleme sütun etiketleri.
 * Şablon GET /imports/members/template ile indirilir.
 */
export const MAX_FILE_SIZE_MB = 5;
export const MAX_ROWS = 2000;
export const PREVIEW_ROWS = 200;

/** Üye detay sayfasındaki alan etiketleriyle uyumlu önizleme sütun adları */
export const PREVIEW_COLUMN_LABELS: Record<string, string> = {
  firstName: 'Adı',
  lastName: 'Soyadı',
  registrationNumber: 'Üye Kayıt No',
  nationalId: 'TC Kimlik Numarası',
  phone: 'Telefon',
  email: 'E-posta',
  motherName: 'Anne Adı',
  fatherName: 'Baba Adı',
  birthDate: 'Doğum Tarihi',
  birthplace: 'Doğum Yeri',
  gender: 'Cinsiyet',
  educationStatus: 'Öğrenim Durumu',
  provinceId: 'İl (Kayıtlı Olduğu Yer)',
  districtId: 'İlçe (Kayıtlı Olduğu Yer)',
  institutionId: 'Kurum Adı',
  branchId: 'Şube',
  tevkifatCenterId: 'Tevkifat Kurumu',
  tevkifatTitleId: 'Tevkifat Ünvanı',
  memberGroupId: 'Üye Grubu',
  dutyUnit: 'Görev Birimi',
  institutionAddress: 'Kurum Adresi',
  institutionProvinceId: 'Kurum İli',
  institutionDistrictId: 'Kurum İlçesi',
  professionId: 'Meslek/Unvan',
  institutionRegNo: 'Kurum Sicil No',
  staffTitleCode: 'Kadro Unvan Kodu',
};
