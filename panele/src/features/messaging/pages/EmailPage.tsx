import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import PageLayout from '../../../shared/components/layout/PageLayout';

const EmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (location.pathname === '/email') {
      navigate('/email/bulk', { replace: true });
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

export default EmailPage;
