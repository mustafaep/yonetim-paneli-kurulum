import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Container, Paper, Typography, Button, alpha } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 2,
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, sm: 6 },
                textAlign: 'center',
                borderRadius: 3,
                border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(theme.palette.error.light, 0.05)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
              }}
            >
              <ErrorOutlineIcon
                sx={{ fontSize: { xs: 64, sm: 80 }, color: 'error.main', mb: 3 }}
              />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Bir Hata Oluştu
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
                Beklenmeyen bir sorun oluştu. Sayfayı yenilemeyi veya ana sayfaya dönmeyi deneyin.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  mr: 2,
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                Sayfayı Yenile
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                }}
              >
                Ana Sayfaya Git
              </Button>
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
