import React from 'react';
import { Navigate } from 'react-router-dom';

const WhatsAppSettingsPage: React.FC = () => {
  return <Navigate to="/system/settings/messaging" replace />;
};

export default WhatsAppSettingsPage;
