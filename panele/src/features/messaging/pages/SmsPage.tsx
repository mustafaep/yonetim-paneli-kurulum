import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import PageLayout from '../../../shared/components/layout/PageLayout';

const SmsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (location.pathname === '/sms') {
      navigate('/sms/bulk', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Outlet />
      </Box>
    </PageLayout>
  );
};

export default SmsPage;
