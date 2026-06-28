// src/shared/components/layout/ProfileMenu.tsx
import React, { useState } from 'react';
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  useTheme,
  alpha,
  Badge,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';

const ProfileMenu: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const firstName = user?.firstName?.trim() ?? '';
  const lastName = user?.lastName?.trim() ?? '';
  const hasName = Boolean(firstName || lastName);
  const isAdmin = user?.roles?.some((role) => role?.toUpperCase() === 'ADMIN') ?? false;
  const displayName = hasName ? `${firstName} ${lastName}`.trim() : isAdmin ? 'Admin' : 'Kullanıcı';

  const initials = hasName
    ? `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?'
    : displayName[0]?.toUpperCase() ?? '?';

  return (
    <>
      <IconButton
        onClick={handleOpen}
        size="small"
        sx={{
          ml: 2,
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }}
      >
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#44b700',
              color: '#44b700',
              boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
              '&::after': {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                animation: 'ripple 1.2s infinite ease-in-out',
                border: '1px solid currentColor',
                content: '""',
              },
            },
            '@keyframes ripple': {
              '0%': {
                transform: 'scale(.8)',
                opacity: 1,
              },
              '100%': {
                transform: 'scale(2.4)',
                opacity: 0,
              },
            },
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            {initials}
          </Avatar>
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 1.5,
            minWidth: 240,
            overflow: 'visible',
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            },
          },
        }}
      >
        {/* Kullanıcı Bilgisi */}
        <Box sx={{ px: 2, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                fontSize: '1rem',
                fontWeight: 600,
                mr: 1.5,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: theme.palette.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {user?.email || 'email@example.com'}
              </Typography>
              {user?.roles && user.roles.length > 0 && (
                <Box
                  sx={{
                    mt: 0.5,
                    px: 1,
                    py: 0.25,
                    display: 'inline-block',
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.primary.main,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    {user.roles[0]}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {/* Menü Öğeleri */}
        <MenuItem
          onClick={handleProfile}
          sx={{
            py: 1.25,
            px: 2,
            borderRadius: 1.5,
            mx: 1,
            my: 0.5,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              '& .MuiListItemIcon-root': {
                color: theme.palette.primary.main,
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Profilim"
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={handleLogout}
          sx={{
            py: 1.25,
            px: 2,
            borderRadius: 1.5,
            mx: 1,
            my: 0.5,
            color: theme.palette.error.main,
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.08),
              '& .MuiListItemIcon-root': {
                color: theme.palette.error.main,
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Çıkış Yap"
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ProfileMenu;