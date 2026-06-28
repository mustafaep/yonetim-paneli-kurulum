import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
  Alert,
  useTheme,
  alpha,
  CircularProgress,
  Container,
  Avatar,
  InputAdornment,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BadgeIcon from '@mui/icons-material/Badge';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPublicSystemInfo } from '../../system/services/systemApi';
import { useDocumentHead } from '../../../shared/hooks/useDocumentHead';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { DEFAULT_LOGO_PATH } from '../../../shared/constants/defaultLogo';
import { postPublicMembershipInquiry } from '../services/publicMembershipApi';

function formatMemberSinceTr(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const MembershipInquiryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const [siteName, setSiteName] = useState('Sendika Yönetim Paneli');
  const [siteLogoUrl, setSiteLogoUrl] = useState('');
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [tc, setTc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { isMember: true; memberSince: string }
    | { isMember: false }
    | null
  >(null);

  useEffect(() => {
    const load = async () => {
      try {
        const info = await getPublicSystemInfo();
        setSiteName(info.siteName);
        setSiteLogoUrl(info.siteLogoUrl);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingInfo(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setLogoLoadError(false);
  }, [siteLogoUrl, loadingInfo]);

  useDocumentHead(
    loadingInfo ? undefined : `${siteName} | Üyelik sorgulama`,
    siteLogoUrl || DEFAULT_LOGO_PATH,
  );

  const handleTcChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    setTc(digits);
    setResult(null);
    setError(null);
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (tc.length !== 11) {
      setError('TC Kimlik Numarası 11 haneli olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      const urlToken = searchParams.get('token')?.trim();
      const envToken = import.meta.env.VITE_MEMBERSHIP_INQUIRY_TOKEN?.trim();
      const inquiryToken = urlToken || envToken || undefined;
      const data = await postPublicMembershipInquiry(tc, inquiryToken);
      if (data.isMember && data.memberSince) {
        setResult({ isMember: true, memberSince: data.memberSince });
      } else {
        setResult({ isMember: false });
      }
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Sorgu sırasında bir hata oluştu. Lütfen tekrar deneyin.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

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
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              {loadingInfo ? (
                <CircularProgress size={40} sx={{ mb: 3 }} />
              ) : (
                <>
                  {!logoLoadError && (siteLogoUrl || DEFAULT_LOGO_PATH) ? (
                    <Avatar
                      src={
                        siteLogoUrl
                          ? siteLogoUrl.startsWith('http://') ||
                            siteLogoUrl.startsWith('https://')
                            ? siteLogoUrl
                            : `${import.meta.env.PROD ? window.location.origin : 'http://localhost:3000'}${siteLogoUrl.startsWith('/') ? '' : '/'}${siteLogoUrl}`
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
                    Üyelik sorgulama
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
                    TC Kimlik Numaranızı girerek aktif üyelik durumunuzu
                    doğrulayabilirsiniz. Ad, soyad gibi kişisel bilgiler
                    gösterilmez.
                  </Typography>
                </>
              )}
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 2 }}
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
                label="TC Kimlik Numarası"
                value={tc}
                onChange={(e) => handleTcChange(e.target.value)}
                fullWidth
                autoComplete="off"
                autoFocus
                disabled={submitting}
                placeholder="11 hane"
                inputProps={{
                  inputMode: 'numeric',
                  maxLength: 11,
                  'aria-label': 'TC Kimlik Numarası',
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: theme.palette.text.secondary }} />
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
                startIcon={
                  submitting ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <SearchIcon />
                  )
                }
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
                    background: alpha(
                      theme.palette.action.disabledBackground,
                      0.5,
                    ),
                    color: alpha(theme.palette.text.disabled, 0.5),
                  },
                }}
              >
                {submitting ? 'Sorgulanıyor...' : 'Sorgula'}
              </Button>

              <Button
                variant="outlined"
                fullWidth
                size="medium"
                onClick={() => navigate('/login')}
                disabled={submitting}
                sx={{
                  py: 1.1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  borderColor: alpha(theme.palette.text.secondary, 0.35),
                  backgroundColor: alpha(theme.palette.text.secondary, 0.02),
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  },
                }}
              >
                Giriş Sayfasına Dön
              </Button>
            </Box>

            {result?.isMember === true && (
              <Box
                sx={{
                  mt: 3,
                  px: 2.5,
                  py: 3,
                  borderRadius: 3,
                  textAlign: 'center',
                  border: `2px solid ${theme.palette.success.main}`,
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.2)}`,
                }}
              >
                <CheckCircleOutlineIcon
                  sx={{
                    fontSize: 48,
                    color: theme.palette.success.dark,
                    mb: 1,
                  }}
                />
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.success.dark,
                    fontSize: { xs: '1.05rem', sm: '1.2rem' },
                    lineHeight: 1.5,
                  }}
                >
                  Aktif üyesiniz
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    mt: 1,
                    fontWeight: 600,
                    color: theme.palette.success.main,
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                  }}
                >
                  {formatMemberSinceTr(result.memberSince)} tarihinden beri
                  üyeliğiniz geçerlidir.
                </Typography>
              </Box>
            )}

            {result?.isMember === false && (
              <Box
                sx={{
                  mt: 3,
                  px: 2.5,
                  py: 3,
                  borderRadius: 3,
                  textAlign: 'center',
                  border: `2px solid ${theme.palette.error.main}`,
                  backgroundColor: alpha(theme.palette.error.main, 0.08),
                  boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.18)}`,
                }}
              >
                <PersonOffIcon
                  sx={{
                    fontSize: 48,
                    color: theme.palette.error.main,
                    mb: 1,
                  }}
                />
                <Typography
                  variant="h6"
                  component="p"
                  sx={{
                    fontWeight: 800,
                    color: theme.palette.error.main,
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    letterSpacing: 0.2,
                  }}
                >
                  Üye değildir
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    color: theme.palette.error.dark,
                    fontWeight: 500,
                    maxWidth: 320,
                    mx: 'auto',
                  }}
                >
                  Bu TC kimlik numarası ile kayıtlı aktif üyelik bulunmamaktadır.
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                mt: 4,
                pt: 3,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
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
      </Container>
    </Box>
  );
};

export default MembershipInquiryPage;
