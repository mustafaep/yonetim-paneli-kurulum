import React from 'react';
import { Box, alpha } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import SmsBulkPage from './SmsBulkPage';
import SmsStatusBadge from '../components/SmsStatusBadge';

const SmsBulkMessagesPage: React.FC = () => {
  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<CampaignIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="Toplu SMS"
          description="Toplu SMS gönderimlerini yönetin"
          color="#e53e3e"
          darkColor="#c53030"
          lightColor={alpha('#e53e3e', 0.06)}
          rightContent={<SmsStatusBadge />}
        />
        <SmsBulkPage />
      </Box>
    </PageLayout>
  );
};

export default SmsBulkMessagesPage;
