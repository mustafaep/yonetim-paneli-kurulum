// src/features/auth/pages/LoginPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
  InputAdornment,
  IconButton,
  Alert,
  useTheme,
  alpha,
  CircularProgress,
  Container,
  Avatar,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { getPublicSystemInfo } from '../../system/services/systemApi';
import { useDocumentHead } from '../../../shared/hooks/useDocumentHead';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { DEFAULT_LOGO_PATH } from '../../../shared/constants/defaultLogo';


const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const { isAuthenticated, login } = useAuth();
  
  const [siteName, setSiteName] = useState('Sendika Yönetim Paneli');
  const [siteLogoUrl, setSiteLogoUrl] = useState('');
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Public sistem bilgilerini yükle
  useEffect(() => {
    const loadPublicInfo = async () => {
      try {
        const info = await getPublicSystemInfo();
        setSiteName(info.siteName);
        setSiteLogoUrl(info.siteLogoUrl);
      } catch (error) {
        console.error('Sistem bilgileri yüklenirken hata:', error);
        // Hata durumunda varsayılan değerler kullanılacak
      } finally {
        setLoadingInfo(false);
      }
    };

    loadPublicInfo();
  }, []);

  // Logo değişince hata bayrağını sıfırla
  useEffect(() => {
    setLogoLoadError(false);
  }, [siteLogoUrl, loadingInfo]);

  // Document title ve favicon'u güncelle
  useDocumentHead(
    loadingInfo ? undefined : `${siteName} | Giriş`,
    siteLogoUrl || DEFAULT_LOGO_PATH
  );

  const portfolioDemoEnabled =
    import.meta.env.VITE_PORTFOLIO_DEMO_LOGIN === 'true';
  const portfolioAutoLogin =
    import.meta.env.VITE_PORTFOLIO_AUTO_LOGIN === 'true';
  const portfolioDemoEmail =
    import.meta.env.VITE_PORTFOLIO_DEMO_EMAIL?.trim() || '';
  const portfolioDemoPassword =
    import.meta.env.VITE_PORTFOLIO_DEMO_PASSWORD || '';

  const doLogin = async (emailValue: string, passwordValue: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: emailValue.trim(), password: passwordValue });

      const state = location.state as { from?: string } | undefined;
      if (state?.from) {
        navigate(state.from, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(
        getApiErrorMessage(
          err,
          'Giriş işlemi sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol edin.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Zaten login olmuşsa dashboard'a at
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Portfolio instance: otomatik demo giriş (Mustafa domain build)
  useEffect(() => {
    if (!portfolioDemoEnabled || !portfolioAutoLogin) return;
    if (!portfolioDemoEmail || !portfolioDemoPassword) return;
    if (isAuthenticated || submitting) return;

    setEmail(portfolioDemoEmail);
    setPassword(portfolioDemoPassword);
    void doLogin(portfolioDemoEmail, portfolioDemoPassword);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca mount'ta demo giriş
  }, []);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }
    await doLogin(email, password);
  };

  const handlePortfolioDemoLogin =
    portfolioDemoEnabled && portfolioDemoEmail && portfolioDemoPassword
      ? async () => {
          setEmail(portfolioDemoEmail);
          setPassword(portfolioDemoPassword);
          await doLogin(portfolioDemoEmail, portfolioDemoPassword);
        }
      : null;

  // Yalnızca geliştirme ortamında kullanılabilir
  const handleQuickLoginAdmin = import.meta.env.DEV
    ? async () => {
        const quickEmail = import.meta.env.VITE_DEV_ADMIN_EMAIL || 'admin@sendika.local';
        const quickPassword = import.meta.env.VITE_DEV_ADMIN_PASSWORD || '123456';
        setEmail(quickEmail);
        setPassword(quickPassword);
        await doLogin(quickEmail, quickPassword);
      }
    : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
          filter: 'blur(60px)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-50%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 70%)`,
          filter: 'blur(60px)',
        },
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            width: '100%',
            maxWidth: 480,
            mx: 'auto',
            borderRadius: 4,
            boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.1)}`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {/* Logo & Header - veritabanı yoksa proje dosyasından (public/yonetim.png) */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              {loadingInfo ? (
                <CircularProgress size={40} sx={{ mb: 3 }} />
              ) : (
                <>
                  {!logoLoadError && (siteLogoUrl || DEFAULT_LOGO_PATH) ? (
                    <Avatar
                      src={
                        siteLogoUrl
                          ? (siteLogoUrl.startsWith('http://') || siteLogoUrl.startsWith('https://')
                              ? siteLogoUrl
                              : `${import.meta.env.PROD ? window.location.origin : 'http://localhost:3000'}${siteLogoUrl.startsWith('/') ? '' : '/'}${siteLogoUrl}`)
                          : DEFAULT_LOGO_PATH
                      }
                      alt={siteName}
                      sx={{
                        width: 72,
                        height: 72,
                        mx: 'auto',
                        mb: 3,
                        boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.15)}`,
                        border: `3px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      }}
                      imgProps={{
                        onError: () => {
                          if (siteLogoUrl) setSiteLogoUrl('');
                          setLogoLoadError(true);
                        },
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.4)}`,
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': {
                            transform: 'scale(1)',
                          },
                          '50%': {
                            transform: 'scale(1.05)',
                          },
                        },
                      }}
                    >
                      <SecurityIcon sx={{ fontSize: 36, color: 'white' }} />
                    </Box>
                  )}
                  <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '1.5rem', sm: '2rem' },
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {siteName}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.875rem', sm: '0.95rem' },
                      maxWidth: 360,
                      mx: 'auto',
                      lineHeight: 1.6,
                    }}
                  >
                    Yönetim paneline giriş yapmak için bilgilerinizi girin
                  </Typography>
                </>
              )}
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: 22,
                  },
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
            >
              <TextField
                label="E-posta Adresi"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                autoComplete="email"
                autoFocus
                disabled={submitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  },
                }}
              />

              <TextField
                label="Şifre"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                autoComplete="current-password"
                disabled={submitting}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        disabled={submitting}
                        sx={{
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          },
                        }}
                      >
                        {showPassword ? (
                          <VisibilityOff sx={{ fontSize: 20 }} />
                        ) : (
                          <Visibility sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                sx={{
                  mt: 1,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.45)}`,
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&.Mui-disabled': {
                    background: alpha(theme.palette.action.disabledBackground, 0.5),
                    color: alpha(theme.palette.text.disabled, 0.5),
                  },
                }}
              >
                {submitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Button>

              <Button
                variant="outlined"
                fullWidth
                size="medium"
                onClick={() => navigate('/uyelik-sorgula')}
                disabled={submitting}
                sx={{
                  mt: 0.5,
                  py: 1.1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: theme.palette.success.main,
                  borderColor: alpha(theme.palette.success.main, 0.5),
                  backgroundColor: alpha(theme.palette.success.main, 0.04),
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: theme.palette.success.main,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    transform: 'translateY(-1px)',
                  },
                  '&.Mui-disabled': {
                    color: alpha(theme.palette.text.disabled, 0.7),
                    borderColor: alpha(theme.palette.action.disabled, 0.25),
                  },
                }}
              >
                Üyelik Sorgula
              </Button>
            </Box>
            {/* Footer */}
            <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                }}
              >
                © {new Date().getFullYear()} {siteName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  mt: 0.5,
                }}
              >
                Tüm hakları saklıdır
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Alt Bilgi */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              color: alpha(theme.palette.text.primary, 0.7),
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
            }}
          >
            <SecurityIcon sx={{ fontSize: 16 }} />
            Güvenli bağlantı ile korunmaktadır
          </Typography>
        </Box>

        {portfolioDemoEnabled && handlePortfolioDemoLogin && !portfolioAutoLogin && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'primary.main',
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              textAlign: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: 'primary.main', display: 'block', mb: 1, fontWeight: 600 }}
            >
              Portfolio demo — tek tıkla giriş
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={handlePortfolioDemoLogin}
              disabled={submitting}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Demo hesabıyla giriş yap
            </Button>
          </Box>
        )}

        {/* DEV ONLY — Geliştirme ortamında hızlı giriş */}
        {import.meta.env.DEV && handleQuickLoginAdmin && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'warning.main',
              backgroundColor: alpha(theme.palette.warning.main, 0.05),
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: 'warning.dark', display: 'block', mb: 1, fontWeight: 600 }}>
              <BugReportIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
              Geliştirme Modu — Bu alan üretimde görünmez
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={handleQuickLoginAdmin}
              disabled={submitting}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Admin olarak hızlı giriş yap
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default LoginPage;
