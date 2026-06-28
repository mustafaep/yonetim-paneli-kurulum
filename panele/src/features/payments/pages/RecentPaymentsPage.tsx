// src/pages/payments/RecentPaymentsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import {
  getPayments,
  updatePayment,
  deletePayment,
  uploadPaymentDocument,
  fetchPaymentDocumentBlob,
  type MemberPayment,
  type PaymentType,
  type UpdateMemberPaymentDto,
} from '../services/paymentsApi';
import { getTevkifatCenters } from '../../accounting/services/accountingApi';
import { getMembers } from '../../members/services/membersApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { DraftPdfCanvasPreview } from '../../documents/components/DraftPdfCanvasPreview';

const RecentPaymentsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<MemberPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tevkifatCenters, setTevkifatCenters] = useState<Array<{ id: string; name: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; firstName: string; lastName: string; registrationNumber: string | null }>>([]);

  // PDF görüntüleme state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(false);

  // PDF yükleme state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const [editForm, setEditForm] = useState<UpdateMemberPaymentDto>({
    amount: '',
    paymentPeriodMonth: new Date().getMonth() + 1,
    paymentPeriodYear: new Date().getFullYear(),
    paymentType: 'TEVKIFAT',
    tevkifatCenterId: '',
    description: '',
  });

  const canView = hasPermission('MEMBER_PAYMENT_LIST');
  const canEdit = hasPermission('MEMBER_PAYMENT_UPDATE') || hasPermission('MEMBER_PAYMENT_ADD');
  const canDelete = hasPermission('MEMBER_PAYMENT_DELETE') || hasPermission('MEMBER_PAYMENT_ADD');

  useEffect(() => {
    if (canView) {
      loadRecentPayments();
      if (canEdit) {
        loadTevkifatCenters();
        loadMembers();
      }
    }
  }, [canView, canEdit]);

  const loadRecentPayments = async () => {
    setLoading(true);
    try {
      const data = await getPayments();
      // Son eklenen 50 Kesintiyi al (createdAt'e göre sırala)
      const sortedData = [...data]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50);
      setRows(sortedData);
    } catch (e: unknown) {
      console.error('Kesintiler yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kesintiler yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const loadTevkifatCenters = async () => {
    try {
      const data = await getTevkifatCenters();
      setTevkifatCenters(data.map((c) => ({ id: c.id, name: c.name })));
    } catch (e) {
      console.error('Tevkifat merkezleri yüklenirken hata:', e);
    }
  };

  const loadMembers = async () => {
    try {
      const [activeMembers, pendingMembers, approvedMembers] = await Promise.all([
        getMembers('ACTIVE'),
        getMembers('PENDING'),
        getMembers('APPROVED'),
      ]);
      const allMembers = [...activeMembers, ...pendingMembers, ...approvedMembers];
      const uniqueMembers = allMembers.filter((member, index, self) =>
        index === self.findIndex((m) => m.id === member.id)
      );
      setMembers(uniqueMembers.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        registrationNumber: m.registrationNumber,
      })));
    } catch (e) {
      console.error('Üyeler yüklenirken hata:', e);
    }
  };

  const handleEdit = (payment: MemberPayment) => {
    setSelectedPayment(payment);
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

  const handleViewPdf = async (payment: MemberPayment) => {
    if (!payment.documentUrl) {
      toast.showError('Bu Kesinti için belge bulunmamaktadır');
      return;
    }

    setLoadingPdf(true);
    try {
      const blob = await fetchPaymentDocumentBlob(payment.id);
      const blobUrl = window.URL.createObjectURL(blob);
      const urlParts = payment.documentUrl.split('/');
      const fileName = urlParts[urlParts.length - 1] || 'Kesinti Belgesi';
      setPdfUrl(blobUrl);
      setPdfTitle(fileName);
      setPdfViewerOpen(true);
    } catch (error: unknown) {
      console.error('Dosya görüntülenirken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Dosya görüntülenemedi'));
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;

    setSaving(true);
    try {
      let updatedForm = { ...editForm };

      // Eğer yeni PDF dosyası yüklendiyse önce onu yükle
      if (documentFile && selectedPayment.memberId) {
        setUploadingDocument(true);
        try {
          const uploadResult = await uploadPaymentDocument(
            documentFile,
            selectedPayment.memberId,
            editForm.paymentPeriodMonth || selectedPayment.paymentPeriodMonth,
            editForm.paymentPeriodYear || selectedPayment.paymentPeriodYear,
            documentFile.name
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

      await updatePayment(selectedPayment.id, updatedForm);
      toast.showSuccess('Kesinti başarıyla güncellendi');
      setEditDialogOpen(false);
      setSelectedPayment(null);
      setDocumentFile(null);
      loadRecentPayments();
    } catch (e: unknown) {
      console.error('Kesinti güncellenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kesinti güncellenirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (payment: MemberPayment) => {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPayment) return;

    setDeleting(true);
    try {
      await deletePayment(selectedPayment.id);
      toast.showSuccess('Kesinti başarıyla silindi');
      setDeleteDialogOpen(false);
      setSelectedPayment(null);
      loadRecentPayments();
    } catch (e: unknown) {
      console.error('Kesinti silinirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kesinti silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const paymentTypeLabels: Record<PaymentType, string> = {
    TEVKIFAT: 'Tevkifat',
    ELDEN: 'Elden',
    HAVALE: 'Havale',
  };

  const filteredRows = rows.filter((row) => {
    const searchLower = searchText.toLowerCase();
    const memberName = `${row.member?.firstName || ''} ${row.member?.lastName || ''}`.toLowerCase();
      const registrationNumber = row.registrationNumber || row.member?.registrationNumber || '';
      const institutionName = row.member?.institution?.name || '';
      const tevkifatCenterName = row.tevkifatCenter?.name || '';

    return (
      memberName.includes(searchLower) ||
      registrationNumber.toLowerCase().includes(searchLower) ||
      institutionName.toLowerCase().includes(searchLower) ||
      tevkifatCenterName.toLowerCase().includes(searchLower)
    );
  });

  const columns: GridColDef<MemberPayment>[] = [
    {
      field: 'createdAt',
      headerName: 'Kayıt Tarihi',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => {
        const date = new Date(row.createdAt);
        return date.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      field: 'member',
      headerName: 'Üye',
      width: 200,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => {
        return `${row.member?.firstName || ''} ${row.member?.lastName || ''}`.trim();
      },
    },
    {
      field: 'registrationNumber',
      headerName: 'Kayıt No',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => row.registrationNumber || row.member?.registrationNumber || '-',
    },
    {
      field: 'amount',
      headerName: 'Tutar',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => {
        const amount = parseFloat(row.amount);
        return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
      },
    },
    {
      field: 'paymentPeriod',
      headerName: 'Dönem',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => {
        return `${monthNames[row.paymentPeriodMonth - 1]} ${row.paymentPeriodYear}`;
      },
    },
    {
      field: 'tevkifatCenter',
      headerName: 'Tevkifat Merkezi',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => row.tevkifatCenter?.name || '-',
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 220,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      cellClassName: 'recent-payments-actions-cell',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
          <Tooltip title="Kesinti Detayları">
            <IconButton
              size="small"
              onClick={() => navigate(`/payments/${params.row.id}`)}
              sx={{ color: theme.palette.info.main }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.documentUrl && (
            <Tooltip title="PDF Görüntüle">
              <IconButton
                size="small"
                onClick={() => handleViewPdf(params.row)}
                sx={{ color: theme.palette.error.main }}
              >
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip title="Düzenle">
              <IconButton
                size="small"
                onClick={() => handleEdit(params.row)}
                sx={{ color: theme.palette.warning.main }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Sil">
              <IconButton
                size="small"
                onClick={() => handleDelete(params.row)}
                sx={{ color: theme.palette.error.main }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  if (!canView) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">Bu sayfaya erişim yetkiniz bulunmamaktadır.</Alert>
      </Box>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<PaymentIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Son Kesintiler"
        description="Son eklenen 50 Kesinti kaydı"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
      />

      {/* Ana Kart */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {/* Arama Bölümü */}
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <TextField
            placeholder="Ara (ad, soyad, kayıt no, kurum, tevkifat merkezi)..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="medium"
            fullWidth
            sx={{ 
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#fff',
                borderRadius: 2.5,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Tablo */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              },
              '& .recent-payments-actions-cell': {
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              },
            }}
          />
        </Box>
      </Card>

      {/* Düzenleme Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Kesinti Düzenle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Tutar"
              type="number"
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              fullWidth
              InputProps={{
                endAdornment: <Typography sx={{ color: 'text.secondary' }}>TL</Typography>,
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Yıl</InputLabel>
              <Select
                value={editForm.paymentPeriodYear}
                label="Yıl"
                onChange={(e) => setEditForm({ ...editForm, paymentPeriodYear: Number(e.target.value) })}
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
                value={editForm.paymentPeriodMonth}
                label="Ay"
                onChange={(e) => setEditForm({ ...editForm, paymentPeriodMonth: Number(e.target.value) })}
              >
                {monthNames.map((month, index) => (
                  <MenuItem key={index} value={index + 1}>
                    {month}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Kesinti Tipi</InputLabel>
              <Select
                value={editForm.paymentType}
                label="Kesinti Tipi"
                onChange={(e) => setEditForm({ ...editForm, paymentType: e.target.value as PaymentType })}
              >
                <MenuItem value="TEVKIFAT">Tevkifat</MenuItem>
                <MenuItem value="ELDEN">Elden</MenuItem>
                <MenuItem value="HAVALE">Havale</MenuItem>
              </Select>
            </FormControl>
            {editForm.paymentType === 'TEVKIFAT' && (
              <FormControl fullWidth>
                <InputLabel>Tevkifat Merkezi</InputLabel>
                <Select
                  value={editForm.tevkifatCenterId || ''}
                  label="Tevkifat Merkezi"
                  onChange={(e) => setEditForm({ ...editForm, tevkifatCenterId: e.target.value })}
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
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                PDF Belgesi
              </Typography>
              {selectedPayment?.documentUrl && !documentFile && (
                <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PictureAsPdfIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    Mevcut belge var
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => selectedPayment && handleViewPdf(selectedPayment)}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Görüntüle
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
                {documentFile ? documentFile.name : selectedPayment?.documentUrl ? 'Belgeyi Değiştir' : 'PDF Yükle'}
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
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Seçilen: {documentFile.name}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialogOpen(false);
            setDocumentFile(null);
          }}>İptal</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={saving || uploadingDocument || !editForm.amount}
          >
            {(saving || uploadingDocument) ? <CircularProgress size={24} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Kesinti Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu Kesintiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
          {selectedPayment && (
            <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Üye:</strong> {selectedPayment.member?.firstName} {selectedPayment.member?.lastName}
              </Typography>
              <Typography variant="body2">
                <strong>Tutar:</strong> {parseFloat(selectedPayment.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              </Typography>
              <Typography variant="body2">
                <strong>Dönem:</strong> {monthNames[selectedPayment.paymentPeriodMonth - 1]} {selectedPayment.paymentPeriodYear}
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

      {/* PDF Görüntüleme Dialog */}
      <Dialog
        open={pdfViewerOpen}
        onClose={() => {
          setPdfViewerOpen(false);
          if (pdfUrl) {
            window.URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }
          setPdfTitle('');
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh',
          },
        }}
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
            <Typography variant="h6">{pdfTitle}</Typography>
          </Box>
          <IconButton
            onClick={() => {
              setPdfViewerOpen(false);
              if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
              }
              setPdfTitle('');
            }}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
              },
            }}
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
          {loadingPdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                PDF yükleniyor...
              </Typography>
            </Box>
          ) : pdfUrl ? (
            <DraftPdfCanvasPreview blobUrl={pdfUrl} variant="document" />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default RecentPaymentsPage;

