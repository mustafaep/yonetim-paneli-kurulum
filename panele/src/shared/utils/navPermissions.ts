/**
 * Sidebar ve rotalarla aynı görünürlük kurallarını tek yerde tutar.
 * İzin kodları backend Permission enum ile aynıdır.
 */
export type PermissionCheck = (permission: string) => boolean;
export type RoleCheck = (role: string) => boolean;

export interface SidebarNavFlags {
  showNewMemberApplication: boolean;
  showMemberApplications: boolean;
  showMembersList: boolean;
  showMemberHistory: boolean;
  /** Haber / duyuru / etkinlik (CONTENT_MANAGE) */
  showContent: boolean;
  /** Meslek listesi */
  showProfessions: boolean;
  showRegions: boolean;
  showRoles: boolean;
  showDocumentsSection: boolean;
  showPdfGenerate: boolean;
  showDocumentTemplates: boolean;
  showDocumentMemberHistory: boolean;
  showUsers: boolean;
  showPanelUserApplications: boolean;
  showBranches: boolean;
  showAccounting: boolean;
  showPaymentsList: boolean;
  showPaymentQuickEntry: boolean;
  showAdvances: boolean;
  showInvoices: boolean;
  showReports: boolean;
  showNotifications: boolean;
  /** Mesajlaşma menü grubu (WhatsApp) — en az bir alt yol görünür */
  showMessaging: boolean;
  showWhatsAppChatNav: boolean;
  showWhatsAppBulkNav: boolean;
  showWhatsAppTemplatesNav: boolean;
  showSystemSettings: boolean;
  showSystemLogs: boolean;
  showInstitutions: boolean;
}

export function getSidebarNavFlags(
  hasPermission: PermissionCheck,
  _hasRole: RoleCheck,
): SidebarNavFlags {
  // Üye Başvuruları: MEMBER_APPLICATIONS_VIEW veya onay/red (üye listesi izni yetmez)
  const showMemberApplications =
    hasPermission('MEMBER_APPLICATIONS_VIEW') ||
    hasPermission('MEMBER_APPROVE') ||
    hasPermission('MEMBER_REJECT');

  const showMembersList =
    hasPermission('MEMBER_LIST') || hasPermission('MEMBER_LIST_BY_PROVINCE');

  const showMemberHistory = hasPermission('MEMBER_HISTORY_VIEW');

  const showContent = hasPermission('CONTENT_MANAGE');

  const showProfessions = hasPermission('PROFESSION_VIEW');

  const showDocumentsSection =
    hasPermission('DOCUMENT_SYSTEM_ACCESS') ||
    hasPermission('DOCUMENT_TEMPLATE_MANAGE') ||
    hasPermission('DOCUMENT_MEMBER_HISTORY_VIEW') ||
    hasPermission('DOCUMENT_GENERATE_PDF') ||
    hasPermission('DOCUMENT_UPLOAD');

  const showDocumentTemplates =
    hasPermission('DOCUMENT_TEMPLATE_MANAGE') || hasPermission('DOCUMENT_SYSTEM_ACCESS');

  const showDocumentMemberHistory =
    hasPermission('DOCUMENT_MEMBER_HISTORY_VIEW') || hasPermission('DOCUMENT_SYSTEM_ACCESS');

  const showWhatsAppChatNav =
    hasPermission('WHATSAPP_CHAT_VIEW') ||
    hasPermission('WHATSAPP_CHAT_SEND') ||
    hasPermission('WHATSAPP_CHAT_MANAGE') ||
    hasPermission('WHATSAPP_ACCESS') ||
    hasPermission('NOTIFY_ALL_MEMBERS') ||
    hasPermission('NOTIFY_REGION') ||
    hasPermission('NOTIFY_OWN_SCOPE');

  const showWhatsAppBulkNav =
    hasPermission('WHATSAPP_BULK_SEND') ||
    hasPermission('WHATSAPP_ACCESS') ||
    hasPermission('NOTIFY_ALL_MEMBERS');

  const showWhatsAppTemplatesNav =
    hasPermission('WHATSAPP_TEMPLATE_VIEW') ||
    hasPermission('WHATSAPP_TEMPLATE_MANAGE') ||
    hasPermission('WHATSAPP_ACCESS') ||
    hasPermission('NOTIFY_ALL_MEMBERS') ||
    hasPermission('NOTIFY_REGION') ||
    hasPermission('NOTIFY_OWN_SCOPE');

  const showMessaging =
    showWhatsAppChatNav || showWhatsAppBulkNav || showWhatsAppTemplatesNav;

  return {
    showNewMemberApplication: hasPermission('MEMBER_CREATE_APPLICATION'),
    showMemberApplications,
    showMembersList,
    showMemberHistory,
    showContent,
    showProfessions,
    showRegions:
      hasPermission('REGION_LIST') ||
      hasPermission('BRANCH_MANAGE') ||
      hasPermission('MEMBER_LIST_BY_PROVINCE'),
    showRoles: hasPermission('ROLE_LIST'),
    showDocumentsSection,
    showPdfGenerate: hasPermission('DOCUMENT_GENERATE_PDF'),
    showDocumentTemplates,
    showDocumentMemberHistory,
    showUsers: hasPermission('USER_LIST'),
    showPanelUserApplications: hasPermission('PANEL_USER_APPLICATION_APPROVE'),
    showBranches: hasPermission('BRANCH_MANAGE'),
    showAccounting: hasPermission('TEVKIFAT_VIEW'),
    showPaymentsList: hasPermission('MEMBER_PAYMENT_LIST'),
    showPaymentQuickEntry:
      hasPermission('MEMBER_PAYMENT_ADD') || hasPermission('MEMBER_PAYMENT_LIST'),
    showAdvances: hasPermission('ADVANCE_VIEW'),
    showInvoices: hasPermission('INVOICE_VIEW'),
    showReports:
      hasPermission('REPORT_GLOBAL_VIEW') ||
      hasPermission('REPORT_REGION_VIEW') ||
      hasPermission('REPORT_MEMBER_STATUS_VIEW') ||
      hasPermission('REPORT_DUES_VIEW'),
    showNotifications:
      hasPermission('NOTIFY_ALL_MEMBERS') ||
      hasPermission('NOTIFY_REGION') ||
      hasPermission('NOTIFY_OWN_SCOPE'),
    showMessaging,
    showWhatsAppChatNav,
    showWhatsAppBulkNav,
    showWhatsAppTemplatesNav,
    showSystemSettings: hasPermission('SYSTEM_SETTINGS_VIEW'),
    showSystemLogs: hasPermission('LOG_VIEW_ALL') || hasPermission('LOG_VIEW_OWN_SCOPE'),
    showInstitutions: hasPermission('INSTITUTION_LIST'),
  };
}
