import React from 'react';
import { Chip } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useQuery } from '@tanstack/react-query';
import { getSmsStatus } from '../services/smsApi';

const INACTIVE_SX = {
  fontSize: '0.75rem',
  fontWeight: 600,
  backgroundColor: 'rgba(244, 67, 54, 0.08)',
  color: '#f44336',
  border: '1px solid rgba(244, 67, 54, 0.3)',
} as const;

const SmsStatusBadge: React.FC<{ forceInactive?: boolean }> = ({ forceInactive }) => {
  const { data: status, isLoading } = useQuery({
    queryKey: ['smsStatus'],
    queryFn: getSmsStatus,
    refetchInterval: 60_000,
    enabled: !forceInactive,
  });

  if (forceInactive) {
    return (
      <Chip
        size="small"
        icon={
          <FiberManualRecordIcon
            sx={{ fontSize: '0.7rem !important', color: '#f44336 !important' }}
          />
        }
        label="Aktif Değildir"
        sx={INACTIVE_SX}
      />
    );
  }

  if (isLoading) {
    return <Chip size="small" label="Kontrol ediliyor..." sx={{ fontSize: '0.75rem' }} />;
  }

  const configured = status?.configured ?? false;
  const color = configured ? '#4caf50' : '#f44336';
  const bg = configured ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)';
  const border = configured ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
  const label = configured ? 'Aktif' : 'Aktif Değildir';

  return (
    <Chip
      size="small"
      icon={
        <FiberManualRecordIcon
          sx={{ fontSize: '0.7rem !important', color: `${color} !important` }}
        />
      }
      label={label}
      sx={{
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
      }}
    />
  );
};

export default SmsStatusBadge;
