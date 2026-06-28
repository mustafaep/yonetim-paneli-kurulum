/**
 * Toplu üye import şablonu: CSV kolon başlıkları ve açıklamaları.
 * Hem Türkçe hem İngilizce key kabul edilir.
 */
export const MEMBER_IMPORT_CSV_HEADERS = [
  'firstName',
  'lastName',
  'registrationNumber',
  'nationalId',
  'phone',
  'email',
  'motherName',
  'fatherName',
  'birthDate',
  'birthplace',
  'gender',
  'educationStatus',
  'provinceId',
  'districtId',
  'institutionId',
  'branchId',
  'tevkifatCenterId',
  'tevkifatTitleId',
  'memberGroupId',
  'dutyUnit',
  'institutionAddress',
  'institutionProvinceId',
  'institutionDistrictId',
  'professionId',
  'institutionRegNo',
  'staffTitleCode',
] as const;

/** CSV'de kullanılabilecek Türkçe başlık -> API key eşlemesi */
export const MEMBER_IMPORT_HEADER_ALIASES: Record<string, string> = {
  Ad: 'firstName',
  Soyad: 'lastName',
  'Üye Kayıt No': 'registrationNumber',
  'Üye Kayıt Numarası': 'registrationNumber',
  'Kayit No': 'registrationNumber',
  'Kayıt No': 'registrationNumber',
  registrationNumber: 'registrationNumber',
  'TC Kimlik No': 'nationalId',
  TC: 'nationalId',
  Telefon: 'phone',
  'E-posta': 'email',
  Email: 'email',
  'Anne Adı': 'motherName',
  'Baba Adı': 'fatherName',
  'Doğum Tarihi': 'birthDate',
  'Doğum Yeri': 'birthplace',
  Cinsiyet: 'gender',
  'Öğrenim Durumu': 'educationStatus',
  İl: 'provinceId',
  İlçe: 'districtId',
  Kurum: 'institutionId',
  Şube: 'branchId',
  'Tevkifat Merkezi': 'tevkifatCenterId',
  'Tevkifat Ünvanı': 'tevkifatTitleId',
  'Üye Grubu': 'memberGroupId',
  'Görev Birimi': 'dutyUnit',
  'Kurum Adresi': 'institutionAddress',
  'Kurum İli': 'institutionProvinceId',
  'Kurum İlçesi': 'institutionDistrictId',
  Meslek: 'professionId',
  'Kurum Sicil No': 'institutionRegNo',
  'Kadro Unvan Kodu': 'staffTitleCode',
};

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMPORT_ROWS = 2000;
export const PREVIEW_ROWS = 200;
