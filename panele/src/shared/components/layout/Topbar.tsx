// src/shared/components/layout/Topbar.tsx
// NOT: Bu component şu anda kullanılmamaktadır.
// MainLayout içinde AppBar zaten mevcut ve tüm topbar işlevselliğini sağlamaktadır.
// Eğer gelecekte farklı bir layout yapısına ihtiyaç duyulursa bu component kullanılabilir.
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  alpha,
  Avatar,
  Chip,
  useMediaQuery,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../../app/providers/AuthContext';
import NotificationCenter from '../../../features/notifications/components/NotificationCenter';

const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const initials = user
    ? `${user.firstName?.[0] ?? '}${user.lastName?.[0] ?? '}`.toUpperCase()
    : '?';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - 260px)` },
        ml: { md: '260px' },
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#ffffff',
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        {/* Sol Taraf - Kullanıcı Bilgisi */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Avatar
            sx={{
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 600,
              mr: { xs: 1.5, sm: 2 },
              boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            {initials}
          </Avatar>

          {/* Bildirim İkonu - Profil İkonunun Yanında */}
          <NotificationCenter />

          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' },
                color: theme.palette.text.primary,
                lineHeight: 1.2,
              }}
            >
              {user?.firstName} {user?.lastName}
            </Typography>

            {!isMobile && user?.roles && user.roles.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                {user.roles.slice(0, 2).map((role, index) => (
                  <Chip
                    key={index}
                    label={role}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      '& .MuiChip-label': {
                        px: 1,
                      },
                    }}
                  />
                ))}
                {user.roles.length > 2 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: '0.7rem',
                      ml: 0.5,
                    }}
                  >
                    +{user.roles.length - 2}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Sağ Taraf - Aksiyon Butonları */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {/* Çıkış Yap */}
          <IconButton
            onClick={logout}
            size="small"
            sx={{
              color: theme.palette.error.main,
              backgroundColor: alpha(theme.palette.error.main, 0.08),
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.12),
                transform: 'scale(1.05)',
              },
            }}
            title="Çıkış Yap"
          >
            <LogoutIcon fontSize={isMobile ? 'small' : 'medium'} />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;