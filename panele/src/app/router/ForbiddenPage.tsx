import React from 'react';
import { Typography, Button, Container, Paper, alpha, useTheme } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';

const ForbiddenPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.error.light, 0.05)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
        }}
      >
        <BlockIcon sx={{ fontSize: { xs: 64, sm: 80 }, color: 'error.main', mb: 3 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Erişim Engellendi
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
          Bu sayfaya erişim yetkiniz bulunmamaktadır. Lütfen sistem yöneticinizle iletişime geçin.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1.5,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: `0 4px 12px ${alpha('#667eea', 0.3)}`,
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              transform: 'translateY(-2px)',
              boxShadow: `0 6px 20px ${alpha('#667eea', 0.4)}`,
            },
          }}
        >
          Ana Sayfaya Dön
        </Button>
      </Paper>
    </Container>
  );
};

export default ForbiddenPage;
