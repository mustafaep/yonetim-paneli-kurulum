import React from 'react';
import { Box, alpha } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import EmailTemplatesPage from './EmailTemplatesPage';
import EmailStatusBadge from '../components/EmailStatusBadge';

const EmailTemplatesMessagesPage: React.FC = () => {
  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<AutoAwesomeIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="E-posta Şablonları"
          description="E-posta mesaj şablonlarını yönetin"
          color="#3182ce"
          darkColor="#2b6cb0"
          lightColor={alpha('#3182ce', 0.06)}
          rightContent={<EmailStatusBadge />}
        />
        <EmailTemplatesPage />
      </Box>
    </PageLayout>
  );
};

export default EmailTemplatesMessagesPage;
