import React from 'react';
import { Box, alpha } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import EmailBulkPage from './EmailBulkPage';
import EmailStatusBadge from '../components/EmailStatusBadge';

const EmailBulkMessagesPage: React.FC = () => {
  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<CampaignIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="Toplu E-posta"
          description="Toplu e-posta gönderimlerini yönetin"
          color="#3182ce"
          darkColor="#2b6cb0"
          lightColor={alpha('#3182ce', 0.06)}
          rightContent={<EmailStatusBadge />}
        />
        <EmailBulkPage />
      </Box>
    </PageLayout>
  );
};

export default EmailBulkMessagesPage;
