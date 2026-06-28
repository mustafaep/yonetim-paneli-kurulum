// src/shared/utils/permissions.ts
import type { BackendUser } from '../../types/auth';

export const hasPermission = (
  user: BackendUser | null,
  permission: string,
): boolean => {
  if (!user) return false;
  return user.permissions?.includes(permission) ?? false;
};

// Üye detayında hassas alanları görebilme
export const canViewSensitiveMemberFields = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'MEMBER_VIEW');
};

// Üye kesinti detaylarını görebilme
export const canViewMemberPayments = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'MEMBER_PAYMENT_VIEW') || hasPermission(user, 'MEMBER_PAYMENT_LIST');
};

// Üye onaylama yetkisi
export const canApproveMember = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'MEMBER_APPROVE');
};

// Üye başvurusu reddetme yetkisi
export const canRejectMember = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'MEMBER_REJECT');
};

// Üyeyi soft delete etme / statü değiştirme yetkisi
export const canSoftDeleteMember = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'MEMBER_STATUS_CHANGE');
};

// Şube Yönetimi
export const canManageBranches = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'BRANCH_MANAGE');
};

// Avans Yönetimi
export const canViewAdvances = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'ADVANCE_VIEW');
};

/** @deprecated Birleşik eski izin; tüm avans mutasyonlarına eşdeğer kabul edilir */
function hasLegacyAdvanceBundle(user: BackendUser | null): boolean {
  if (!user) return false;
  return hasPermission(user, 'ADVANCE_ADD');
}

export const canCreateAdvance = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'ADVANCE_CREATE') || hasLegacyAdvanceBundle(user);
};

export const canUpdateAdvance = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'ADVANCE_UPDATE') || hasLegacyAdvanceBundle(user);
};

export const canDeleteAdvance = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'ADVANCE_DELETE') || hasLegacyAdvanceBundle(user);
};

/** Belge yükle, değiştir, kaldır (üye evrakından ayır) */
export const canManageAdvanceDocument = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return hasPermission(user, 'ADVANCE_DOCUMENT') || hasLegacyAdvanceBundle(user);
};

export const canManageAdvances = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return (
    canCreateAdvance(user) ||
    canUpdateAdvance(user) ||
    canDeleteAdvance(user) ||
    canManageAdvanceDocument(user)
  );
};

// ─── WhatsApp (backend PermissionsGuard ile aynı geriye dönük kurallar) ───

function hasLegacyWhatsAppAccess(user: BackendUser | null): boolean {
  if (!user) return false;
  return hasPermission(user, 'WHATSAPP_ACCESS');
}

function notifyChatScope(user: BackendUser | null): boolean {
  if (!user) return false;
  return (
    hasPermission(user, 'NOTIFY_ALL_MEMBERS') ||
    hasPermission(user, 'NOTIFY_REGION') ||
    hasPermission(user, 'NOTIFY_OWN_SCOPE')
  );
}

/** Sohbet listesi / mesaj okuma / okundu */
export const canViewWhatsAppChat = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return (
    hasPermission(user, 'WHATSAPP_CHAT_VIEW') ||
    hasPermission(user, 'WHATSAPP_CHAT_SEND') ||
    hasPermission(user, 'WHATSAPP_CHAT_MANAGE') ||
    hasLegacyWhatsAppAccess(user) ||
    notifyChatScope(user)
  );
};

/** Mesaj gönder (konuşma veya telefon) */
export const canSendWhatsAppChat = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return (
    hasPermission(user, 'WHATSAPP_CHAT_SEND') ||
    hasLegacyWhatsAppAccess(user) ||
    notifyChatScope(user)
  );
};

/** Sohbet arşivle / sil */
export const canManageWhatsAppChat = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return (
    hasPermission(user, 'WHATSAPP_CHAT_MANAGE') ||
    hasLegacyWhatsAppAccess(user) ||
    notifyChatScope(user)
  );
};

export const canWhatsAppBulkSend = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return (
    hasPermission(user, 'WHATSAPP_BULK_SEND') ||
    hasLegacyWhatsAppAccess(user) ||
    hasPermission(user, 'NOTIFY_ALL_MEMBERS')
  );
};

export const canViewWhatsAppTemplates = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return (
    hasPermission(user, 'WHATSAPP_TEMPLATE_VIEW') ||
    hasPermission(user, 'WHATSAPP_TEMPLATE_MANAGE') ||
    hasLegacyWhatsAppAccess(user) ||
    notifyChatScope(user)
  );
};

export const canManageWhatsAppTemplates = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return (
    hasPermission(user, 'WHATSAPP_TEMPLATE_MANAGE') ||
    hasLegacyWhatsAppAccess(user) ||
    hasPermission(user, 'NOTIFY_ALL_MEMBERS')
  );
};

/** QR, bağlan, bağlantı kes */
export const canManageWhatsAppInstance = (user: BackendUser | null): boolean => {
  if (!user) return false;
  return (
    hasPermission(user, 'WHATSAPP_INSTANCE_MANAGE') ||
    hasLegacyWhatsAppAccess(user) ||
    hasPermission(user, 'NOTIFY_ALL_MEMBERS')
  );
};
