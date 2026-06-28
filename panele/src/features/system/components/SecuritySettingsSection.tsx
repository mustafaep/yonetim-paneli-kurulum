import React from 'react';
import type { SystemSetting } from '../services/systemApi';
import SecuritySettings from './SecuritySettings';

interface SecuritySettingsSectionProps {
  settings: SystemSetting[];
  canManage: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

const SecuritySettingsSection: React.FC<SecuritySettingsSectionProps> = ({
  settings,
  canManage,
  onUpdate,
}) => {
  return (
    <SecuritySettings
      settings={settings}
      onUpdate={canManage ? onUpdate : undefined}
      loading={false}
    />
  );
};

export default SecuritySettingsSection;
