// src/features/accounting/components/DeleteTevkifatCenterDialog.tsx
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteTevkifatCenter, type DeleteTevkifatCenterDto, type TevkifatCenter } from '../services/accountingApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';

interface DeleteTevkifatCenterDialogProps {
  open: boolean;
  onClose: () => void;
  center: {
    id: string;
    name: string;
    memberCount?: number;
  } | null;
  availableCenters: TevkifatCenter[];
  loadingCenters?: boolean;
  onSuccess?: () => void;
}

const DeleteTevkifatCenterDialog: React.FC<DeleteTevkifatCenterDialogProps> = ({
  open,
  onClose,
  center,
  availableCenters,
  loadingCenters = false,
  onSuccess,
}) => {
  const theme = useTheme();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState<DeleteTevkifatCenterDto['memberActionType']>('REMOVE_TEVKIFAT_CENTER');
  const [deleteTargetTevkifatCenterId, setDeleteTargetTevkifatCenterId] = useState<string>('');

  // Hedef tevkifat merkezi seçimi için kullanılabilir merkezler (mevcut merkez hariç ve sadece aktifler)
  const availableTevkifatCenters = useMemo(() => {
    return availableCenters.filter(
      (c) => c.id !== center?.id && c.isActive
    );
  }, [availableCenters, center?.id]);

  const handleDelete = async () => {
    if (!center) return;

    // Transfer seçenekleri için hedef merkez kontrolü
    if (
      (deleteActionType === 'TRANSFER_TO_TEVKIFAT_CENTER' ||
        deleteActionType === 'TRANSFER_AND_CANCEL') &&
      !deleteTargetTevkifatCenterId
    ) {
      toast.showError('Lütfen hedef tevkifat merkezi seçin');
      return;
    }

    setDeleting(true);
    try {
      const dto: DeleteTevkifatCenterDto = {
        memberActionType: deleteActionType,
        ...(deleteTargetTevkifatCenterId && { targetTevkifatCenterId: deleteTargetTevkifatCenterId }),
      };
      await deleteTevkifatCenter(center.id, dto);
      toast.showSuccess('Tevkifat merkezi kaldırıldı');
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (e: unknown) {
      console.error('Tevkifat merkezi silinirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Tevkifat merkezi silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (deleting) return;
    setDeleteActionType('REMOVE_TEVKIFAT_CENTER');
    setDeleteTargetTevkifatCenterId('');
    onClose();
  };

  if (!center) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: `0 8px 32px ${alpha(theme.palette.warning.main, 0.15)}`,
        },
      }}
    >
      <DialogTitle 
        sx={{ 
          pb: 1,
          pt: 3,
          px: 3,
          fontSize: '1.5rem',
          fontWeight: 700,
          color: theme.palette.error.main,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
            }}
          >
            <DeleteIcon />
          </Box>
          Tevkifat Merkezini Kaldır
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, px: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              "{center.name}" adlı tevkifat merkezini kaldırmak istediğinize emin misiniz?
            </Typography>
            <Typography variant="body2">
              Bu tevkifat merkezine bağlı {center.memberCount || 0} üye bulunmaktadır. 
              Tevkifat merkezini kaldırmadan önce üyelere ne yapılacağını seçmeniz gerekmektedir.
            </Typography>
          </Alert>

          <Box>
            <FormLabel sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.95rem', display: 'block' }}>
              Üyelere Ne Yapılacak?
            </FormLabel>
            <RadioGroup
              value={deleteActionType}
              onChange={(e) => setDeleteActionType(e.target.value as DeleteTevkifatCenterDto['memberActionType'])}
              sx={{ gap: 1 }}
            >
              <FormControlLabel
                value="REMOVE_TEVKIFAT_CENTER"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Tevkifat Merkezi Bilgisini Kaldır
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Üyelerin tevkifat merkezi bilgisi kaldırılacak (null yapılacak), durumları değişmeyecek
                    </Typography>
                  </Box>
                }
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  p: 1.5,
                  m: 0,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              />
              <FormControlLabel
                value="TRANSFER_TO_TEVKIFAT_CENTER"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Başka Bir Tevkifat Merkezine Taşı
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Üyeler seçilen tevkifat merkezine taşınacak, durumları değişmeyecek
                    </Typography>
                  </Box>
                }
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  p: 1.5,
                  m: 0,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              />
              <FormControlLabel
                value="TRANSFER_AND_CANCEL"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Başka Bir Tevkifat Merkezine Taşı ve İptal Et
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Üyeler seçilen tevkifat merkezine taşınacak ve üyelikleri iptal edilecek (İstifa)
                    </Typography>
                  </Box>
                }
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  p: 1.5,
                  m: 0,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.04),
                  },
                }}
              />
            </RadioGroup>
          </Box>

          {(deleteActionType === 'TRANSFER_TO_TEVKIFAT_CENTER' ||
            deleteActionType === 'TRANSFER_AND_CANCEL') && (
            <>
              <Divider />
              <FormControl fullWidth required>
                <InputLabel>Hedef Tevkifat Merkezi</InputLabel>
                <Select
                  value={deleteTargetTevkifatCenterId}
                  onChange={(e) => setDeleteTargetTevkifatCenterId(e.target.value)}
                  label="Hedef Tevkifat Merkezi"
                  disabled={deleting}
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(theme.palette.divider, 0.2),
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Hedef tevkifat merkezi seçin</em>
                  </MenuItem>
                  {loadingCenters ? (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Yükleniyor...
                    </MenuItem>
                  ) : availableTevkifatCenters.length === 0 ? (
                    <MenuItem disabled>
                      Kullanılabilir tevkifat merkezi bulunamadı
                    </MenuItem>
                  ) : (
                    availableTevkifatCenters.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                        {c.memberCount !== undefined && ` (${c.memberCount} üye)`}
                      </MenuItem>
                    ))
                  )}
                </Select>
                <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
                  Üyeler bu tevkifat merkezine taşınacaktır
                </Alert>
              </FormControl>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
        <Button 
          onClick={handleClose} 
          disabled={deleting}
          sx={{ 
            borderRadius: 2,
            px: 3,
            fontWeight: 600,
          }}
        >
          İptal
        </Button>
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          disabled={
            deleting || 
            (deleteActionType !== 'REMOVE_TEVKIFAT_CENTER' && 
             !deleteTargetTevkifatCenterId)
          }
          startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          sx={{
            borderRadius: 2,
            px: 3,
            fontWeight: 600,
            boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(theme.palette.error.main, 0.4)}`,
            },
          }}
        >
          {deleting ? 'Kaldırılıyor...' : 'Kaldır'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteTevkifatCenterDialog;
