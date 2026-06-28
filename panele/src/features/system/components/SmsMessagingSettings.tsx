import React from 'react';
import {
  Box,
  Card,
  Typography,
  Alert,
  alpha,
  useTheme,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import SmsIcon from '@mui/icons-material/Sms';
import LockIcon from '@mui/icons-material/Lock';
import SmsStatusBadge from '../../messaging/components/SmsStatusBadge';

const ENV_KEYS = [
  { key: 'NETGSM_USERNAME', description: 'NetGSM kullanıcı adı' },
  { key: 'NETGSM_PASSWORD', description: 'NetGSM şifresi' },
  { key: 'NETGSM_MSG_HEADER', description: 'Kayıtlı mesaj başlığı (header)' },
  {
    key: 'NETGSM_API_URL',
    description:
      'API adresi (opsiyonel, varsayılan: https://api.netgsm.com.tr/sms/send/get)',
  },
];

interface SmsMessagingSettingsProps {
  embedded?: boolean;
}

const SmsMessagingSettings: React.FC<SmsMessagingSettingsProps> = ({ embedded = false }) => {
  const theme = useTheme();

  const body = (
      <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Alert
          severity="info"
          icon={<LockIcon />}
          sx={{
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Güvenlik gereği NetGSM kimlik bilgileri yalnızca sunucunun{' '}
            <code>.env</code> dosyasından yönetilir.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Arayüzden düzenleme kapalıdır. Değişiklik yapmak için sunucuya bağlanıp{' '}
            <code>backend/.env</code> dosyasını güncelleyin ve uygulamayı yeniden
            başlatın.
          </Typography>
        </Alert>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Gerekli .env anahtarları
          </Typography>
          <Stack spacing={1.25}>
            {ENV_KEYS.map((item) => (
              <Box
                key={item.key}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: { xs: 0.5, sm: 1.5 },
                  p: 1.25,
                  borderRadius: 1.5,
                  backgroundColor: alpha(theme.palette.action.hover, 0.04),
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                }}
              >
                <Box
                  component="code"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#e53e3e',
                    minWidth: 180,
                  }}
                >
                  {item.key}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {item.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>
  );

  if (embedded) {
    return body;
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        boxShadow: `0 8px 30px ${alpha(theme.palette.common.black, 0.06)}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: `linear-gradient(135deg, ${alpha('#e53e3e', 0.1)} 0%, ${alpha('#c53030', 0.04)} 100%)`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
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
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            SMS Mesajlaşma Ayarları
          </Typography>
          <Typography variant="body2" color="text.secondary">
            NetGSM API bağlantı durumu
          </Typography>
        </Box>
        <SmsStatusBadge forceInactive />
        <Chip
          label="NetGSM"
          size="small"
          sx={{ bgcolor: alpha('#e53e3e', 0.1), color: '#e53e3e' }}
        />
      </Box>

      {body}
    </Card>
  );
};

export default SmsMessagingSettings;
