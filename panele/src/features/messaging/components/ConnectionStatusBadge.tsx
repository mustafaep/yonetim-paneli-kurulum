import React from 'react';
import { Chip } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useConnectionStatus } from '../hooks/useWhatsApp';

function getStateInfo(state: string, connected: boolean) {
  if (connected) {
    return { label: 'Bağlı', color: '#4caf50', bg: 'rgba(76, 175, 80, 0.08)', border: 'rgba(76, 175, 80, 0.3)' };
  }
  switch (state) {
    case 'SCAN_QR_CODE':
      return { label: 'QR Bekleniyor', color: '#ff9800', bg: 'rgba(255, 152, 0, 0.08)', border: 'rgba(255, 152, 0, 0.3)' };
    case 'STARTING':
      return { label: 'Başlatılıyor', color: '#2196f3', bg: 'rgba(33, 150, 243, 0.08)', border: 'rgba(33, 150, 243, 0.3)' };
    case 'FAILED':
      return { label: 'Bağlantı Koptu', color: '#f44336', bg: 'rgba(244, 67, 54, 0.08)', border: 'rgba(244, 67, 54, 0.3)' };
    default:
      return { label: 'Bağlantı Yok', color: '#f44336', bg: 'rgba(244, 67, 54, 0.08)', border: 'rgba(244, 67, 54, 0.3)' };
  }
}

const ConnectionStatusBadge: React.FC = () => {
  const { data: status, isLoading } = useConnectionStatus();

  if (isLoading) {
    return (
      <Chip
        size="small"
        label="Kontrol ediliyor..."
        sx={{ fontSize: '0.75rem' }}
      />
    );
  }

  const connected = status?.connected ?? false;
  const state = status?.state ?? 'STOPPED';
  const info = getStateInfo(state, connected);

  return (
    <Chip
      size="small"
      icon={
        <FiberManualRecordIcon
          sx={{
            fontSize: '0.7rem !important',
            color: `${info.color} !important`,
          }}
        />
      }
      label={info.label}
      sx={{
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: info.bg,
        color: info.color,
        border: `1px solid ${info.border}`,
      }}
    />
  );
};

export default ConnectionStatusBadge;
