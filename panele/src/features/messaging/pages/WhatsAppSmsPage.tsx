import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import PageLayout from '../../../shared/components/layout/PageLayout';
import ConnectionStatusBadge from '../components/ConnectionStatusBadge';

const WhatsAppSmsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Eger sadece /whatsapp'taysa chat'e yonlendir
  React.useEffect(() => {
    if (location.pathname === '/whatsapp') {
      navigate('/whatsapp/chat', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* <PageHeader
          icon={
            <WhatsAppIcon
              sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }}
            />
          }
          title="Sohbetler"
          description="WhatsApp konuşmalarını yönetin"
          color="#25D366"
          darkColor="#128C7E"
          lightColor={alpha('#25D366', 0.06)}
          sx={{ mb: 0 }}
        /> */}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ConnectionStatusBadge />
        </Box>

        <Box>
          <Outlet />
        </Box>
      </Box>
    </PageLayout>
  );
};

export default WhatsAppSmsPage;
