import React from 'react';
import { Box, alpha } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import WhatsAppBulkPage from './WhatsAppBulkPage';

const WhatsAppBulkMessagesPage: React.FC = () => {
  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<CampaignIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="Toplu Mesaj"
          description="Toplu WhatsApp mesaj gönderimlerini yönetin"
          color="#25D366"
          darkColor="#128C7E"
          lightColor={alpha('#25D366', 0.06)}
        />
        <WhatsAppBulkPage />
      </Box>
    </PageLayout>
  );
};

export default WhatsAppBulkMessagesPage;
