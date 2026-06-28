import React from 'react';
import type { SystemSetting } from '../services/systemApi';
import ReportsSettings from './ReportsSettings';

interface ReportsSettingsSectionProps {
  settings: SystemSetting[];
  canManage: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

const ReportsSettingsSection: React.FC<ReportsSettingsSectionProps> = ({
  settings,
  canManage,
  onUpdate,
}) => {
  return (
    <ReportsSettings
      settings={settings}
      onUpdate={canManage ? onUpdate : undefined}
      loading={false}
    />
  );
};

export default ReportsSettingsSection;
