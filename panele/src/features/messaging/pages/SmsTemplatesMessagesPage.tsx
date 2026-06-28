import React from 'react';
import { Box, alpha } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import SmsTemplatesPage from './SmsTemplatesPage';
import SmsStatusBadge from '../components/SmsStatusBadge';

const SmsTemplatesMessagesPage: React.FC = () => {
  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<AutoAwesomeIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="SMS Şablonları"
          description="SMS mesaj şablonlarını yönetin"
          color="#e53e3e"
          darkColor="#c53030"
          lightColor={alpha('#e53e3e', 0.06)}
          rightContent={<SmsStatusBadge />}
        />
        <SmsTemplatesPage />
      </Box>
    </PageLayout>
  );
};

export default SmsTemplatesMessagesPage;
