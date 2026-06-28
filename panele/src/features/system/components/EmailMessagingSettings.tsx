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
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import EmailStatusBadge from '../../messaging/components/EmailStatusBadge';

const ENV_KEYS = [
  { key: 'AWS_SES_ACCESS_KEY_ID', description: 'AWS IAM Access Key ID' },
  { key: 'AWS_SES_SECRET_ACCESS_KEY', description: 'AWS IAM Secret Access Key' },
  { key: 'AWS_SES_REGION', description: 'AWS bölgesi (örn. eu-central-1)' },
  {
    key: 'AWS_SES_FROM_EMAIL',
    description: 'SES\'te doğrulanmış gönderen e-posta adresi',
  },
];

interface EmailMessagingSettingsProps {
  embedded?: boolean;
}

const EmailMessagingSettings: React.FC<EmailMessagingSettingsProps> = ({ embedded = false }) => {
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
            Güvenlik gereği AWS SES kimlik bilgileri yalnızca sunucunun{' '}
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
                    color: '#3182ce',
                    minWidth: 220,
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
          background: `linear-gradient(135deg, ${alpha('#3182ce', 0.1)} 0%, ${alpha('#2b6cb0', 0.04)} 100%)`,
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
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            E-posta Mesajlaşma Ayarları
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AWS SES bağlantı durumu
          </Typography>
        </Box>
        <EmailStatusBadge forceInactive />
        <Chip
          label="AWS SES"
          size="small"
          sx={{ bgcolor: alpha('#3182ce', 0.1), color: '#3182ce' }}
        />
      </Box>

      {body}
    </Card>
  );
};

export default EmailMessagingSettings;
