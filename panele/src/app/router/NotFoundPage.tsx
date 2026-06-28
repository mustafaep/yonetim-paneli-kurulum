import React from 'react';
import { Typography, Button, Container, Paper, alpha, useTheme } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
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
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
        }}
      >
        <SearchOffIcon sx={{ fontSize: { xs: 64, sm: 80 }, color: 'info.main', mb: 3 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Sayfa Bulunamadı
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
          Aradığınız sayfa mevcut değil veya taşınmış olabilir. Ana sayfaya dönerek devam edebilirsiniz.
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
            mr: 2,
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
        <Button
          variant="outlined"
          size="large"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1.5,
            fontWeight: 600,
          }}
        >
          Geri
        </Button>
      </Paper>
    </Container>
  );
};

export default NotFoundPage;
