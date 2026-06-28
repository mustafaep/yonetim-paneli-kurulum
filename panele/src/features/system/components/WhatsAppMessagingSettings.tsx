import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Paper,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SettingsInputAntennaIcon from '@mui/icons-material/SettingsInputAntenna';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import ConnectionStatusBadge from '../../messaging/components/ConnectionStatusBadge';
import QrCodeDisplay from '../../messaging/components/QrCodeDisplay';
import {
  useConnectionStatus,
  useDisconnectInstance,
} from '../../messaging/hooks/useWhatsApp';
import { useAuth } from '../../../app/providers/AuthContext';
import { canManageWhatsAppInstance } from '../../../shared/utils/permissions';

interface WhatsAppMessagingSettingsProps {
  /** Üst kart ve başlık üst bileşende olduğunda yalnızca gövde içeriği */
  embedded?: boolean;
}

const WhatsAppMessagingSettings: React.FC<WhatsAppMessagingSettingsProps> = ({
  embedded = false,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const canInstance = canManageWhatsAppInstance(user);
  const { data: status } = useConnectionStatus();
  const disconnectMutation = useDisconnectInstance();

  const body = (
      <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.2,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.info.main, 0.06),
            border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
          }}
        >
          <SettingsInputAntennaIcon sx={{ mt: 0.2, color: theme.palette.info.main }} />
          <Typography variant="body2" color="text.secondary">
            Bu bölümde kurulan WhatsApp bağlantısı, mesajlaşma ekranındaki tüm işlemler
            için ortak kullanılır.
          </Typography>
        </Box>

        <QrCodeDisplay />

        {status?.connected && canInstance && (
          <Box sx={{ pt: 1 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Bağlantıyı kesmek, aktif WhatsApp mesajlaşma oturumunu durdurur. Tekrar kullanım
              için QR kodu yeniden taratılmalıdır.
            </Alert>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LinkOffIcon />}
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? 'Bağlantı Kesiliyor...' : 'Bağlantıyı Kes'}
            </Button>
          </Box>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Nasıl Çalışır?
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              '"Bağlantıyı Başlat" butonuna tıklayın',
              'Ekranda QR kodu görünecek',
              'Telefonunuzda WhatsApp > Ayarlar > Bağlı Cihazlar > Cihaz Bağla yolunu izleyin ve QR kodu taratın',
              'Bağlantı kurulduktan sonra mesaj gönderebilir ve alabilirsiniz',
            ].map((text, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: alpha('#25D366', 0.1),
                    color: '#25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    mt: 0.25,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha('#ff9800', 0.3)}`,
            background: alpha('#ff9800', 0.03),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <TipsAndUpdatesIcon sx={{ color: '#ff9800' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Toplu Mesaj Gonderimi Hakkinda
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Mesajlarinizin sorunsuz iletilmesi icin asagidaki onerilere dikkat edin:
            </Typography>
            {[
              'Yeni baglanan numaralarla ilk hafta toplu mesaj gondermekten kacinin. Once bireysel mesajlasarak numaranizi isitin.',
              'Sablonlarda degisken kullanin ({{firstName}}, {{registrationNumber}} gibi). Her mesajin farkli olmasi daha sagliklidir.',
              'Toplu gonderimde mesajlar arasi otomatik bekleme suresi uygulanir. Bu sure, mesajlarin guvenle iletilmesi icin gereklidir.',
              'Uyelerinizden bu numarayi rehberlerine kaydetmelerini isteyin. Kayitli numaralara mesaj gondermek cok daha guvenlidir.',
            ].map((text, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#ff9800',
                    fontWeight: 700,
                    flexShrink: 0,
                    mt: 0.1,
                  }}
                >
                  •
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>
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
          background: `linear-gradient(135deg, ${alpha('#25D366', 0.1)} 0%, ${alpha('#128C7E', 0.04)} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
        <ConnectionStatusBadge />
      </Box>

      {body}
    </Card>
  );
};

export default WhatsAppMessagingSettings;
