import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import PaymentIcon from '@mui/icons-material/Payment';
import WarningIcon from '@mui/icons-material/Warning';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { alpha, useTheme } from '@mui/material/styles';
import { getMemberPayments } from '../../payments/services/paymentsApi';
import type { MemberPayment, PaymentType } from '../../payments/services/paymentsApi';
import { activateMember } from '../services/membersApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';

interface ActivateMemberButtonProps {
  memberId: string;
  memberName: string;
  onActivated?: () => void;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  iconOnly?: boolean;
  sx?: any;
}

const getPaymentTypeLabel = (type: PaymentType): string => {
  const labels: Record<PaymentType, string> = {
    TEVKIFAT: 'Tevkifat',
    ELDEN: 'Elden',
    HAVALE: 'Havale/EFT',
  };
  return labels[type] || type;
};

const getPaymentTypeColor = (type: PaymentType): 'success' | 'info' | 'warning' => {
  const colors: Record<PaymentType, 'success' | 'info' | 'warning'> = {
    TEVKIFAT: 'success',
    ELDEN: 'info',
    HAVALE: 'warning',
  };
  return colors[type] || 'info';
};

const getMonthName = (month: number): string => {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  return months[month - 1] || month.toString();
};

export const ActivateMemberButton: React.FC<ActivateMemberButtonProps> = ({
  memberId,
  memberName,
  onActivated,
  disabled = false,
  variant = 'contained',
  size = 'large',
  fullWidth = false,
  iconOnly = false,
  sx,
}) => {
  const theme = useTheme();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payments, setPayments] = useState<MemberPayment[]>([]);

  const handleOpenDialog = async () => {
    setDialogOpen(true);
    setLoadingPayments(true);
    try {
      const paymentsData = await getMemberPayments(memberId);
      setPayments(paymentsData);
    } catch (error: unknown) {
      console.error('Kesinti bilgileri alınırken hata:', error);
      setPayments([]);
      toast.showError(getApiErrorMessage(error, 'Kesinti bilgileri yüklenirken bir hata oluştu'));
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleCloseDialog = () => {
    if (processing) return;
    setDialogOpen(false);
  };

  const handleActivate = async () => {
    setProcessing(true);
    try {
      await activateMember(memberId);
      toast.showSuccess('Üye başarıyla aktifleştirildi');
      setDialogOpen(false);
      if (onActivated) {
        onActivated();
      }
    } catch (error: unknown) {
      console.error('Üye aktifleştirilirken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Üye aktifleştirilirken bir hata oluştu'));
    } finally {
      setProcessing(false);
    }
  };

  // Toplam tutarı hesapla
  const totalAmount = payments.reduce((sum, payment) => {
    const amount = parseFloat(payment.amount) || 0;
    return sum + amount;
  }, 0);

  // Onaylanmış Kesintiler
  const approvedPayments = payments.filter(p => p.isApproved);
  const pendingPayments = payments.filter(p => !p.isApproved);

  const buttonContent = iconOnly ? (
    <Tooltip title="Üyeyi Aktifleştir" arrow placement="top">
      <span>
        <IconButton
          size="medium"
          disabled={disabled || processing}
          onClick={handleOpenDialog}
          sx={{
            width: 38,
            height: 38,
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            color: theme.palette.success.main,
            transition: 'all 0.2s ease',
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
              color: '#fff',
              transform: 'translateY(-2px)',
              boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.35)}`,
            },
            '&:disabled': {
              opacity: 0.5,
            },
            ...sx,
          }}
        >
          <PlayArrowIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <Button
      variant={variant}
      size={size}
      startIcon={<CheckCircleIcon />}
      onClick={handleOpenDialog}
      disabled={disabled || processing}
      fullWidth={fullWidth}
      sx={{
        borderRadius: 2.5,
        textTransform: 'none',
        fontWeight: 700,
        bgcolor: variant === 'contained' ? theme.palette.success.main : 'transparent',
        color: variant === 'contained' ? '#fff' : theme.palette.success.main,
        px: 3,
        py: 1.5,
        fontSize: '0.95rem',
        boxShadow: variant === 'contained' ? `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}` : 'none',
        whiteSpace: 'nowrap',
        border: variant === 'outlined' ? `2px solid ${theme.palette.success.main}` : 'none',
        '&:hover': {
          bgcolor: variant === 'contained' ? theme.palette.success.dark : alpha(theme.palette.success.main, 0.1),
          transform: 'translateY(-2px)',
          boxShadow: variant === 'contained' ? `0 8px 20px ${alpha(theme.palette.success.main, 0.4)}` : 'none',
        },
        transition: 'all 0.3s ease',
        ...sx,
      }}
    >
      {processing ? 'Aktifleştiriliyor...' : 'Üyeyi Aktifleştir'}
    </Button>
  );

  return (
    <>
      {buttonContent}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.2)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2.5,
            pt: 3,
            px: 3,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.02)} 0%, ${alpha(theme.palette.success.light, 0.01)} 100%)`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.35)}`,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: '2rem', color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
                Üyeyi Aktifleştir
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Üyeyi aktif hale getirmek istediğinizden emin misiniz?
              </Typography>
            </Box>
          </Box>
          {!processing && (
            <IconButton
              onClick={handleCloseDialog}
              size="medium"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                  color: theme.palette.error.main,
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: 3.5, pb: 3, px: 3 }}>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 3,
              lineHeight: 1.7,
              fontSize: '0.95rem',
            }}
          >
            <strong>{memberName}</strong> isimli üyeyi aktifleştirmek istediğinize emin misiniz?
            Aktifleştirildikten sonra üye <strong>aktif</strong> hale gelecek ve <strong>ana üye listesinde</strong> görünecektir.
          </Typography>

          {/* Kesinti Bilgileri - Detaylandırılmış */}
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.06)} 0%, ${alpha(theme.palette.info.light, 0.03)} 100%)`,
              border: `2px dashed ${alpha(theme.palette.info.main, 0.2)}`,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.3)}`,
                }}
              >
                <PaymentIcon sx={{ color: '#fff', fontSize: '1.2rem' }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: theme.palette.info.dark }}>
                Kesinti Bilgileri
              </Typography>
            </Box>

            {loadingPayments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
              </Box>
            ) : payments.length === 0 ? (
              <Alert
                severity="warning"
                icon={<WarningIcon />}
                sx={{
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    width: '100%',
                  },
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Bu üye henüz hiç Kesinti yapmamıştır
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Üyeyi aktifleştirmeden önce Kesinti durumunu kontrol etmeniz önerilir.
                </Typography>
              </Alert>
            ) : (
              <Box>
                {/* Özet Bilgiler */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: '#fff',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Toplam Kesinti
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.success.main }}>
                      ₺{totalAmount.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: '#fff',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Onaylanmış
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.success.main }}>
                      {approvedPayments.length} / {payments.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: '#fff',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Bekleyen
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.warning.main }}>
                      {pendingPayments.length}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Kesinti Listesi */}
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: theme.palette.text.primary }}>
                  Kesinti Detayları ({payments.length} Kesinti)
                </Typography>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Dönem</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Tutar</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Tip</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Tarih</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Durum</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {getMonthName(payment.paymentPeriodMonth)} {payment.paymentPeriodYear}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: theme.palette.success.main, fontWeight: 700 }}>
                              ₺{parseFloat(payment.amount).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getPaymentTypeLabel(payment.paymentType)}
                              size="small"
                              color={getPaymentTypeColor(payment.paymentType)}
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(payment.paymentDate).toLocaleDateString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.isApproved ? 'Onaylandı' : 'Beklemede'}
                              size="small"
                              color={payment.isApproved ? 'success' : 'warning'}
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Tevkifat Merkezi Bilgisi (varsa) */}
                {payments.some(p => p.tevkifatCenter) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Tevkifat Merkezi:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Array.from(new Set(payments.filter(p => p.tevkifatCenter).map(p => p.tevkifatCenter!.name))).map((centerName) => (
                        <Chip
                          key={centerName}
                          label={centerName}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            gap: 1.5,
            borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.8)} 0%, ${alpha(theme.palette.grey[50], 0.5)} 100%)`,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={handleCloseDialog}
            disabled={processing}
            variant="outlined"
            size="large"
            sx={{
              borderRadius: 2.5,
              px: 4,
              py: 1.25,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.95rem',
              borderWidth: '2px',
              '&:hover': {
                borderWidth: '2px',
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
              },
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleActivate}
            disabled={processing}
            variant="contained"
            size="large"
            startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            sx={{
              borderRadius: 2.5,
              px: 4,
              py: 1.25,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.95rem',
              bgcolor: theme.palette.success.main,
              boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
              '&:hover': {
                bgcolor: theme.palette.success.dark,
                boxShadow: `0 8px 20px ${alpha(theme.palette.success.main, 0.4)}`,
              },
            }}
          >
            {processing ? 'Aktifleştiriliyor...' : 'Evet, Aktifleştir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
