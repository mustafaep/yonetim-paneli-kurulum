import React from 'react';
import type { SystemSetting } from '../services/systemApi';
import MembershipSettings from './MembershipSettings';

interface MembershipSettingsSectionProps {
  settings: SystemSetting[];
  canManage: boolean;
  onUpdate: (key: string, value: string) => Promise<void>;
}

const MembershipSettingsSection: React.FC<MembershipSettingsSectionProps> = ({
  settings,
  canManage,
  onUpdate,
}) => {
  return (
    <MembershipSettings
      settings={settings}
      onUpdate={canManage ? onUpdate : undefined}
      loading={false}
      canManage={canManage}
    />
  );
};

export default MembershipSettingsSection;
