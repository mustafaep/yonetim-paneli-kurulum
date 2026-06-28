import React from 'react';
import type { SystemSetting } from '../services/systemApi';
import AuditSettings from './AuditSettings';

interface AuditSettingsSectionProps {
  settings: SystemSetting[];
  canManage: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

const AuditSettingsSection: React.FC<AuditSettingsSectionProps> = ({
  settings,
  canManage,
  onUpdate,
}) => {
  return (
    <AuditSettings
      settings={settings}
      onUpdate={canManage ? onUpdate : undefined}
      loading={false}
    />
  );
};

export default AuditSettingsSection;
