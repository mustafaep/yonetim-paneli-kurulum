import React from 'react';
import type { SystemSetting } from '../services/systemApi';
import DashboardSettings from './DashboardSettings';

interface DashboardSettingsSectionProps {
  settings: SystemSetting[];
  canManage: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

const DashboardSettingsSection: React.FC<DashboardSettingsSectionProps> = ({
  settings,
  canManage,
  onUpdate,
}) => {
  return (
    <DashboardSettings
      settings={settings}
      onUpdate={canManage ? onUpdate : undefined}
      loading={false}
    />
  );
};

export default DashboardSettingsSection;
