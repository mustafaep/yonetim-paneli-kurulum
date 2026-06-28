// src/features/profile/pages/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Stack,
  Divider,
  Avatar,
  Grid,
  Paper,
  CircularProgress,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PlaceIcon from '@mui/icons-material/Place';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuth } from '../../../app/providers/AuthContext';
import UserPermissionsSection from '../../users/components/UserPermissionsSection';
import { getUserScopes } from '../../regions/services/regionsApi';
import { logoutAllApi } from '../../auth/services/authApi';
import type { UserScope } from '../../../types/region';
import type { Role } from '../../../types/user';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [scopes, setScopes] = useState<UserScope[]>([]);
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      const result = await logoutAllApi();
      setSnackbar({ open: true, message: result.message, severity: 'success' });
      setTimeout(() => logout(), 1500);
    } catch {
      setSnackbar({ open: true, message: 'Oturumlar kapatılırken hata oluştu', severity: 'error' });
    } finally {
      setLogoutAllLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const loadScopes = async () => {
      if (!user) return;
      setLoadingScopes(true);
      try {
        const data = await getUserScopes(user.id);
        setScopes(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Kullanıcı scope alınırken hata:', e);
        setScopes([]);
      } finally {
        setLoadingScopes(false);
      }
    };

    loadScopes();
  }, [user]);

  if (!user) {
    return (
      <PageLayout>
        <Fade in timeout={600}>
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.4)} 100%)`,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            }}
          >
            <PersonIcon 
              sx={{ 
                fontSize: 80, 
                color: 'text.secondary', 
                mb: 3,
                opacity: 0.5,
              }} 
            />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              Profil Yüklenemedi
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
              Kullanıcı bilgileri yüklenemedi. Lütfen oturumunuzu yeniden başlatın.
            </Typography>
          </Paper>
        </Fade>
      </PageLayout>
    );
  }

  const roles = (user.roles ?? []) as Role[];
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <PageLayout>
      <Fade in={mounted} timeout={800}>
        <Box>
          <PageHeader
            icon={<PersonIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
            title="Profilim"
            description="Kişisel bilgileriniz ve yetki alanlarınızı görüntüleyin"
            color={theme.palette.primary.main}
            darkColor={theme.palette.primary.dark}
            lightColor={theme.palette.primary.light}
          />

          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {/* Sol Taraf - Kullanıcı Bilgileri */}
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <Zoom in={mounted} timeout={700} style={{ transitionDelay: '100ms' }}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.6)} 100%)`,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      height: { xs: 100, sm: 120 },
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 60%)',
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -50,
                        right: -50,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        background: alpha(theme.palette.primary.light, 0.2),
                      },
                    }}
                  />
                  <Box
                    sx={{
                      p: { xs: 2.5, sm: 3 },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      mt: { xs: -7, sm: -8 },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: { xs: 100, sm: 120 },
                        height: { xs: 100, sm: 120 },
                        bgcolor: '#fff',
                        color: theme.palette.primary.main,
                        fontSize: { xs: '2rem', sm: '2.5rem' },
                        fontWeight: 800,
                        border: `5px solid ${theme.palette.background.paper}`,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        mb: 2,
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                        },
                      }}
                    >
                      {initials}
                    </Avatar>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        mb: 0.5,
                        textAlign: 'center',
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                      }}
                    >
                      {user.firstName} {user.lastName}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: 'text.secondary',
                        mb: 3,
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.grey[500], 0.05),
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          color: 'primary.main',
                        },
                      }}
                    >
                      <EmailIcon sx={{ fontSize: '1.1rem' }} />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {user.email}
                      </Typography>
                    </Box>

                    <Divider sx={{ width: '100%', mb: 3 }} />

                    {/* Tüm Oturumları Kapat - Sadece Admin */}
                    {(user.roles as string[])?.includes('ADMIN') && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        fullWidth
                        startIcon={<LogoutIcon />}
                        onClick={handleLogoutAll}
                        disabled={logoutAllLoading}
                        sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}
                      >
                        {logoutAllLoading ? 'Kapatılıyor...' : 'Tüm Oturumları Kapat'}
                      </Button>
                    )}

                    {/* Roller */}
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'rotate(5deg)',
                              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                            },
                          }}
                        >
                          <AdminPanelSettingsIcon
                            sx={{
                              fontSize: '1.2rem',
                              color: theme.palette.primary.main,
                            }}
                          />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          Rollerim
                        </Typography>
                      </Box>
                      {roles.length > 0 ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {roles.map((r, idx) => (
                            <Zoom 
                              in={mounted} 
                              timeout={500} 
                              style={{ transitionDelay: `${200 + idx * 50}ms` }}
                              key={r}
                            >
                              <Chip
                                label={r}
                                size="small"
                                icon={<VerifiedUserIcon sx={{ fontSize: '0.9rem' }} />}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                  py: 1.5,
                                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                                  color: theme.palette.primary.main,
                                  border: `1.5px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                  transition: 'all 0.2s ease-in-out',
                                  '& .MuiChip-icon': {
                                    color: theme.palette.primary.main,
                                  },
                                  '&:hover': {
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.15)} 100%)`,
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    borderColor: theme.palette.primary.main,
                                  },
                                }}
                              />
                            </Zoom>
                          ))}
                        </Stack>
                      ) : (
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.5,
                            textAlign: 'center',
                            backgroundColor: alpha(theme.palette.grey[500], 0.05),
                            borderRadius: 2,
                            border: `1px dashed ${alpha(theme.palette.divider, 0.3)}`,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Henüz rol atanmadı
                          </Typography>
                        </Paper>
                      )}
                    </Box>
                  </Box>
                </Card>
              </Zoom>
            </Grid>

            {/* Sağ Taraf - Detaylar */}
            <Grid
              size={{
                xs: 12,
                md: 8
              }}>
              <Stack spacing={{ xs: 2, sm: 3 }}>
                {/* İzinler */}
                <Zoom in={mounted} timeout={700} style={{ transitionDelay: '200ms' }}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                      background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.6)} 100%)`,
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        p: { xs: 2, sm: 3 },
                        pb: 2,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.06)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: { xs: 32, sm: 40 },
                            height: { xs: 32, sm: 40 },
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 16px ${alpha(theme.palette.info.main, 0.4)}`,
                            transition: 'all 0.3s ease-in-out',
                            '&:hover': {
                              transform: 'rotate(10deg) scale(1.1)',
                              boxShadow: `0 6px 20px ${alpha(theme.palette.info.main, 0.5)}`,
                            },
                          }}
                        >
                          <BadgeIcon sx={{ color: '#fff', fontSize: { xs: '1rem', sm: '1.3rem' } }} />
                        </Box>
                        <Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 700,
                              fontSize: { xs: '1.1rem', sm: '1.25rem' },
                            }}
                          >
                            İzinlerim
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ 
                              color: 'text.secondary',
                              display: { xs: 'none', sm: 'block' },
                            }}
                          >
                            Sistemde sahip olduğunuz yetkiler
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                      <UserPermissionsSection permissions={user.permissions} />
                    </Box>
                  </Card>
                </Zoom>

                {/* Yetki Alanları */}
                <Zoom in={mounted} timeout={700} style={{ transitionDelay: '300ms' }}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                      background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.6)} 100%)`,
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        p: { xs: 2, sm: 3 },
                        pb: 2,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.06)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: { xs: 32, sm: 40 },
                            height: { xs: 32, sm: 40 },
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.4)}`,
                            transition: 'all 0.3s ease-in-out',
                            '&:hover': {
                              transform: 'rotate(-10deg) scale(1.1)',
                              boxShadow: `0 6px 20px ${alpha(theme.palette.success.main, 0.5)}`,
                            },
                          }}
                        >
                          <LocationOnIcon sx={{ color: '#fff', fontSize: { xs: '1rem', sm: '1.3rem' } }} />
                        </Box>
                        <Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 700,
                              fontSize: { xs: '1.1rem', sm: '1.25rem' },
                            }}
                          >
                            Yetkili Olduğum Bölgeler
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              display: { xs: 'none', sm: 'block' },
                            }}
                          >
                            İl, ilçe ve bayi bazında yetki alanlarınız
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                      {loadingScopes ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                          <CircularProgress size={48} thickness={4} />
                        </Box>
                      ) : scopes.length === 0 ? (
                        <Paper
                          elevation={0}
                          sx={{
                            p: { xs: 3, sm: 5 },
                            textAlign: 'center',
                            backgroundColor: alpha(theme.palette.grey[500], 0.04),
                            borderRadius: 3,
                            border: `2px dashed ${alpha(theme.palette.divider, 0.2)}`,
                          }}
                        >
                          <LocationOnIcon
                            sx={{
                              fontSize: { xs: 56, sm: 72 },
                              color: alpha(theme.palette.text.secondary, 0.3),
                              mb: 2,
                            }}
                          />
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 700, 
                              mb: 1,
                              fontSize: { xs: '1rem', sm: '1.25rem' },
                            }}
                          >
                            Bölgesel Yetki Bulunmuyor
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem' } }}
                          >
                            Herhangi bir il, ilçe veya bayi üzerinde yetkiniz bulunmamaktadır.
                          </Typography>
                        </Paper>
                      ) : (
                        <Stack spacing={{ xs: 1.5, sm: 2 }}>
                          {scopes.map((s, index) => (
                            <Fade 
                              in={mounted} 
                              timeout={500} 
                              style={{ transitionDelay: `${400 + index * 80}ms` }}
                              key={s.id}
                            >
                              <Paper
                                elevation={0}
                                sx={{
                                  p: { xs: 2, sm: 2.5 },
                                  borderRadius: 3,
                                  border: `1.5px solid ${alpha(theme.palette.divider, 0.1)}`,
                                  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.4)} 100%)`,
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: 4,
                                    height: '100%',
                                    background: `linear-gradient(180deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                                    transform: 'scaleY(0)',
                                    transformOrigin: 'bottom',
                                    transition: 'transform 0.3s ease-in-out',
                                  },
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.success.main, 0.04),
                                    borderColor: alpha(theme.palette.success.main, 0.3),
                                    boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.15)}`,
                                    transform: 'translateX(4px)',
                                    '&::before': {
                                      transform: 'scaleY(1)',
                                      transformOrigin: 'top',
                                    },
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: s.province || s.district ? 1.5 : 0,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: { xs: 24, sm: 28 },
                                      height: { xs: 24, sm: 28 },
                                      borderRadius: 1.5,
                                      background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)} 0%, ${alpha(theme.palette.success.main, 0.08)} 100%)`,
                                      border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 800,
                                        color: theme.palette.success.main,
                                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                      }}
                                    >
                                      {index + 1}
                                    </Typography>
                                  </Box>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ 
                                      fontWeight: 600, 
                                      color: 'text.secondary',
                                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                    }}
                                  >
                                    Yetki Alanı #{index + 1}
                                  </Typography>
                                </Box>

                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {s.province && (
                                    <Chip
                                      icon={<PlaceIcon sx={{ fontSize: '1rem' }} />}
                                      size="small"
                                      label={s.province.name}
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                                        py: { xs: 1.2, sm: 1.5 },
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                                        color: theme.palette.primary.main,
                                        border: `1.5px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                        transition: 'all 0.2s ease-in-out',
                                        '& .MuiChip-icon': {
                                          color: theme.palette.primary.main,
                                        },
                                        '&:hover': {
                                          background: theme.palette.primary.main,
                                          color: '#fff',
                                          transform: 'translateY(-2px)',
                                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                                          '& .MuiChip-icon': {
                                            color: '#fff',
                                          },
                                        },
                                      }}
                                    />
                                  )}

                                  {s.district && (
                                    <Chip
                                      icon={<LocationOnIcon sx={{ fontSize: '1rem' }} />}
                                      size="small"
                                      label={s.district.name}
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                                        py: { xs: 1.2, sm: 1.5 },
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.12)} 0%, ${alpha(theme.palette.info.main, 0.08)} 100%)`,
                                        color: theme.palette.info.main,
                                        border: `1.5px solid ${alpha(theme.palette.info.main, 0.25)}`,
                                        transition: 'all 0.2s ease-in-out',
                                        '& .MuiChip-icon': {
                                          color: theme.palette.info.main,
                                        },
                                        '&:hover': {
                                          background: theme.palette.info.main,
                                          color: '#fff',
                                          transform: 'translateY(-2px)',
                                          boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.4)}`,
                                          '& .MuiChip-icon': {
                                            color: '#fff',
                                          },
                                        },
                                      }}
                                    />
                                  )}
                                </Stack>
                              </Paper>
                            </Fade>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Card>
                </Zoom>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
};

export default ProfilePage;
