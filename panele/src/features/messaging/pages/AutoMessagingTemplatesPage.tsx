import React from 'react';
import { Box, alpha } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import WhatsAppTemplatesContent from '../components/WhatsAppTemplatesContent';
import ConnectionStatusBadge from '../components/ConnectionStatusBadge';

const AutoMessagingTemplatesPage: React.FC = () => {
  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<AutoAwesomeIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="Şablonlar"
          description="WhatsApp mesaj şablonlarını yönetin"
          color="#25D366"
          darkColor="#128C7E"
          lightColor={alpha('#25D366', 0.06)}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ConnectionStatusBadge />
        </Box>
        <WhatsAppTemplatesContent />
      </Box>
    </PageLayout>
  );
};

export default AutoMessagingTemplatesPage;
