import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  useTheme,
  alpha,
  Grid,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
  Chip,
  Divider,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import ListAltIcon from '@mui/icons-material/ListAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

import PageLayout from '../../../shared/components/layout/PageLayout';
import PageHeader from '../../../shared/components/layout/PageHeader';
import { DraftPdfCanvasPreview } from '../../documents/components/DraftPdfCanvasPreview';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { useAuth } from '../../../app/providers/AuthContext';
import {
  createInvoice,
  getInvoices,
  updateInvoice,
  deleteInvoice,
  uploadInvoiceDocument,
  fetchInvoiceDocumentBlob,
  downloadInvoiceDocument,
  type CreateInvoiceDto,
  type UpdateInvoiceDto,
  type Invoice,
  type InvoiceStatus,
} from '../services/invoicesApi';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' },
];

const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - i);
const MONTH_FILTER_ALL = 0;

const STATUS_OPTIONS: { value: InvoiceStatus | 'ALL'; label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' }[] = [
  { value: 'ALL',       label: 'Tümü',      color: 'default'  },
  { value: 'DRAFT',     label: 'Taslak',    color: 'warning'  },
  { value: 'SENT',      label: 'Gönderildi', color: 'info'   },
  { value: 'PAID',      label: 'Ödendi',    color: 'success'  },
  { value: 'CANCELLED', label: 'İptal',     color: 'error'    },
];

const statusLabel = (s: InvoiceStatus): string =>
  STATUS_OPTIONS.find((x) => x.value === s)?.label ?? s;

const statusColor = (s: InvoiceStatus) =>
  STATUS_OPTIONS.find((x) => x.value === s)?.color ?? 'default';

const monthName = (m: number) => MONTHS.find((x) => x.value === m)?.label ?? String(m);
const monthFilterLabel = (m: number, year: number) =>
  m === MONTH_FILTER_ALL ? `Tüm aylar (${year})` : `${monthName(m)} ${year}`;

const fmtAmount = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR') : '-';

// ─── Bileşen ──────────────────────────────────────────────────────────────────

const InvoicesPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('INVOICE_CREATE');
  const canUpdate = hasPermission('INVOICE_UPDATE');
  const canDelete = hasPermission('INVOICE_DELETE');
  const canViewInvoiceDocument = hasPermission('INVOICE_VIEW');
  const canDownloadInvoiceDocument = hasPermission('DOCUMENT_DOWNLOAD');
  const canManageInvoices = canCreate || canUpdate || canDelete;

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tabValue, setTabValue] = useState(0);

  // ── Liste durumu ─────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // ── Yeni Fatura dialog ────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Omit<CreateInvoiceDto, 'documentUrl'>>({
    invoiceNo: '',
    recipient: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'DRAFT',
    description: '',
  });
  const [createPdfFile, setCreatePdfFile] = useState<File | null>(null);
  const [uploadingCreatePdf, setUploadingCreatePdf] = useState(false);
  const createPdfInputRef = useRef<HTMLInputElement>(null);

  // ── Düzenle dialog ────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState<UpdateInvoiceDto>({});
  const [saving, setSaving] = useState(false);
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editClearPdf, setEditClearPdf] = useState(false);
  const [uploadingEditPdf, setUploadingEditPdf] = useState(false);
  const editPdfInputRef = useRef<HTMLInputElement>(null);

  // ── Sil dialog ────────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Detay dialog ─────────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  const [invoicePdfViewerOpen, setInvoicePdfViewerOpen] = useState(false);
  const [invoicePdfBlobUrl, setInvoicePdfBlobUrl] = useState<string | null>(null);
  const [invoicePdfTitle, setInvoicePdfTitle] = useState('');
  const [loadingInvoicePdf, setLoadingInvoicePdf] = useState(false);

  // ── Veri yükleme ─────────────────────────────────────────────────────────
  useEffect(() => {
    void loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, yearFilter, monthFilter, statusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const filters: Parameters<typeof getInvoices>[0] = {
        year: yearFilter,
        ...(monthFilter !== MONTH_FILTER_ALL ? { month: monthFilter } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      };
      if (searchText.trim()) filters.search = searchText.trim();
      setInvoices(await getInvoices(filters));
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Fatura listesi yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  // ── İstatistikler ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => {
      const v = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
      return sum + (Number.isNaN(v) ? 0 : v);
    }, 0);
    const paid = invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => {
        const v = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
        return sum + (Number.isNaN(v) ? 0 : v);
      }, 0);
    const byMonth: Record<number, { count: number; total: number }> = {};
    for (const inv of invoices) {
      const v = typeof inv.amount === 'string' ? parseFloat(inv.amount) : inv.amount;
      if (!byMonth[inv.month]) byMonth[inv.month] = { count: 0, total: 0 };
      byMonth[inv.month].count++;
      byMonth[inv.month].total += Number.isNaN(v) ? 0 : v;
    }
    return { total, paid, count: invoices.length, byMonth };
  }, [invoices]);

  // ── Yeni fatura ───────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    if (!canCreate) return;
    setCreatePdfFile(null);
    setCreateForm({
      invoiceNo: '',
      recipient: '',
      amount: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: 'DRAFT',
      description: '',
    });
    setCreateOpen(true);
  };

  const handleCreateInvoice = async () => {
    if (!canCreate) {
      toast.showError('Fatura ekleme yetkiniz bulunmuyor');
      return;
    }
    if (!createForm.invoiceNo.trim()) {
      toast.showError('Fatura numarası zorunludur');
      return;
    }
    if (!createForm.recipient.trim()) {
      toast.showError('Alıcı adı zorunludur');
      return;
    }
    if (!createForm.amount.trim()) {
      toast.showError('Tutar zorunludur');
      return;
    }
    setCreating(true);
    try {
      let documentUrl: string | undefined;
      if (createPdfFile) {
        setUploadingCreatePdf(true);
        try {
          const up = await uploadInvoiceDocument(
            createPdfFile,
            createForm.month,
            createForm.year,
            createPdfFile.name,
          );
          documentUrl = up.fileUrl;
        } finally {
          setUploadingCreatePdf(false);
        }
      }
      const created = await createInvoice({
        ...createForm,
        description: createForm.description?.trim() || undefined,
        documentUrl,
      });
      toast.showSuccess('Fatura oluşturuldu');
      setCreateOpen(false);
      setCreatePdfFile(null);
      setInvoices((prev) => [created, ...prev]);
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Fatura oluşturulamadı'));
    } finally {
      setCreating(false);
    }
  };

  // ── Düzenle ───────────────────────────────────────────────────────────────
  const handleOpenEdit = (inv: Invoice) => {
    if (!canUpdate) return;
    setEditingInvoice(inv);
    setEditPdfFile(null);
    setEditClearPdf(false);
    setEditForm({
      invoiceNo: inv.invoiceNo,
      recipient: inv.recipient,
      amount: String(inv.amount),
      month: inv.month,
      year: inv.year,
      status: inv.status,
      description: inv.description ?? '',
      dueDate: inv.dueDate
        ? new Date(inv.dueDate).toISOString().slice(0, 10)
        : undefined,
    });
    setEditOpen(true);
  };

  const closeInvoicePdfViewer = useCallback(() => {
    setInvoicePdfViewerOpen(false);
    setLoadingInvoicePdf(false);
    setInvoicePdfBlobUrl((prev) => {
      if (prev) window.URL.revokeObjectURL(prev);
      return null;
    });
    setInvoicePdfTitle('');
  }, []);

  const handleViewPdf = useCallback(
    async (inv: Invoice) => {
      if (!canViewInvoiceDocument) {
        toast.showError('Fatura belgesi görüntüleme yetkiniz bulunmuyor');
        return;
      }
      if (!inv.documentUrl) {
        toast.showError('Bu fatura için belge yok.');
        return;
      }
      setInvoicePdfTitle(inv.invoiceNo ? `Fatura ${inv.invoiceNo}` : 'Fatura belgesi');
      setInvoicePdfViewerOpen(true);
      setLoadingInvoicePdf(true);
      setInvoicePdfBlobUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return null;
      });
      try {
        const blob = await fetchInvoiceDocumentBlob(inv.id);
        setInvoicePdfBlobUrl(window.URL.createObjectURL(blob));
      } catch (e) {
        toast.showError(getApiErrorMessage(e, 'Belge açılamadı'));
        closeInvoicePdfViewer();
      } finally {
        setLoadingInvoicePdf(false);
      }
    },
    [toast, closeInvoicePdfViewer, canViewInvoiceDocument],
  );

  const handleUpdateInvoice = async () => {
    if (!canUpdate) {
      toast.showError('Fatura güncelleme yetkiniz bulunmuyor');
      return;
    }
    if (!editingInvoice) return;
    if (!editForm.amount?.trim()) {
      toast.showError('Tutar zorunludur');
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateInvoiceDto = {
        ...editForm,
        description: editForm.description?.trim() || undefined,
      };
      if (editPdfFile) {
        setUploadingEditPdf(true);
        try {
          const up = await uploadInvoiceDocument(
            editPdfFile,
            editForm.month ?? editingInvoice.month,
            editForm.year ?? editingInvoice.year,
            editPdfFile.name,
          );
          payload.documentUrl = up.fileUrl;
        } finally {
          setUploadingEditPdf(false);
        }
      } else if (editClearPdf && editingInvoice.documentUrl) {
        payload.clearDocument = true;
      }
      const updated = await updateInvoice(editingInvoice.id, payload);
      toast.showSuccess('Fatura güncellendi');
      setEditOpen(false);
      setEditPdfFile(null);
      setEditClearPdf(false);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Fatura güncellenemedi'));
    } finally {
      setSaving(false);
    }
  };

  // ── Sil ───────────────────────────────────────────────────────────────────
  const handleOpenDelete = (inv: Invoice) => {
    if (!canDelete) return;
    setDeletingInvoice(inv);
    setDeleteOpen(true);
  };

  const handleDeleteInvoice = async () => {
    if (!canDelete) {
      toast.showError('Fatura silme yetkiniz bulunmuyor');
      return;
    }
    if (!deletingInvoice) return;
    setDeleting(true);
    try {
      await deleteInvoice(deletingInvoice.id);
      toast.showSuccess('Fatura silindi');
      setDeleteOpen(false);
      setInvoices((prev) => prev.filter((i) => i.id !== deletingInvoice.id));
      setDeletingInvoice(null);
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Fatura silinemedi'));
    } finally {
      setDeleting(false);
    }
  };

  // ── Detay ─────────────────────────────────────────────────────────────────
  const handleOpenDetail = (inv: Invoice) => {
    setDetailInvoice(inv);
    setDetailOpen(true);
  };

  // ── Tablo sütunları ───────────────────────────────────────────────────────
  const columns: GridColDef<Invoice>[] = useMemo(
    () => [
      {
        field: 'invoiceNo',
        headerName: 'Fatura No',
        flex: 1,
        minWidth: 140,
      },
      {
        field: 'recipient',
        headerName: 'Alıcı',
        flex: 1.5,
        minWidth: 180,
      },
      {
        field: 'issueDate',
        headerName: 'Düzenleme Tarihi',
        flex: 1,
        minWidth: 150,
        valueGetter: (_v, row) => fmtDate(row.issueDate),
      },
      {
        field: 'dueDate',
        headerName: 'Vade Tarihi',
        flex: 1,
        minWidth: 130,
        valueGetter: (_v, row) => fmtDate(row.dueDate),
      },
      {
        field: 'amount',
        headerName: 'Tutar',
        flex: 1,
        minWidth: 130,
        align: 'right',
        headerAlign: 'right',
        valueGetter: (_v, row) => fmtAmount(row.amount),
      },
      {
        field: 'status',
        headerName: 'Durum',
        flex: 0.9,
        minWidth: 120,
        renderCell: ({ row }) => (
          <Chip
            label={statusLabel(row.status)}
            color={statusColor(row.status)}
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        ),
      },
      {
        field: 'pdf',
        headerName: 'Belge',
        width: 76,
        sortable: false,
        filterable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: ({ row }) =>
          row.documentUrl && canViewInvoiceDocument ? (
            <Tooltip title="PDF görüntüle">
              <IconButton
                size="small"
                onClick={() => void handleViewPdf(row)}
                sx={{ color: theme.palette.error.main }}
              >
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Typography variant="caption" color="text.disabled">—</Typography>
          ),
      },
      ...(canManageInvoices
        ? ([
            {
              field: 'actions',
              headerName: 'İşlemler',
              width: 120,
              sortable: false,
              filterable: false,
              align: 'center',
              headerAlign: 'center',
              cellClassName: 'invoice-actions-cell',
              renderCell: ({ row }) => (
                <Stack
                  direction="row"
                  spacing={0.5}
                  justifyContent="center"
                  alignItems="center"
                  sx={{ width: '100%', height: '100%' }}
                >
                  <Tooltip title="Detay">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDetail(row)}
                      sx={{ color: theme.palette.info.main }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {canUpdate && (
                    <Tooltip title="Düzenle">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(row)}
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
                        onClick={() => handleOpenDelete(row)}
                        sx={{ color: theme.palette.error.main }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              ),
            },
          ] as GridColDef<Invoice>[])
        : []),
    ],
    [canManageInvoices, canUpdate, canDelete, theme, handleViewPdf],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      <PageHeader
        icon={
          <ReceiptLongIcon
            sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }}
          />
        }
        title="Fatura Sistemi"
        description="Fatura kayıtlarını listeleyin ve yönetin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="large"
              onClick={handleOpenCreate}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
                py: 1.5,
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
              }}
            >
              Fatura Ekle
            </Button>
          ) : undefined
        }
        mobileContent={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              fullWidth
              onClick={handleOpenCreate}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
            >
              Fatura Ekle
            </Button>
          ) : undefined
        }
      />

      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          overflow: 'hidden',
        }}
      >
        {/* Sekmeler */}
        <Box
          sx={{
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)}, ${alpha(theme.palette.primary.light, 0.01)})`,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{
              px: { xs: 2, sm: 3 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 52,
              },
            }}
          >
            <Tab icon={<ListAltIcon fontSize="small" />} iconPosition="start" label="Fatura Listesi" />
            <Tab icon={<BarChartIcon fontSize="small" />} iconPosition="start" label="Fatura İstatistikleri" />
          </Tabs>
        </Box>

        {/* ─ Tab 0: Liste ─────────────────────────────────────────────── */}
        {tabValue === 0 && (
          <>
            {/* Filtreler */}
            <Box
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)}, transparent)`,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    placeholder="Fatura no, alıcı veya açıklama ile ara…"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}>
                    <InputLabel>Yıl</InputLabel>
                    <Select value={yearFilter} label="Yıl" onChange={(e) => setYearFilter(Number(e.target.value))}>
                      {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}>
                    <InputLabel>Ay</InputLabel>
                    <Select value={monthFilter} label="Ay" onChange={(e) => setMonthFilter(Number(e.target.value))}>
                      <MenuItem value={MONTH_FILTER_ALL}>Tüm aylar</MenuItem>
                      {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}>
                    <InputLabel>Durum</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Durum"
                      onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'ALL')}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 2 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      px: 2, py: 1, borderRadius: 2,
                      background: alpha(theme.palette.info.main, 0.06),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}
                  >
                    <ReceiptLongIcon fontSize="small" sx={{ color: theme.palette.info.main }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.info.main, whiteSpace: 'nowrap' }}>
                      {invoices.length} kayıt
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Tablo */}
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box
                  sx={{
                    height: { xs: 420, sm: 520, md: 620 },
                    '& .MuiDataGrid-root': { border: 'none' },
                    '& .MuiDataGrid-cell': { borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}` },
                    '& .invoice-actions-cell': { display: 'flex', alignItems: 'center', justifyContent: 'center', py: 0 },
                    '& .invoice-actions-cell .MuiDataGrid-cellContent': { width: '100%', height: '100%' },
                    '& .MuiDataGrid-columnHeaders': {
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                  }}
                >
                  <DataGrid
                    rows={invoices}
                    columns={columns}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    localeText={{ noRowsLabel: 'Fatura kaydı bulunamadı' }}
                  />
                </Box>
              )}
            </Box>
          </>
        )}

        {/* ─ Tab 1: İstatistikler ──────────────────────────────────────── */}
        {tabValue === 1 && (
          <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              {/* Toplam Kayıt */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper elevation={0} sx={{
                  p: 3, borderRadius: 3, textAlign: 'center',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)}, ${alpha(theme.palette.primary.light, 0.03)})`,
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{stats.count}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Toplam Kayıt</Typography>
                </Paper>
              </Grid>

              {/* Toplam Tutar */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper elevation={0} sx={{
                  p: 3, borderRadius: 3, textAlign: 'center',
                  border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.06)}, ${alpha(theme.palette.success.light, 0.03)})`,
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.success.main }}>
                    {stats.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Toplam Tutar</Typography>
                </Paper>
              </Grid>

              {/* Ödenen */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper elevation={0} sx={{
                  p: 3, borderRadius: 3, textAlign: 'center',
                  border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.06)}, ${alpha(theme.palette.info.light, 0.03)})`,
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.info.main }}>
                    {stats.paid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Ödenen Tutar</Typography>
                </Paper>
              </Grid>

              {/* Dönem */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper elevation={0} sx={{
                  p: 3, borderRadius: 3, textAlign: 'center',
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.06)}, ${alpha(theme.palette.warning.light, 0.03)})`,
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.warning.main }}>
                    {monthFilterLabel(monthFilter, yearFilter)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Seçili Dönem</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Aylık dağılım */}
            {Object.keys(stats.byMonth).length > 0 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Aylık Dağılım</Typography>
                <Stack spacing={1.5}>
                  {MONTHS.filter((m) => stats.byMonth[m.value]).map((m) => {
                    const d = stats.byMonth[m.value];
                    const pct = stats.total > 0 ? (d.total / stats.total) * 100 : 0;
                    return (
                      <Box key={m.value}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.label}</Typography>
                          <Stack direction="row" spacing={2}>
                            <Chip label={`${d.count} kayıt`} size="small" sx={{ fontSize: '0.75rem' }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                              {d.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </Typography>
                          </Stack>
                        </Box>
                        <Box sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(theme.palette.primary.main, 0.12), overflow: 'hidden' }}>
                          <Box sx={{
                            height: '100%', width: `${pct}%`, borderRadius: 4,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                            transition: 'width 0.5s ease',
                          }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </>
            )}

            {stats.count === 0 && (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <BarChartIcon sx={{ fontSize: '3rem', opacity: 0.3, mb: 1 }} />
                <Typography>Seçili dönemde fatura verisi yok</Typography>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  YENİ FATURA DIALOG                                                */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: '#fff', py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
          }}
        >
          <ReceiptLongIcon />
          <Box component="span" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>Yeni Fatura Ekle</Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2.5}>
            {/* Fatura No */}
            <Grid size={{ xs: 12, sm: 6 }} sx={{ mt: 1.5 }}>
              <TextField
                label="Fatura No"
                fullWidth
                required
                size="small"
                value={createForm.invoiceNo}
                onChange={(e) => setCreateForm((p) => ({ ...p, invoiceNo: e.target.value }))}
                placeholder="Örn: FTR-2026-0001"
              />
            </Grid>

            {/* Alıcı */}
            <Grid size={{ xs: 12, sm: 6 }} sx={{ mt: 1.5 }}>
              <TextField
                label="Alıcı"
                fullWidth
                required
                size="small"
                value={createForm.recipient}
                onChange={(e) => setCreateForm((p) => ({ ...p, recipient: e.target.value }))}
                placeholder="Alıcı adı veya unvanı…"
              />
            </Grid>

            <Grid size={12}><Divider /></Grid>

            {/* Tutar */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Tutar (₺)"
                type="number"
                fullWidth
                required
                size="small"
                value={createForm.amount}
                onChange={(e) => setCreateForm((p) => ({ ...p, amount: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Durum */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Durum</InputLabel>
                <Select
                  value={createForm.status ?? 'DRAFT'}
                  label="Durum"
                  onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value as InvoiceStatus }))}
                >
                  {STATUS_OPTIONS.filter((s) => s.value !== 'ALL').map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Ay */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Ay</InputLabel>
                <Select
                  value={createForm.month}
                  label="Ay"
                  onChange={(e) => setCreateForm((p) => ({ ...p, month: Number(e.target.value) }))}
                >
                  {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Yıl */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Yıl</InputLabel>
                <Select
                  value={createForm.year}
                  label="Yıl"
                  onChange={(e) => setCreateForm((p) => ({ ...p, year: Number(e.target.value) }))}
                >
                  {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Vade Tarihi */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Vade Tarihi"
                type="date"
                fullWidth
                size="small"
                value={createForm.dueDate ?? ''}
                onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value || undefined }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Açıklama */}
            <Grid size={12}>
              <TextField
                label="Açıklama"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={createForm.description ?? ''}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              />
            </Grid>

            {/* PDF */}
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Fatura belgesi (PDF, isteğe bağlı)
              </Typography>
              <input
                ref={createPdfInputRef}
                type="file"
                hidden
                accept="application/pdf"
                onChange={(e) => { setCreatePdfFile(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => createPdfInputRef.current?.click()}
                  disabled={creating}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {createPdfFile ? 'PDF değiştir' : 'PDF seç'}
                </Button>
                {createPdfFile && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }} noWrap title={createPdfFile.name}>
                      {createPdfFile.name}
                    </Typography>
                    <Button type="button" size="small" onClick={() => setCreatePdfFile(null)} disabled={creating} sx={{ textTransform: 'none' }}>
                      Kaldır
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`, background: alpha(theme.palette.primary.main, 0.03) }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ textTransform: 'none', fontWeight: 600 }}>İptal</Button>
          <Button
            onClick={handleCreateInvoice}
            variant="contained"
            disabled={creating || uploadingCreatePdf}
            startIcon={creating || uploadingCreatePdf ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, minWidth: 140, borderRadius: 2 }}
          >
            {uploadingCreatePdf ? 'PDF yükleniyor…' : creating ? 'Kaydediliyor…' : 'Fatura Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  DÜZENLE DIALOG                                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
            color: '#fff', py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
          }}
        >
          <EditIcon />
          <Box component="span" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>Fatura Düzenle</Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {editingInvoice && (
            <Paper
              elevation={0}
              sx={{ mt: 1.5, p: 2, mb: 3, borderRadius: 2, background: alpha(theme.palette.info.main, 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.15)}` }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {editingInvoice.invoiceNo}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {editingInvoice.recipient}
              </Typography>
            </Paper>
          )}

          <Grid container spacing={2.5}>
            {/* Fatura No */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Fatura No"
                fullWidth
                required
                size="small"
                value={editForm.invoiceNo ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, invoiceNo: e.target.value }))}
              />
            </Grid>

            {/* Alıcı */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Alıcı"
                fullWidth
                required
                size="small"
                value={editForm.recipient ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, recipient: e.target.value }))}
              />
            </Grid>

            {/* Tutar */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Tutar (₺)"
                type="number"
                fullWidth
                required
                size="small"
                value={editForm.amount ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Durum */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Durum</InputLabel>
                <Select
                  value={editForm.status ?? ''}
                  label="Durum"
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as InvoiceStatus }))}
                >
                  {STATUS_OPTIONS.filter((s) => s.value !== 'ALL').map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Ay */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Ay</InputLabel>
                <Select
                  value={editForm.month ?? ''}
                  label="Ay"
                  onChange={(e) => setEditForm((p) => ({ ...p, month: Number(e.target.value) }))}
                >
                  {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Yıl */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Yıl</InputLabel>
                <Select
                  value={editForm.year ?? ''}
                  label="Yıl"
                  onChange={(e) => setEditForm((p) => ({ ...p, year: Number(e.target.value) }))}
                >
                  {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Vade Tarihi */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Vade Tarihi"
                type="date"
                fullWidth
                size="small"
                value={editForm.dueDate ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value || undefined }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Açıklama */}
            <Grid size={12}>
              <TextField
                label="Açıklama"
                fullWidth
                size="small"
                multiline
                minRows={2}
                value={editForm.description ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </Grid>

            {/* PDF bölümü */}
            {editingInvoice && (
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Fatura belgesi (PDF)
                </Typography>
                {editingInvoice.documentUrl &&
                  !editPdfFile &&
                  (canViewInvoiceDocument || canDownloadInvoiceDocument) && (
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                    {canViewInvoiceDocument && (
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => void handleViewPdf(editingInvoice)}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                      >
                        Görüntüle
                      </Button>
                    )}
                    {canDownloadInvoiceDocument && (
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() =>
                          void downloadInvoiceDocument(editingInvoice.id).catch((e: unknown) =>
                            toast.showError(getApiErrorMessage(e, 'İndirilemedi')),
                          )
                        }
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                      >
                        İndir
                      </Button>
                    )}
                  </Stack>
                )}
                <input
                  ref={editPdfInputRef}
                  type="file"
                  hidden
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setEditPdfFile(f);
                    if (f) setEditClearPdf(false);
                    e.target.value = '';
                  }}
                />
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => editPdfInputRef.current?.click()}
                    disabled={saving}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    {editPdfFile ? 'PDF değiştir' : 'Yeni PDF yükle'}
                  </Button>
                  {editPdfFile && (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }} noWrap title={editPdfFile.name}>
                        {editPdfFile.name}
                      </Typography>
                      <Button type="button" size="small" onClick={() => setEditPdfFile(null)} disabled={saving} sx={{ textTransform: 'none' }}>
                        Vazgeç
                      </Button>
                    </>
                  )}
                </Stack>
                {editingInvoice.documentUrl && (
                  <FormControlLabel
                    sx={{ mt: 1, alignItems: 'flex-start' }}
                    control={
                      <Checkbox
                        size="small"
                        checked={editClearPdf}
                        onChange={(_, c) => { setEditClearPdf(c); if (c) setEditPdfFile(null); }}
                        disabled={saving || Boolean(editPdfFile)}
                      />
                    }
                    label={<Typography variant="body2" color="text.secondary">Mevcut belgeyi kaldır</Typography>}
                  />
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`, background: alpha(theme.palette.warning.main, 0.03) }}>
          <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ textTransform: 'none', fontWeight: 600 }}>İptal</Button>
          <Button
            onClick={handleUpdateInvoice}
            variant="contained"
            disabled={saving || uploadingEditPdf}
            color="warning"
            startIcon={saving || uploadingEditPdf ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, minWidth: 140, borderRadius: 2 }}
          >
            {uploadingEditPdf ? 'PDF yükleniyor…' : saving ? 'Kaydediliyor…' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  SİL DIALOG                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: theme.palette.error.main }}
        >
          <WarningAmberIcon />
          <Box component="span" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>Faturayı Sil</Box>
        </DialogTitle>
        <DialogContent>
          {deletingInvoice && (
            <Typography variant="body1">
              <strong>{deletingInvoice.invoiceNo}</strong> numaralı,{' '}
              <strong>{deletingInvoice.recipient}</strong> alıcısına ait{' '}
              <strong>{fmtAmount(deletingInvoice.amount)}</strong> tutarındaki fatura silinecek. Bu işlem geri alınamaz.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting} sx={{ textTransform: 'none', fontWeight: 600 }}>Vazgeç</Button>
          <Button
            onClick={handleDeleteInvoice}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {deleting ? 'Siliniyor…' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  DETAY DIALOG                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
            color: '#fff', py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
          }}
        >
          <InfoOutlinedIcon />
          <Box component="span" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>Fatura Detayı</Box>
        </DialogTitle>

        {detailInvoice && (
          <DialogContent sx={{ pt: 3 }}>
            {(
              [
                ['Fatura No', detailInvoice.invoiceNo],
                ['Alıcı', detailInvoice.recipient],
                ['Tutar', fmtAmount(detailInvoice.amount)],
                ['Durum', statusLabel(detailInvoice.status)],
                ['Dönem', `${monthName(detailInvoice.month)} ${detailInvoice.year}`],
                ['Düzenleme Tarihi', fmtDate(detailInvoice.issueDate)],
                ['Vade Tarihi', fmtDate(detailInvoice.dueDate)],
                ['Açıklama', detailInvoice.description ?? '-'],
                [
                  'Kaydeden',
                  detailInvoice.createdByUser
                    ? `${detailInvoice.createdByUser.firstName} ${detailInvoice.createdByUser.lastName}`
                    : '-',
                ],
              ] as [string, string][]
            ).map(([label, value]) => (
              <Box
                key={label}
                sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</Typography>
              </Box>
            ))}

            {detailInvoice.documentUrl &&
              (canViewInvoiceDocument || canDownloadInvoiceDocument) && (
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}` }}
              >
                {canViewInvoiceDocument && (
                  <Button
                    type="button"
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => void handleViewPdf(detailInvoice)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    PDF görüntüle
                  </Button>
                )}
                {canDownloadInvoiceDocument && (
                  <Button
                    type="button"
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() =>
                      void downloadInvoiceDocument(detailInvoice.id).catch((e: unknown) =>
                        toast.showError(getApiErrorMessage(e, 'İndirilemedi')),
                      )
                    }
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    İndir
                  </Button>
                )}
              </Stack>
            )}
          </DialogContent>
        )}

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailOpen(false)} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
            Kapat
          </Button>
          {canUpdate && detailInvoice && (
            <Button
              onClick={() => { setDetailOpen(false); handleOpenEdit(detailInvoice); }}
              variant="contained"
              color="warning"
              startIcon={<EditIcon />}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Düzenle
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={invoicePdfViewerOpen}
        onClose={closeInvoicePdfViewer}
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
            <Typography variant="h6">{invoicePdfTitle}</Typography>
          </Box>
          <IconButton
            onClick={closeInvoicePdfViewer}
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
          {loadingInvoicePdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                PDF yükleniyor...
              </Typography>
            </Box>
          ) : invoicePdfBlobUrl ? (
            <DraftPdfCanvasPreview blobUrl={invoicePdfBlobUrl} variant="document" />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default InvoicesPage;
