// src/pages/payments/PaymentDetailPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentIcon from '@mui/icons-material/Payment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import {
  getPaymentById,
  updatePayment,
  deletePayment,
  uploadPaymentDocument,
  fetchPaymentDocumentBlob,
  downloadPaymentDocument,
  type MemberPayment,
  type PaymentType,
  type UpdateMemberPaymentDto,
} from '../services/paymentsApi';
import { getTevkifatCenters } from '../../accounting/services/accountingApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { DraftPdfCanvasPreview } from '../../documents/components/DraftPdfCanvasPreview';

const PaymentDetailPage: React.FC = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [payment, setPayment] = useState<MemberPayment | null>(null);
  const [loading, setLoading] = useState(true);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [tevkifatCenters, setTevkifatCenters] = useState<Array<{ id: string; name: string }>>([]);
  const [editForm, setEditForm] = useState<UpdateMemberPaymentDto>({
    amount: '',
    paymentPeriodMonth: new Date().getMonth() + 1,
    paymentPeriodYear: new Date().getFullYear(),
    paymentType: 'TEVKIFAT',
    tevkifatCenterId: '',
    description: '',
  });

  const [paymentPdfViewerOpen, setPaymentPdfViewerOpen] = useState(false);
  const [paymentPdfBlobUrl, setPaymentPdfBlobUrl] = useState<string | null>(null);
  const [paymentPdfTitle, setPaymentPdfTitle] = useState('');
  const [loadingPaymentPdf, setLoadingPaymentPdf] = useState(false);
  const [downloadingDocument, setDownloadingDocument] = useState(false);

  const canView = hasPermission('MEMBER_PAYMENT_VIEW');
  const canEdit = hasPermission('MEMBER_PAYMENT_UPDATE') || hasPermission('MEMBER_PAYMENT_ADD');
  const canDelete = hasPermission('MEMBER_PAYMENT_DELETE') || hasPermission('MEMBER_PAYMENT_ADD');

  useEffect(() => {
    if (id && canView) {
      loadPayment();
    }
  }, [id, canView]);

  useEffect(() => {
    if (canEdit) {
      loadTevkifatCenters();
    }
  }, [canEdit]);

  const loadPayment = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getPaymentById(id);
      setPayment(data);
      if (canEdit) {
        setEditForm({
          amount: data.amount,
          paymentPeriodMonth: data.paymentPeriodMonth,
          paymentPeriodYear: data.paymentPeriodYear,
          paymentType: data.paymentType,
          tevkifatCenterId: data.tevkifatCenterId || '',
          description: data.description || '',
        });
      }
    } catch (e: unknown) {
      console.error('Kesinti detayı alınırken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kesinti detayı alınamadı'));
    } finally {
      setLoading(false);
    }
  };

  const loadTevkifatCenters = async () => {
    try {
      const data = await getTevkifatCenters({ activeOnly: true });
      setTevkifatCenters(data.map((c) => ({ id: c.id, name: c.name })));
    } catch (e) {
      console.error('Tevkifat merkezleri yüklenirken hata:', e);
    }
  };

  const handleOpenEdit = () => {
    if (!payment) return;
    setEditForm({
      amount: payment.amount,
      paymentPeriodMonth: payment.paymentPeriodMonth,
      paymentPeriodYear: payment.paymentPeriodYear,
      paymentType: payment.paymentType,
      tevkifatCenterId: payment.tevkifatCenterId || '',
      description: payment.description || '',
    });
    setDocumentFile(null);
    setEditDialogOpen(true);
  };

  const closePaymentPdfViewer = useCallback(() => {
    setPaymentPdfViewerOpen(false);
    setLoadingPaymentPdf(false);
    setPaymentPdfBlobUrl((prev) => {
      if (prev) window.URL.revokeObjectURL(prev);
      return null;
    });
    setPaymentPdfTitle('');
  }, []);

  const handleViewDocument = async () => {
    if (!payment?.documentUrl) {
      toast.showError('Bu kesinti için belge bulunmamaktadır.');
      return;
    }
    const urlParts = payment.documentUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'Kesinti belgesi';
    setPaymentPdfTitle(fileName);
    setPaymentPdfViewerOpen(true);
    setLoadingPaymentPdf(true);
    setPaymentPdfBlobUrl((prev) => {
      if (prev) window.URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const blob = await fetchPaymentDocumentBlob(payment.id);
      setPaymentPdfBlobUrl(window.URL.createObjectURL(blob));
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Belge görüntülenemedi'));
      closePaymentPdfViewer();
    } finally {
      setLoadingPaymentPdf(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!payment?.documentUrl) {
      toast.showError('Bu kesinti için belge bulunmamaktadır.');
      return;
    }
    const urlParts = payment.documentUrl.split('/');
    const suggestedName = urlParts[urlParts.length - 1] || undefined;
    setDownloadingDocument(true);
    try {
      await downloadPaymentDocument(payment.id, suggestedName);
      toast.showSuccess('Belge indirildi');
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Belge indirilemedi'));
    } finally {
      setDownloadingDocument(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!payment) return;

    if (!editForm.amount || Number(editForm.amount) <= 0) {
      toast.showWarning('Lütfen geçerli bir tutar girin.');
      return;
    }

    if (editForm.paymentType === 'TEVKIFAT' && !editForm.tevkifatCenterId) {
      toast.showWarning('Lütfen tevkifat merkezi seçin.');
      return;
    }

    setSaving(true);
    try {
      let updatedForm: UpdateMemberPaymentDto = { ...editForm };

      if (documentFile && payment.memberId) {
        setUploadingDocument(true);
        try {
          const uploadResult = await uploadPaymentDocument(
            documentFile,
            payment.memberId,
            editForm.paymentPeriodMonth || payment.paymentPeriodMonth,
            editForm.paymentPeriodYear || payment.paymentPeriodYear,
            documentFile.name,
          );
          updatedForm.documentUrl = uploadResult.fileUrl;
        } catch (uploadError: unknown) {
          console.error('PDF yüklenirken hata:', uploadError);
          toast.showError(getApiErrorMessage(uploadError, 'PDF yüklenirken bir hata oluştu'));
          setUploadingDocument(false);
          setSaving(false);
          return;
        } finally {
          setUploadingDocument(false);
        }
      }

      await updatePayment(payment.id, updatedForm);
      toast.showSuccess('Kesinti başarıyla güncellendi');
      setEditDialogOpen(false);
      setDocumentFile(null);
      await loadPayment();
    } catch (e: unknown) {
      console.error('Kesinti güncellenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kesinti güncellenirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!payment) return;
    setDeleting(true);
    try {
      await deletePayment(payment.id);
      toast.showSuccess('Kesinti başarıyla silindi');
      setDeleteDialogOpen(false);
      navigate('/payments');
    } catch (e: unknown) {
      console.error('Kesinti silinirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kesinti silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };


  const monthNames = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];

  const paymentTypeLabels: Record<PaymentType, string> = {
    TEVKIFAT: 'Tevkifat',
    ELDEN: 'Elden',
    HAVALE: 'Havale',
  };

  const memberFullName =
    payment?.member?.firstName && payment?.member?.lastName
      ? `${payment.member.firstName} ${payment.member.lastName}`
      : payment?.createdByUser
      ? `${payment.createdByUser.firstName} ${payment.createdByUser.lastName}`
      : '-';

  if (!canView) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">Bu sayfaya erişim yetkiniz bulunmamaktadır.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!payment) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Kesinti bulunamadı</Alert>
      </Box>
    );
  }

  return (
    <PageLayout>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/payments')}
          sx={{ 
            mb: 2,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1,
          }}
        >
          Geri Dön
        </Button>
      </Box>
      {/* Modern Header Card */}
      <PageHeader
        icon={<PaymentIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Kesinti Detayı"
        description={
          payment
            ? `${memberFullName} - ${paymentTypeLabels[payment.paymentType]} - ${payment.amount} TL`
            : 'Kesinti detay bilgileri'
        }
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {canEdit && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<EditIcon />}
                onClick={handleOpenEdit}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Düzenle
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: '#fff',
                }}
              >
                Sil
              </Button>
            )}
          </Box>
        }
      />
      <Grid container spacing={3}>
        {/* Üye Bilgisi */}
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.12)}`,
                borderColor: alpha(theme.palette.primary.main, 0.2),
                transform: 'translateY(-2px)',
              },
              height: '100%',
            }}
          >
            <Box
              sx={{
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <PaymentIcon />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  color: theme.palette.text.primary,
                  letterSpacing: 0.2,
                }}
              >
                Üye Bilgisi
              </Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Üye Kayıt No
                </Typography>
                <Typography variant="body1">
                  {payment.registrationNumber || payment.member?.registrationNumber || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Ad Soyad
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {payment.member?.firstName && payment.member?.lastName
                    ? `${payment.member.firstName} ${payment.member.lastName}`
                    : payment.createdByUser
                    ? `${payment.createdByUser.firstName} ${payment.createdByUser.lastName}`
                    : '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Kurum
                </Typography>
                <Typography variant="body1">
                  {payment.member?.institution?.name || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Tevkifat Merkezi
                </Typography>
                <Typography variant="body1">
                  {payment.tevkifatCenter?.name || '-'}
                </Typography>
              </Box>
            </Box>
            </Box>
          </Card>
        </Grid>

        {/* Kesinti Bilgileri */}
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.12)}`,
                borderColor: alpha(theme.palette.primary.main, 0.2),
                transform: 'translateY(-2px)',
              },
              height: '100%',
            }}
          >
            <Box
              sx={{
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <PaymentIcon />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  color: theme.palette.text.primary,
                  letterSpacing: 0.2,
                }}
              >
                Kesinti Bilgileri
              </Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Ay / Yıl
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {monthNames[payment.paymentPeriodMonth - 1]} / {payment.paymentPeriodYear}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Tutar
                </Typography>
                <Typography variant="body1" fontWeight={600} color="primary.main" fontSize="1.25rem">
                  {new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                  }).format(Number(payment.amount))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Kesinti Türü
                </Typography>
                <Typography variant="body1">
                  {paymentTypeLabels[payment.paymentType]}
                </Typography>
              </Box>
              {payment.tevkifatCenter && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tevkifat Merkezi
                  </Typography>
                  <Typography variant="body1">{payment.tevkifatCenter.name}</Typography>
                </Box>
              )}
              {payment.description && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Açıklama
                  </Typography>
                  <Typography variant="body1">{payment.description}</Typography>
                </Box>
              )}
            </Box>
            </Box>
          </Card>
        </Grid>

        {/* Belge ve İşlem Bilgileri */}
        <Grid size={12}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.12)}`,
                borderColor: alpha(theme.palette.primary.main, 0.2),
                transform: 'translateY(-2px)',
              },
            }}
          >
            <Box
              sx={{
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <PictureAsPdfIcon />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  color: theme.palette.text.primary,
                  letterSpacing: 0.2,
                }}
              >
                Belge ve İşlem Bilgileri
              </Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2}>
              {payment.documentUrl && (
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PictureAsPdfIcon color="error" sx={{ fontSize: '2rem' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Kesinti Evrakı (PDF)
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PictureAsPdfIcon />}
                          onClick={() => void handleViewDocument()}
                          sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            fontWeight: 600,
                          }}
                        >
                          Evrakı Görüntüle
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={
                            downloadingDocument ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <DownloadIcon />
                            )
                          }
                          disabled={downloadingDocument}
                          onClick={() => void handleDownloadDocument()}
                          sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            fontWeight: 600,
                          }}
                        >
                          İndir
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              )}
              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Kesinti Yapan
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {payment.createdByUser
                      ? `${payment.createdByUser.firstName} ${payment.createdByUser.lastName}`
                      : '-'}
                  </Typography>
                </Box>
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Onaylayan Kullanıcı
                  </Typography>
                  <Typography variant="body1">
                    {payment.approvedByUser
                      ? `${payment.approvedByUser.firstName} ${payment.approvedByUser.lastName}`
                      : '-'}
                  </Typography>
                </Box>
              </Grid>
              {payment.approvedAt && (
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Onay Tarihi
                    </Typography>
                    <Typography variant="body1">
                      {new Date(payment.approvedAt).toLocaleString('tr-TR')}
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    İşlem Zamanı
                  </Typography>
                  <Typography variant="body1">
                    {new Date(payment.createdAt).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            </Box>
          </Card>
        </Grid>

      </Grid>

      {/* Düzenleme Dialog */}
      {canEdit && (
        <Dialog open={editDialogOpen} onClose={() => !saving && !uploadingDocument && setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Kesinti Düzenle</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              <TextField
                label="Tutar"
                type="number"
                value={editForm.amount ?? ''}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">TL</InputAdornment>,
                }}
              />
              <FormControl fullWidth>
                <InputLabel>Yıl</InputLabel>
                <Select
                  value={editForm.paymentPeriodYear ?? new Date().getFullYear()}
                  label="Yıl"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      paymentPeriodYear: Number(e.target.value),
                    })
                  }
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Ay</InputLabel>
                <Select
                  value={editForm.paymentPeriodMonth ?? new Date().getMonth() + 1}
                  label="Ay"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      paymentPeriodMonth: Number(e.target.value),
                    })
                  }
                >
                  {monthNames.map((month, index) => (
                    <MenuItem key={month} value={index + 1}>
                      {month}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {editForm.paymentType === 'TEVKIFAT' && (
                <FormControl fullWidth>
                  <InputLabel>Tevkifat Merkezi</InputLabel>
                  <Select
                    value={editForm.tevkifatCenterId || ''}
                    label="Tevkifat Merkezi"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        tevkifatCenterId: e.target.value || undefined,
                      })
                    }
                  >
                    {tevkifatCenters.map((center) => (
                      <MenuItem key={center.id} value={center.id}>
                        {center.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                label="Açıklama"
                value={editForm.description ?? ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  PDF Belgesi
                </Typography>
                {payment.documentUrl && !documentFile && (
                  <Box
                    sx={{
                      mb: 1,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <PictureAsPdfIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>
                      Mevcut belge var
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => void handleViewDocument()}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Görüntüle
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        downloadingDocument ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <DownloadIcon sx={{ fontSize: 18 }} />
                        )
                      }
                      disabled={downloadingDocument}
                      onClick={() => void handleDownloadDocument()}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      İndir
                    </Button>
                  </Box>
                )}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  fullWidth
                  size="medium"
                >
                  {documentFile
                    ? documentFile.name
                    : payment.documentUrl
                    ? 'Belgeyi Değiştir'
                    : 'PDF Yükle'}
                  <input
                    type="file"
                    hidden
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDocumentFile(file);
                      }
                    }}
                  />
                </Button>
                {documentFile && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    Seçilen: {documentFile.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                if (saving || uploadingDocument) return;
                setEditDialogOpen(false);
                setDocumentFile(null);
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleSaveEdit}
              variant="contained"
              disabled={
                saving ||
                uploadingDocument ||
                !editForm.amount ||
                Number(editForm.amount) <= 0
              }
            >
              {saving || uploadingDocument ? <CircularProgress size={24} /> : 'Kaydet'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Silme Onay Dialog */}
      {canDelete && (
        <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
          <DialogTitle>Kesinti Sil</DialogTitle>
          <DialogContent>
            <Typography>
              Bu Kesintiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </Typography>
            {payment && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2">
                  <strong>Üye:</strong> {memberFullName}
                </Typography>
                <Typography variant="body2">
                  <strong>Tutar:</strong>{' '}
                  {Number(payment.amount).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  TL
                </Typography>
                <Typography variant="body2">
                  <strong>Dönem:</strong>{' '}
                  {monthNames[payment.paymentPeriodMonth - 1]} {payment.paymentPeriodYear}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={deleting}
            >
              {deleting ? <CircularProgress size={24} /> : 'Sil'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog
        open={paymentPdfViewerOpen}
        onClose={closePaymentPdfViewer}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh', maxHeight: '90vh' } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PictureAsPdfIcon sx={{ color: theme.palette.error.main }} />
            <Typography variant="h6">{paymentPdfTitle}</Typography>
          </Box>
          <IconButton
            onClick={closePaymentPdfViewer}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
              },
            }}
            aria-label="Kapat"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            height: 'calc(90vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {loadingPaymentPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                PDF yükleniyor...
              </Typography>
            </Box>
          ) : paymentPdfBlobUrl ? (
            <DraftPdfCanvasPreview blobUrl={paymentPdfBlobUrl} variant="document" />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default PaymentDetailPage;
