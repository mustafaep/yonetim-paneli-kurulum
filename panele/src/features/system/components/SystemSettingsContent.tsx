import React from 'react';
import { Box, Alert, Paper, CircularProgress, useTheme, alpha } from '@mui/material';

import type { SystemSetting } from '../services/systemApi';
import type { SettingsCategory } from './SettingsSidebar';
import GeneralSettings from './GeneralSettings';
import MembershipSettingsSection from './MembershipSettingsSection';
import SecuritySettingsSection from './SecuritySettingsSection';
import AuditSettingsSection from './AuditSettingsSection';
import MaintenanceSettingsSection from './MaintenanceSettingsSection';
import ReportsSettingsSection from './ReportsSettingsSection';
import DashboardSettingsSection from './DashboardSettingsSection';
import BulkMemberRegistrationPage from '../../members/pages/BulkMemberRegistrationPage';
import KbsDataSettings from './KbsDataSettings';
import MessagingSettingsSection from './MessagingSettingsSection';

interface SystemSettingsContentProps {
  loading: boolean;
  error: string | null;
  onClearError: () => void;
  selectedCategory: SettingsCategory;
  settings: SystemSetting[];
  canManage: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

const SystemSettingsContent: React.FC<SystemSettingsContentProps> = ({
  loading,
  error,
  onClearError,
  selectedCategory,
  settings,
  canManage,
  onUpdate,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        minHeight: 400,
      }}
    >
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            py: 6,
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" onClose={onClearError}>
            {error}
          </Alert>
        </Box>
      ) : (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {selectedCategory === 'GENERAL' && (
            <GeneralSettings settings={settings} onUpdate={onUpdate} loading={false} />
          )}
          {selectedCategory === 'MEMBERSHIP' && (
            <MembershipSettingsSection
              settings={settings}
              canManage={canManage}
              onUpdate={onUpdate}
            />
          )}
          {selectedCategory === 'BULK_REGISTRATION' && <BulkMemberRegistrationPage embedded />}
          {selectedCategory === 'MESSAGING' && <MessagingSettingsSection />}
          {selectedCategory === 'KBS_DATA' && <KbsDataSettings />}
          {selectedCategory === 'DASHBOARD' && (
            <DashboardSettingsSection
              settings={settings}
              canManage={canManage}
              onUpdate={onUpdate}
            />
          )}
          {selectedCategory === 'REPORTS' && (
            <ReportsSettingsSection
              settings={settings}
              canManage={canManage}
              onUpdate={onUpdate}
            />
          )}
          {selectedCategory === 'SECURITY' && (
            <SecuritySettingsSection
              settings={settings}
              canManage={canManage}
              onUpdate={onUpdate}
            />
          )}
          {selectedCategory === 'AUDIT' && (
            <AuditSettingsSection
              settings={settings}
              canManage={canManage}
              onUpdate={onUpdate}
            />
          )}
          {selectedCategory === 'MAINTENANCE' && (
            <MaintenanceSettingsSection
              settings={settings}
              canManage={canManage}
              onUpdate={onUpdate}
            />
          )}
        </Box>
      )}
    </Paper>
  );
};

export default SystemSettingsContent;
