// src/types/role.ts

export type Permission =
  | 'USER_LIST'
  | 'USER_VIEW'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_SOFT_DELETE'
  | 'USER_ASSIGN_ROLE'
  | 'ROLE_LIST'
  | 'ROLE_VIEW'
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'ROLE_DELETE'
  | 'ROLE_MANAGE_PERMISSIONS'
  | 'MEMBER_LIST'
  | 'MEMBER_VIEW'
  | 'MEMBER_CREATE_APPLICATION'
  | 'MEMBER_APPLICATIONS_VIEW'
  | 'MEMBER_APPROVE'
  | 'MEMBER_REJECT'
  | 'MEMBER_UPDATE'
  | 'MEMBER_STATUS_CHANGE'
  | 'MEMBER_HISTORY_VIEW'
  | 'MEMBER_LIST_BY_PROVINCE'
  | 'REGION_LIST'
  | 'BRANCH_MANAGE'
  | 'BRANCH_ASSIGN_PRESIDENT'
  | 'CONTENT_MANAGE'
  | 'CONTENT_PUBLISH'
  | 'DOCUMENT_SYSTEM_ACCESS'
  | 'DOCUMENT_TEMPLATE_MANAGE'
  | 'DOCUMENT_MEMBER_HISTORY_VIEW'
  | 'DOCUMENT_GENERATE_PDF'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_DOWNLOAD'
  | 'REPORT_GLOBAL_VIEW'
  | 'REPORT_REGION_VIEW'
  | 'REPORT_MEMBER_STATUS_VIEW'
  | 'REPORT_DUES_VIEW'
  | 'WHATSAPP_ACCESS'
  | 'WHATSAPP_CHAT_VIEW'
  | 'WHATSAPP_CHAT_SEND'
  | 'WHATSAPP_CHAT_MANAGE'
  | 'WHATSAPP_BULK_SEND'
  | 'WHATSAPP_TEMPLATE_VIEW'
  | 'WHATSAPP_TEMPLATE_MANAGE'
  | 'WHATSAPP_INSTANCE_MANAGE'
  | 'NOTIFY_ALL_MEMBERS'
  | 'NOTIFY_REGION'
  | 'NOTIFY_OWN_SCOPE'
  | 'SYSTEM_SETTINGS_VIEW'
  | 'SYSTEM_SETTINGS_MANAGE'
  | 'LOG_VIEW_ALL'
  | 'LOG_VIEW_OWN_SCOPE'
  | 'INSTITUTION_LIST'
  | 'INSTITUTION_VIEW'
  | 'INSTITUTION_CREATE'
  | 'INSTITUTION_UPDATE'
  | 'INSTITUTION_APPROVE'
  | 'PROFESSION_VIEW'
  | 'PROFESSION_CREATE'
  | 'PROFESSION_UPDATE'
  | 'PROFESSION_DELETE'
  | 'TEVKIFAT_VIEW'
  | 'TEVKIFAT_EXPORT'
  | 'TEVKIFAT_TITLE_VIEW'
  | 'TEVKIFAT_TITLE_CREATE'
  | 'TEVKIFAT_TITLE_UPDATE'
  | 'TEVKIFAT_TITLE_DELETE'
  | 'TEVKIFAT_CENTER_VIEW'
  | 'TEVKIFAT_CENTER_CREATE'
  | 'TEVKIFAT_CENTER_UPDATE'
  | 'TEVKIFAT_CENTER_DELETE'
  | 'TEVKIFAT_FILE_UPLOAD'
  | 'TEVKIFAT_FILE_APPROVE'
  | 'MEMBER_PAYMENT_ADD'
  | 'MEMBER_PAYMENT_APPROVE'
  | 'MEMBER_PAYMENT_LIST'
  | 'MEMBER_PAYMENT_VIEW'
  | 'APPROVAL_VIEW'
  | 'APPROVAL_APPROVE'
  | 'APPROVAL_REJECT'
  | 'PANEL_USER_APPLICATION_CREATE'
  | 'PANEL_USER_APPLICATION_LIST'
  | 'PANEL_USER_APPLICATION_VIEW'
  | 'PANEL_USER_APPLICATION_APPROVE'
  | 'PANEL_USER_APPLICATION_REJECT'
  | 'ADVANCE_VIEW'
  | 'ADVANCE_CREATE'
  | 'ADVANCE_UPDATE'
  | 'ADVANCE_DELETE'
  | 'ADVANCE_DOCUMENT'
  | 'ADVANCE_ADD'
  | 'INVOICE_VIEW'
  | 'INVOICE_CREATE'
  | 'INVOICE_UPDATE'
  | 'INVOICE_DELETE';

export interface RoleScope {
  id?: string;
  provinceId?: string;
  province?: {
    id: string;
    name: string;
    code?: string;
  };
  districtId?: string;
  district?: {
    id: string;
    name: string;
    provinceId: string;
  };
}

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  permissions: Permission[];
  hasScopeRestriction: boolean;
  scopes?: RoleScope[];
  // Geriye uyumluluk için (eski API'den gelen veriler için)
  provinceId?: string;
  province?: {
    id: string;
    name: string;
    code?: string;
  };
  districtId?: string;
  district?: {
    id: string;
    name: string;
    provinceId: string;
  };
  createdAt: string;
  updatedAt: string;
  users?: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }>;
}

export interface SystemRole {
  name: string;
  permissions: Permission[];
  isSystemRole: true;
}

export type RoleListItem = CustomRole | SystemRole;

export interface RoleScopeDto {
  provinceId?: string;
  districtId?: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions: Permission[];
  hasScopeRestriction?: boolean;
  scopes?: RoleScopeDto[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  hasScopeRestriction?: boolean;
  scopes?: RoleScopeDto[];
}

export interface UpdateRolePermissionsDto {
  permissions: Permission[];
}

// İzin grupları (UI'da kategorize etmek için)
export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: [
    'USER_LIST',
    'USER_VIEW',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_SOFT_DELETE',
    'USER_ASSIGN_ROLE',
  ] as Permission[],
  ROLE_MANAGEMENT: [
    'ROLE_LIST',
    'ROLE_VIEW',
    'ROLE_CREATE',
    'ROLE_UPDATE',
    'ROLE_DELETE',
    'ROLE_MANAGE_PERMISSIONS',
  ] as Permission[],
  MEMBER_MANAGEMENT: [
    'MEMBER_LIST',
    'MEMBER_VIEW',
    'MEMBER_CREATE_APPLICATION',
    'MEMBER_APPROVE',
    'MEMBER_REJECT',
    'MEMBER_UPDATE',
    'MEMBER_STATUS_CHANGE',
    'MEMBER_HISTORY_VIEW',
    // MEMBER_LIST_BY_PROVINCE artık checkbox'ta gösterilmeyecek, yerine yetki alanı seçimi kullanılacak
    // 'MEMBER_LIST_BY_PROVINCE',
  ] as Permission[],
  REGION_MANAGEMENT: [
    'REGION_LIST',
    'BRANCH_MANAGE',
    'BRANCH_ASSIGN_PRESIDENT',
  ] as Permission[],
  CONTENT_MANAGEMENT: [
    'CONTENT_MANAGE',
    'CONTENT_PUBLISH',
  ] as Permission[],
  DOCUMENT_MANAGEMENT: [
    'DOCUMENT_SYSTEM_ACCESS',
    'DOCUMENT_TEMPLATE_MANAGE',
    'DOCUMENT_MEMBER_HISTORY_VIEW',
    'DOCUMENT_GENERATE_PDF',
    'DOCUMENT_UPLOAD',
    'DOCUMENT_DOWNLOAD',
  ] as Permission[],
  REPORTS: [
    'REPORT_GLOBAL_VIEW',
    'REPORT_REGION_VIEW',
    'REPORT_MEMBER_STATUS_VIEW',
    'REPORT_DUES_VIEW',
  ] as Permission[],
  NOTIFICATIONS: [
    'WHATSAPP_ACCESS',
    'WHATSAPP_CHAT_VIEW',
    'WHATSAPP_CHAT_SEND',
    'WHATSAPP_CHAT_MANAGE',
    'WHATSAPP_BULK_SEND',
    'WHATSAPP_TEMPLATE_VIEW',
    'WHATSAPP_TEMPLATE_MANAGE',
    'WHATSAPP_INSTANCE_MANAGE',
    'NOTIFY_ALL_MEMBERS',
    'NOTIFY_REGION',
    'NOTIFY_OWN_SCOPE',
  ] as Permission[],
  SYSTEM: [
    'SYSTEM_SETTINGS_VIEW',
    'SYSTEM_SETTINGS_MANAGE',
    'LOG_VIEW_ALL',
    'LOG_VIEW_OWN_SCOPE',
  ] as Permission[],
  INSTITUTION_MANAGEMENT: [
    'INSTITUTION_LIST',
    'INSTITUTION_VIEW',
    'INSTITUTION_CREATE',
    'INSTITUTION_UPDATE',
    'INSTITUTION_APPROVE',
  ] as Permission[],
  PROFESSION_MANAGEMENT: [
    'PROFESSION_VIEW',
    'PROFESSION_CREATE',
    'PROFESSION_UPDATE',
    'PROFESSION_DELETE',
  ] as Permission[],
  ACCOUNTING: [
    'TEVKIFAT_VIEW',
    'TEVKIFAT_EXPORT',
    'TEVKIFAT_TITLE_VIEW',
    'TEVKIFAT_TITLE_CREATE',
    'TEVKIFAT_TITLE_UPDATE',
    'TEVKIFAT_TITLE_DELETE',
    'TEVKIFAT_CENTER_VIEW',
    'TEVKIFAT_CENTER_CREATE',
    'TEVKIFAT_CENTER_UPDATE',
    'TEVKIFAT_CENTER_DELETE',
    'TEVKIFAT_FILE_UPLOAD',
    'TEVKIFAT_FILE_APPROVE',
  ] as Permission[],
  MEMBER_PAYMENTS: [
    'MEMBER_PAYMENT_ADD',
    'MEMBER_PAYMENT_APPROVE',
    'MEMBER_PAYMENT_LIST',
    'MEMBER_PAYMENT_VIEW',
  ] as Permission[],
  APPROVALS: [
    'APPROVAL_VIEW',
    'APPROVAL_APPROVE',
    'APPROVAL_REJECT',
  ] as Permission[],
  PANEL_USER_APPLICATIONS: [
    'PANEL_USER_APPLICATION_CREATE',
    'PANEL_USER_APPLICATION_LIST',
    'PANEL_USER_APPLICATION_VIEW',
    'PANEL_USER_APPLICATION_APPROVE',
    'PANEL_USER_APPLICATION_REJECT',
  ] as Permission[],
  ADVANCES: [
    'ADVANCE_VIEW',
    'ADVANCE_CREATE',
    'ADVANCE_UPDATE',
    'ADVANCE_DELETE',
    'ADVANCE_DOCUMENT',
  ] as Permission[],
  INVOICES: [
    'INVOICE_VIEW',
    'INVOICE_CREATE',
    'INVOICE_UPDATE',
    'INVOICE_DELETE',
  ] as Permission[],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  USER_LIST: 'Kullanıcıları Listele',
  USER_VIEW: 'Kullanıcı Detayı Görüntüle',
  USER_CREATE: 'Kullanıcı Oluştur',
  USER_UPDATE: 'Kullanıcı Güncelle',
  USER_SOFT_DELETE: 'Kullanıcı Sil',
  USER_ASSIGN_ROLE: 'Kullanıcıya Rol Ata',
  ROLE_LIST: 'Rolleri Listele',
  ROLE_VIEW: 'Rol Detayı Görüntüle',
  ROLE_CREATE: 'Rol Oluştur',
  ROLE_UPDATE: 'Rol Güncelle',
  ROLE_DELETE: 'Rol Sil',
  ROLE_MANAGE_PERMISSIONS: 'Rol İzinlerini Yönet',
  MEMBER_LIST: 'Üyeleri Listele',
  MEMBER_VIEW: 'Üye Detayı Görüntüle',
  MEMBER_CREATE_APPLICATION: 'Üyelik Başvurusu Oluştur',
  MEMBER_APPLICATIONS_VIEW: 'Üye Başvurularını Görüntüle',
  MEMBER_APPROVE: 'Üyelik Başvurusu Onayla',
  MEMBER_REJECT: 'Üyelik Başvurusu Reddet',
  MEMBER_UPDATE: 'Üye Güncelle',
  MEMBER_STATUS_CHANGE: 'Üye Durumu Değiştir',
  MEMBER_HISTORY_VIEW: 'Üye Hareketlerini Görüntüle',
  MEMBER_LIST_BY_PROVINCE: 'Belirli İldeki Üyeleri Görüntüleme',
  REGION_LIST: 'Bölgeleri Listele',
  BRANCH_MANAGE: 'Şube Yönet',
  BRANCH_ASSIGN_PRESIDENT: 'Şube Başkanı Ata',
  CONTENT_MANAGE: 'İçerik Yönet',
  CONTENT_PUBLISH: 'İçerik Yayınla',
  DOCUMENT_SYSTEM_ACCESS: 'Evrak Sistemine Erişim',
  DOCUMENT_TEMPLATE_MANAGE: 'Doküman Şablonu Yönet',
  DOCUMENT_MEMBER_HISTORY_VIEW: 'Üye Doküman Geçmişini Görüntüle',
  DOCUMENT_GENERATE_PDF: 'PDF Oluştur',
  DOCUMENT_UPLOAD: 'Evrak Yükle',
  DOCUMENT_DOWNLOAD: 'Evrak İndir',
  REPORT_GLOBAL_VIEW: 'Genel Rapor Görüntüle',
  REPORT_REGION_VIEW: 'Bölge Raporu Görüntüle',
  REPORT_MEMBER_STATUS_VIEW: 'Üye Durum Raporu Görüntüle',
  REPORT_DUES_VIEW: 'Kesinti Raporu Görüntüle',
  WHATSAPP_ACCESS: 'WhatsApp (eski birleşik izin)',
  WHATSAPP_CHAT_VIEW: 'WhatsApp — Sohbetleri görüntüle',
  WHATSAPP_CHAT_SEND: 'WhatsApp — Mesaj gönder',
  WHATSAPP_CHAT_MANAGE: 'WhatsApp — Sohbet arşivle / sil',
  WHATSAPP_BULK_SEND: 'WhatsApp — Toplu mesaj',
  WHATSAPP_TEMPLATE_VIEW: 'WhatsApp — Şablonları görüntüle',
  WHATSAPP_TEMPLATE_MANAGE: 'WhatsApp — Şablon yönetimi ve gönderim',
  WHATSAPP_INSTANCE_MANAGE: 'WhatsApp — Bağlantı (QR / oturum)',
  NOTIFY_ALL_MEMBERS: 'Tüm Üyelere Bildirim Gönder',
  NOTIFY_REGION: 'Bölgeye Bildirim Gönder',
  NOTIFY_OWN_SCOPE: 'Kendi Kapsamına Bildirim Gönder',
  SYSTEM_SETTINGS_VIEW: 'Sistem Ayarlarını Görüntüle',
  SYSTEM_SETTINGS_MANAGE: 'Sistem Ayarlarını Yönet',
  LOG_VIEW_ALL: 'Tüm Logları Görüntüle',
  LOG_VIEW_OWN_SCOPE: 'Kendi Kapsamı Loglarını Görüntüle',
  INSTITUTION_LIST: 'Kurumları Listele',
  INSTITUTION_VIEW: 'Kurum Detayı Görüntüle',
  INSTITUTION_CREATE: 'Kurum Oluştur',
  INSTITUTION_UPDATE: 'Kurum Güncelle',
  INSTITUTION_APPROVE: 'Kurum Onayla',
  PROFESSION_VIEW: 'Meslekleri Görüntüle',
  PROFESSION_CREATE: 'Meslek Oluştur',
  PROFESSION_UPDATE: 'Meslek Güncelle',
  PROFESSION_DELETE: 'Meslek Sil',
  TEVKIFAT_VIEW: 'Tevkifat Görüntüle',
  TEVKIFAT_EXPORT: 'Tevkifat Dışa Aktar',
  TEVKIFAT_TITLE_VIEW: 'Tevkifat Unvanlarını Görüntüle',
  TEVKIFAT_TITLE_CREATE: 'Tevkifat Unvanı Oluştur',
  TEVKIFAT_TITLE_UPDATE: 'Tevkifat Unvanı Güncelle',
  TEVKIFAT_TITLE_DELETE: 'Tevkifat Unvanı Sil',
  TEVKIFAT_CENTER_VIEW: 'Tevkifat Merkezi Görüntüle',
  TEVKIFAT_CENTER_CREATE: 'Tevkifat Merkezi Oluştur',
  TEVKIFAT_CENTER_UPDATE: 'Tevkifat Merkezi Güncelle',
  TEVKIFAT_CENTER_DELETE: 'Tevkifat Merkezi Sil',
  TEVKIFAT_FILE_UPLOAD: 'Tevkifat Dosyası Yükle',
  TEVKIFAT_FILE_APPROVE: 'Tevkifat Dosyası Onayla',
  MEMBER_PAYMENT_ADD: 'Üye Kesintisi Ekle',
  MEMBER_PAYMENT_APPROVE: 'Üye Kesintisi Onayla',
  MEMBER_PAYMENT_LIST: 'Üye Kesintilerini Listele',
  MEMBER_PAYMENT_VIEW: 'Üye Kesinti Detayı Görüntüle',
  APPROVAL_VIEW: 'Onay Görüntüle',
  APPROVAL_APPROVE: 'Onay Onayla',
  APPROVAL_REJECT: 'Onay Reddet',
  PANEL_USER_APPLICATION_CREATE: 'Panel Kullanıcı Başvurusu Oluştur',
  PANEL_USER_APPLICATION_LIST: 'Panel Kullanıcı Başvurularını Listele',
  PANEL_USER_APPLICATION_VIEW: 'Panel Kullanıcı Başvurusu Detayı Görüntüle',
  PANEL_USER_APPLICATION_APPROVE: 'Panel Kullanıcı Başvurusu Onayla',
  PANEL_USER_APPLICATION_REJECT: 'Panel Kullanıcı Başvurusu Reddet',
  ADVANCE_VIEW: 'Avansları Görüntüle',
  ADVANCE_CREATE: 'Avans Ekle',
  ADVANCE_UPDATE: 'Avans Güncelle',
  ADVANCE_DELETE: 'Avans Sil',
  ADVANCE_DOCUMENT: 'Avans Belgesi Yönet (yükle / kaldır)',
  ADVANCE_ADD: 'Avans (eski birleşik izin)',
  INVOICE_VIEW: 'Faturaları Görüntüle',
  INVOICE_CREATE: 'Fatura Ekle',
  INVOICE_UPDATE: 'Fatura Güncelle',
  INVOICE_DELETE: 'Fatura Sil',
};

