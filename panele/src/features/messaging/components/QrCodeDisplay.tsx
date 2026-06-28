import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Alert,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import {
  useConnectionStatus,
  useConnectInstance,
  useQrCode,
} from '../hooks/useWhatsApp';
import { useAuth } from '../../../app/providers/AuthContext';
import { canManageWhatsAppInstance } from '../../../shared/utils/permissions';

const QrCodeDisplay: React.FC = () => {
  const { user } = useAuth();
  const canInstance = canManageWhatsAppInstance(user);
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
  } = useConnectionStatus();
  const connectMutation = useConnectInstance();

  const connected = status?.connected ?? false;
  const sessionState = status?.state ?? 'STOPPED';
  const needsQr = sessionState === 'SCAN_QR_CODE';

  // QR polling: sadece session SCAN_QR_CODE durumundayken aktif
  const { data: qrData } = useQrCode(needsQr);

  const [initialQr, setInitialQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Connect mutation'dan gelen QR'ı sakla
  const handleConnect = useCallback(() => {
    setError(null);
    setInitialQr(null);
    setConnecting(true);
    connectMutation.mutate(undefined, {
      onSuccess: (data) => {
        setConnecting(false);
        if (data?.qr?.base64) {
          setInitialQr(data.qr.base64);
        }
        // QR gelmese bile sorun yok - polling devralacak
      },
      onError: (err: any) => {
        setConnecting(false);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Bağlantı başlatılamadı';
        setError(msg);
      },
    });
  }, [connectMutation]);

  // Bağlantı kurulunca QR state'ini temizle
  useEffect(() => {
    if (connected) {
      setInitialQr(null);
      setConnecting(false);
    }
  }, [connected]);

  // En güncel QR: polling'den gelen veya initial
  const currentQr = qrData?.base64 || initialQr;

  if (statusLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Bağlı
  if (connected) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 2,
          border: '1px solid rgba(76, 175, 80, 0.3)',
          backgroundColor: 'rgba(76, 175, 80, 0.04)',
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#2e7d32' }}>
          WhatsApp Bağlı
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          WhatsApp hesabınız başarıyla bağlı. Mesaj gönderebilir ve
          alabilirsiniz.
        </Typography>
      </Paper>
    );
  }

  // QR gösterimi (SCAN_QR_CODE durumunda veya connect'ten sonra)
  if (currentQr) {
    if (!canInstance) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            QR kodunu görüntülemek veya yenilemek için &quot;WhatsApp — Bağlantı (QR / oturum)&quot; izni
            gerekir.
          </Typography>
        </Paper>
      );
    }
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'inline-block',
            p: 2,
            borderRadius: 2,
            backgroundColor: '#fff',
            border: '1px solid',
            borderColor: 'divider',
            mb: 2,
          }}
        >
          <img
            src={currentQr}
            alt="WhatsApp QR Code"
            style={{ width: 260, height: 260, display: 'block' }}
          />
        </Box>
        <Typography
          variant="caption"
          display="block"
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          WhatsApp &gt; Ayarlar &gt; Bağlı Cihazlar &gt; Cihaz Bağla
        </Typography>
        <Typography
          variant="caption"
          display="block"
          sx={{ color: 'text.disabled', mb: 2 }}
        >
          QR kodu otomatik olarak yenilenir
        </Typography>
        {canInstance && (
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? 'Yenileniyor...' : 'Yeni QR Kodu Al'}
          </Button>
        )}
      </Paper>
    );
  }

  // Bağlantı başlatma ekranı (STOPPED, FAILED, veya ilk açılış)
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: 'center',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <WhatsAppIcon sx={{ fontSize: 48, color: '#25D366', mb: 2 }} />
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        WhatsApp'a Bağlan
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 3, maxWidth: 440, mx: 'auto' }}
      >
        QR kodu taratarak bu paneli WhatsApp hesabınıza bağlayın.
      </Typography>

      {sessionState === 'FAILED' && (
        <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
          WhatsApp bağlantısı kopmuş. "Bağlantıyı Başlat" ile yeniden
          bağlanabilirsiniz.
        </Alert>
      )}

      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 2, textAlign: 'left' }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {statusError && (
        <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
          WAHA servisine bağlanılamadı. Docker container'ın çalıştığından emin
          olun.
        </Alert>
      )}

      {canInstance ? (
        <Button
          variant="contained"
          startIcon={
            connecting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <QrCode2Icon />
            )
          }
          onClick={handleConnect}
          disabled={connecting}
          sx={{
            backgroundColor: '#25D366',
            '&:hover': { backgroundColor: '#128C7E' },
          }}
        >
          {connecting ? 'Bağlanıyor...' : 'Bağlantıyı Başlat'}
        </Button>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
          Oturum başlatmak veya QR almak için rolünüze &quot;WhatsApp — Bağlantı (QR / oturum)&quot; izni
          atanmalıdır.
        </Typography>
      )}
    </Paper>
  );
};

export default QrCodeDisplay;
