import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  Fade,
  Collapse,
  IconButton,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmsIcon from '@mui/icons-material/Sms';
import EmailIcon from '@mui/icons-material/Email';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import WhatsAppMessagingSettings from './WhatsAppMessagingSettings';
import SmsMessagingSettings from './SmsMessagingSettings';
import EmailMessagingSettings from './EmailMessagingSettings';
import ConnectionStatusBadge from '../../messaging/components/ConnectionStatusBadge';
import SmsStatusBadge from '../../messaging/components/SmsStatusBadge';
import EmailStatusBadge from '../../messaging/components/EmailStatusBadge';

const cardSx = (theme: ReturnType<typeof useTheme>) => ({
  borderRadius: 4,
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.6)} 100%)`,
  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.06)}`,
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    boxShadow: `0 12px 48px ${alpha(theme.palette.common.black, 0.1)}`,
    transform: 'translateY(-2px)',
  },
});

const MessagingSettingsSection: React.FC = () => {
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = useState({
    whatsapp: false,
    sms: false,
    email: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Fade in timeout={500}>
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('whatsapp')}
              sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 2, sm: 2.5 },
                pb: 2.5,
                cursor: 'pointer',
                userSelect: 'none',
                background: `linear-gradient(135deg, ${alpha('#25D366', 0.1)} 0%, ${alpha('#128C7E', 0.04)} 100%)`,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 200 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      backgroundColor: '#25D366',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 8px 20px ${alpha('#25D366', 0.35)}`,
                    }}
                  >
                    <WhatsAppIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      WhatsApp Mesajlaşma Ayarları
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cihaz bağlantısı, QR eşleme ve bağlantı durumu yönetimi
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <ConnectionStatusBadge />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('whatsapp');
                    }}
                    sx={{
                      width: 36,
                      height: 36,
                      border: `1px solid ${alpha('#25D366', 0.25)}`,
                      backgroundColor: theme.palette.background.paper,
                      color: '#25D366',
                      boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                      '&:hover': { backgroundColor: alpha('#25D366', 0.08) },
                    }}
                  >
                    <ExpandMoreIcon
                      sx={{
                        transform: expandedSections.whatsapp ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </IconButton>
                </Box>
              </Box>
            </Box>
            <Collapse in={expandedSections.whatsapp} timeout="auto" unmountOnExit>
              <WhatsAppMessagingSettings embedded />
            </Collapse>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('sms')}
              sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 2, sm: 2.5 },
                pb: 2.5,
                cursor: 'pointer',
                userSelect: 'none',
                background: `linear-gradient(135deg, ${alpha('#e53e3e', 0.1)} 0%, ${alpha('#c53030', 0.04)} 100%)`,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 200 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      backgroundColor: '#e53e3e',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 8px 20px ${alpha('#e53e3e', 0.35)}`,
                    }}
                  >
                    <SmsIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      SMS Mesajlaşma Ayarları
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      NetGSM API bağlantı durumu
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <SmsStatusBadge forceInactive />
                  <Chip label="NetGSM" size="small" sx={{ bgcolor: alpha('#e53e3e', 0.1), color: '#e53e3e' }} />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('sms');
                    }}
                    sx={{
                      width: 36,
                      height: 36,
                      border: `1px solid ${alpha('#e53e3e', 0.25)}`,
                      backgroundColor: theme.palette.background.paper,
                      color: '#e53e3e',
                      boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                      '&:hover': { backgroundColor: alpha('#e53e3e', 0.08) },
                    }}
                  >
                    <ExpandMoreIcon
                      sx={{
                        transform: expandedSections.sms ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </IconButton>
                </Box>
              </Box>
            </Box>
            <Collapse in={expandedSections.sms} timeout="auto" unmountOnExit>
              <SmsMessagingSettings embedded />
            </Collapse>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('email')}
              sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 2, sm: 2.5 },
                pb: 2.5,
                cursor: 'pointer',
                userSelect: 'none',
                background: `linear-gradient(135deg, ${alpha('#3182ce', 0.1)} 0%, ${alpha('#2b6cb0', 0.04)} 100%)`,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 200 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      backgroundColor: '#3182ce',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 8px 20px ${alpha('#3182ce', 0.35)}`,
                    }}
                  >
                    <EmailIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      E-posta Mesajlaşma Ayarları
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      AWS SES bağlantı durumu
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <EmailStatusBadge forceInactive />
                  <Chip label="AWS SES" size="small" sx={{ bgcolor: alpha('#3182ce', 0.1), color: '#3182ce' }} />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('email');
                    }}
                    sx={{
                      width: 36,
                      height: 36,
                      border: `1px solid ${alpha('#3182ce', 0.25)}`,
                      backgroundColor: theme.palette.background.paper,
                      color: '#3182ce',
                      boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                      '&:hover': { backgroundColor: alpha('#3182ce', 0.08) },
                    }}
                  >
                    <ExpandMoreIcon
                      sx={{
                        transform: expandedSections.email ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </IconButton>
                </Box>
              </Box>
            </Box>
            <Collapse in={expandedSections.email} timeout="auto" unmountOnExit>
              <EmailMessagingSettings embedded />
            </Collapse>
          </Card>
        </Grid>
      </Grid>
    </Fade>
  );
};

export default MessagingSettingsSection;
