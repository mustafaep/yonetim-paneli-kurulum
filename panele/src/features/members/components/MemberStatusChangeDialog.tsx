// src/features/members/components/MemberStatusChangeDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormHelperText,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTheme, alpha } from '@mui/material/styles';
import type { MemberStatus } from '../../../types/member';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';

interface MemberStatusChangeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (status: MemberStatus, reason?: string) => Promise<void>;
  currentStatus: MemberStatus;
  memberName: string;
  loading?: boolean;
}

const statusOptions: Array<{ value: MemberStatus; label: string; description: string }> = [
  { value: 'APPROVED', label: 'Beklemede', description: 'Üye onaylandı, aktifleşme bekliyor' },
  { value: 'ACTIVE', label: 'Aktif', description: 'Üye aktif durumda' },
  { value: 'INACTIVE', label: 'Pasif', description: 'Üye pasif durumda' },
  { value: 'RESIGNED', label: 'İstifa', description: 'Üye istifa etmiş' },
  { value: 'EXPELLED', label: 'İhraç', description: 'Üye ihraç edilmiş' },
];

const getStatusLabel = (status: MemberStatus): string => {
  return statusOptions.find(opt => opt.value === status)?.label || status;
};

const MemberStatusChangeDialog: React.FC<MemberStatusChangeDialogProps> = ({
  open,
  onClose,
  onConfirm,
  currentStatus,
  memberName,
  loading = false,
}) => {
  const theme = useTheme();
  const { getSettingValue } = useSystemSettings();
  const [selectedStatus, setSelectedStatus] = useState<MemberStatus>(currentStatus);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  const allowCancellation = getSettingValue('MEMBERSHIP_ALLOW_CANCELLATION', 'true') === 'true';

  const defaultReasonsRaw = getSettingValue('MEMBERSHIP_DEFAULT_CANCELLATION_REASONS', '');
  const presetReasons = defaultReasonsRaw
    ? defaultReasonsRaw.split(',').map((r) => r.trim()).filter((r) => r !== '')
    : [];

  const availableStatusOptions = statusOptions.filter((opt) => {
    const isCancelStatus = ['RESIGNED', 'EXPELLED', 'INACTIVE'].includes(opt.value);
    if (isCancelStatus && !allowCancellation) return false;
    return true;
  });

  useEffect(() => {
    if (open) {
      setSelectedStatus(currentStatus);
      setReason('');
      setError('');
    }
  }, [open, currentStatus]);

  const handleConfirm = async () => {
    if (selectedStatus === currentStatus) {
      setError('Lütfen mevcut durumdan farklı bir durum seçin');
      return;
    }

    // İstifa ve ihraç durumları için açıklama zorunlu
    if (['RESIGNED', 'EXPELLED'].includes(selectedStatus) && !reason.trim()) {
      setError('Lütfen durum değişikliği için bir açıklama girin');
      return;
    }

    setError('');
    try {
      await onConfirm(selectedStatus, reason.trim() || undefined);
    } catch (err) {
      // Hata yönetimi parent component'te yapılacak
    }
  };

  const requiresReason = ['RESIGNED', 'EXPELLED'].includes(selectedStatus);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <SettingsIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Üye Durumu Değiştir
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {memberName}
            </Typography>
          </Box>
        </Box>
        {!loading && (
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.5),
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Mevcut Durum: <strong>{getStatusLabel(currentStatus)}</strong>
            </Typography>
          </Box>

          {!allowCancellation && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Üyelik iptali sistem ayarlarından devre dışı bırakılmıştır.
            </Alert>
          )}

          <FormControl fullWidth error={!!error && selectedStatus === currentStatus}>
            <InputLabel>Yeni Durum</InputLabel>
            <Select
              value={selectedStatus}
              label="Yeni Durum"
              onChange={(e) => {
                setSelectedStatus(e.target.value as MemberStatus);
                setReason('');
                setError('');
              }}
              disabled={loading}
            >
              {availableStatusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {error && selectedStatus === currentStatus && (
              <FormHelperText>{error}</FormHelperText>
            )}
          </FormControl>

          {requiresReason && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {presetReasons.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Hızlı seçim:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {presetReasons.map((preset) => (
                      <Chip
                        key={preset}
                        label={preset}
                        size="small"
                        clickable
                        disabled={loading}
                        onClick={() => {
                          setReason(preset);
                          setError('');
                        }}
                        color={reason === preset ? 'primary' : 'default'}
                        variant={reason === preset ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              <TextField
                label="Açıklama"
                placeholder="Durum değişikliği için açıklama girin..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                disabled={loading}
                multiline
                rows={3}
                fullWidth
                required
                error={!!error && requiresReason && !reason.trim()}
                helperText={
                  error && requiresReason && !reason.trim()
                    ? error
                    : 'İstifa ve ihraç durumları için açıklama zorunludur'
                }
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          gap: 1,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          backgroundColor: alpha(theme.palette.background.default, 0.5),
          borderRadius: '0 0 12px 12px',
          justifyContent: 'flex-end',
          '& > *': {
            minWidth: 100,
          },
          '& > :not(style) ~ :not(style)': {
            marginLeft: 0,
          },
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: 600,
            textTransform: 'none',
            borderColor: alpha(theme.palette.divider, 0.3),
            '&:hover': {
              borderColor: theme.palette.text.secondary,
              backgroundColor: alpha(theme.palette.action.hover, 0.5),
            },
          }}
        >
          İptal
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || selectedStatus === currentStatus}
          variant="contained"
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
            '&:disabled': {
              opacity: 0.6,
            },
          }}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Güncelleniyor...' : 'Güncelle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberStatusChangeDialog;
