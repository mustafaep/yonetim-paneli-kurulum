import { PrismaClient } from '@prisma/client';

/** seed7.ts ile aynı izin setleri */
export const ALL_PERMISSIONS: string[] = [
  'USER_LIST',
  'USER_VIEW',
  'USER_CREATE',
  'USER_UPDATE',
  'USER_SOFT_DELETE',
  'USER_ASSIGN_ROLE',
  'ROLE_LIST',
  'ROLE_VIEW',
  'ROLE_CREATE',
  'ROLE_UPDATE',
  'ROLE_DELETE',
  'ROLE_MANAGE_PERMISSIONS',
  'MEMBER_LIST',
  'MEMBER_VIEW',
  'MEMBER_CREATE_APPLICATION',
  'MEMBER_APPLICATIONS_VIEW',
  'MEMBER_APPROVE',
  'MEMBER_REJECT',
  'MEMBER_UPDATE',
  'MEMBER_STATUS_CHANGE',
  'MEMBER_HISTORY_VIEW',
  'MEMBER_LIST_BY_PROVINCE',
  'REGION_LIST',
  'BRANCH_MANAGE',
  'BRANCH_ASSIGN_PRESIDENT',
  'CONTENT_MANAGE',
  'CONTENT_PUBLISH',
  'DOCUMENT_SYSTEM_ACCESS',
  'DOCUMENT_TEMPLATE_MANAGE',
  'DOCUMENT_MEMBER_HISTORY_VIEW',
  'DOCUMENT_GENERATE_PDF',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_DOWNLOAD',
  'REPORT_GLOBAL_VIEW',
  'REPORT_REGION_VIEW',
  'REPORT_MEMBER_STATUS_VIEW',
  'REPORT_DUES_VIEW',
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
  'SYSTEM_SETTINGS_VIEW',
  'SYSTEM_SETTINGS_MANAGE',
  'LOG_VIEW_ALL',
  'LOG_VIEW_OWN_SCOPE',
  'INSTITUTION_LIST',
  'INSTITUTION_VIEW',
  'INSTITUTION_CREATE',
  'INSTITUTION_UPDATE',
  'INSTITUTION_APPROVE',
  'PROFESSION_VIEW',
  'PROFESSION_CREATE',
  'PROFESSION_UPDATE',
  'PROFESSION_DELETE',
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
  'MEMBER_PAYMENT_ADD',
  'MEMBER_PAYMENT_APPROVE',
  'MEMBER_PAYMENT_LIST',
  'MEMBER_PAYMENT_VIEW',
  'APPROVAL_VIEW',
  'APPROVAL_APPROVE',
  'APPROVAL_REJECT',
  'PANEL_USER_APPLICATION_CREATE',
  'PANEL_USER_APPLICATION_LIST',
  'PANEL_USER_APPLICATION_VIEW',
  'PANEL_USER_APPLICATION_APPROVE',
  'PANEL_USER_APPLICATION_REJECT',
  'ADVANCE_VIEW',
  'ADVANCE_CREATE',
  'ADVANCE_UPDATE',
  'ADVANCE_DELETE',
  'ADVANCE_DOCUMENT',
  'INVOICE_VIEW',
  'INVOICE_CREATE',
  'INVOICE_UPDATE',
  'INVOICE_DELETE',
];

export const IL_BASKANI_PERMISSIONS: string[] = [
  'MEMBER_LIST',
  'MEMBER_VIEW',
  'MEMBER_CREATE_APPLICATION',
  'MEMBER_UPDATE',
  'REGION_LIST',
  'DOCUMENT_MEMBER_HISTORY_VIEW',
  'DOCUMENT_UPLOAD',
  'INSTITUTION_LIST',
  'INSTITUTION_VIEW',
  'INSTITUTION_CREATE',
  'PROFESSION_VIEW',
  'PROFESSION_CREATE',
  'TEVKIFAT_VIEW',
  'TEVKIFAT_TITLE_VIEW',
  'TEVKIFAT_TITLE_CREATE',
  'TEVKIFAT_CENTER_VIEW',
  'TEVKIFAT_CENTER_CREATE',
  'INVOICE_VIEW',
  'INVOICE_CREATE',
];

export const ILCE_BASKANI_PERMISSIONS: string[] = [
  'MEMBER_LIST',
  'MEMBER_VIEW',
  'MEMBER_CREATE_APPLICATION',
  'MEMBER_UPDATE',
  'REGION_LIST',
  'DOCUMENT_MEMBER_HISTORY_VIEW',
  'DOCUMENT_UPLOAD',
  'INSTITUTION_LIST',
  'INSTITUTION_VIEW',
  'INSTITUTION_CREATE',
  'PROFESSION_VIEW',
  'PROFESSION_CREATE',
  'TEVKIFAT_VIEW',
  'TEVKIFAT_TITLE_VIEW',
  'TEVKIFAT_TITLE_CREATE',
  'TEVKIFAT_CENTER_VIEW',
  'INVOICE_VIEW',
];

export const GENEL_BASKAN_PERMISSIONS: string[] = ALL_PERMISSIONS.filter(
  (p) => p !== 'SYSTEM_SETTINGS_VIEW' && p !== 'SYSTEM_SETTINGS_MANAGE',
);

async function createRoleWithPermissions(
  prisma: PrismaClient,
  name: string,
  description: string,
  permissions: string[],
  hasScopeRestriction: boolean,
) {
  return prisma.customRole.create({
    data: {
      name,
      description,
      isActive: true,
      hasScopeRestriction,
      permissions: {
        create: permissions.map((permission) => ({ permission })),
      },
    },
  });
}

export type PortfolioRoleMap = Record<
  'ADMIN' | 'IL_BASKANI' | 'ILCE_BASKANI' | 'GENEL_BASKAN',
  string
>;

export async function seedPortfolioRoles(
  prisma: PrismaClient,
): Promise<PortfolioRoleMap> {
  const adminRole = await prisma.customRole.create({
    data: {
      name: 'ADMIN',
      description: 'Admin rolü',
      isActive: true,
      hasScopeRestriction: false,
      permissions: {
        create: [
          { permission: 'USER_LIST' },
          { permission: 'USER_VIEW' },
          { permission: 'USER_CREATE' },
          { permission: 'USER_UPDATE' },
          { permission: 'MEMBER_LIST' },
          { permission: 'MEMBER_VIEW' },
          { permission: 'MEMBER_HISTORY_VIEW' },
          { permission: 'MEMBER_CREATE_APPLICATION' },
          { permission: 'MEMBER_APPROVE' },
        ],
      },
    },
  });

  const ilBaskani = await createRoleWithPermissions(
    prisma,
    'IL_BASKANI',
    'İl başkanı rolü',
    IL_BASKANI_PERMISSIONS,
    true,
  );
  const ilceBaskani = await createRoleWithPermissions(
    prisma,
    'ILCE_BASKANI',
    'İlçe başkanı rolü',
    ILCE_BASKANI_PERMISSIONS,
    true,
  );
  const genelBaskan = await createRoleWithPermissions(
    prisma,
    'GENEL_BASKAN',
    'Genel başkan rolü',
    GENEL_BASKAN_PERMISSIONS,
    false,
  );

  return {
    ADMIN: adminRole.id,
    IL_BASKANI: ilBaskani.id,
    ILCE_BASKANI: ilceBaskani.id,
    GENEL_BASKAN: genelBaskan.id,
  };
}
