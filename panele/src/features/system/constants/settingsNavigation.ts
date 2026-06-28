import type { SettingsCategory } from '../components/SettingsSidebar';

export const getCategoryFromPath = (pathname: string): SettingsCategory => {
  if (pathname.startsWith('/system/settings/user')) return 'MEMBERSHIP';
  if (pathname.startsWith('/system/settings/dashboard-settings')) return 'DASHBOARD';
  if (pathname.startsWith('/system/settings/reports')) return 'REPORTS';
  if (pathname.startsWith('/system/settings/security')) return 'SECURITY';
  if (pathname.startsWith('/system/settings/audit')) return 'AUDIT';
  if (pathname.startsWith('/system/settings/maintenance')) return 'MAINTENANCE';
  if (pathname.startsWith('/system/settings/kbs')) return 'KBS_DATA';
  if (pathname.startsWith('/system/settings/messaging')) return 'MESSAGING';
  if (pathname.startsWith('/system/settings/bulk-registration')) return 'BULK_REGISTRATION';
  return 'GENERAL';
};

export const getPathFromCategory = (category: SettingsCategory): string => {
  if (category === 'MEMBERSHIP') return '/system/settings/user';
  if (category === 'DASHBOARD') return '/system/settings/dashboard-settings';
  if (category === 'REPORTS') return '/system/settings/reports';
  if (category === 'SECURITY') return '/system/settings/security';
  if (category === 'AUDIT') return '/system/settings/audit';
  if (category === 'MAINTENANCE') return '/system/settings/maintenance';
  if (category === 'KBS_DATA') return '/system/settings/kbs';
  if (category === 'MESSAGING') return '/system/settings/messaging';
  if (category === 'BULK_REGISTRATION') return '/system/settings/bulk-registration';
  return '/system/settings';
};
