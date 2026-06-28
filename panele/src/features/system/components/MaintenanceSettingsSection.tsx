import React from 'react';
import type { SystemSetting } from '../services/systemApi';
import MaintenanceSettings from './MaintenanceSettings';

interface MaintenanceSettingsSectionProps {
  settings: SystemSetting[];
  canManage: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

const MaintenanceSettingsSection: React.FC<MaintenanceSettingsSectionProps> = ({
  settings,
  canManage,
  onUpdate,
}) => {
  return (
    <MaintenanceSettings
      settings={settings}
      onUpdate={canManage ? onUpdate : undefined}
      loading={false}
    />
  );
};

export default MaintenanceSettingsSection;
