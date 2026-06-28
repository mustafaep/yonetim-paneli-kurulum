import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
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
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
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
  canCreateAdvance,
  canUpdateAdvance,
  canDeleteAdvance,
  canManageAdvanceDocument,
} from '../../../shared/utils/permissions';
import { getProvinces, type Province } from '../../regions/services/regionsApi';
import {
  createAdvance,
  getAdvances,
  updateAdvance,
  deleteAdvance,
  uploadAdvanceDocument,
  fetchAdvanceDocumentBlob,
  downloadAdvanceDocument,
  type CreateAdvanceDto,
  type UpdateAdvanceDto,
  type MemberAdvance,
} from '../services/accountingApi';
import { getMembers } from '../../members/services/membersApi';
import type { MemberListItem } from '../../../types/member';

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

const YEAR_OPTIONS = Array.from(
  { length: 7 },
  (_, i) => new Date().getFullYear() - i,
);

/** Liste filtresinde: 0 = seçili yılın tüm ayları */
const MONTH_FILTER_ALL = 0;

const monthName = (m: number) => MONTHS.find((x) => x.value === m)?.label ?? String(m);
const monthFilterLabel = (m: number, year: number) =>
  m === MONTH_FILTER_ALL ? `Tüm aylar (${year})` : `${monthName(m)} ${year}`;
const fmtAmount = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
};

// ─── Bileşen ──────────────────────────────────────────────────────────────────

const AdvancesPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const { user } = useAuth();

  const canAdd = canCreateAdvance(user);
  const canEditAdvance = canUpdateAdvance(user);
  const canRemoveAdvance = canDeleteAdvance(user);
  const canDoc = canManageAdvanceDocument(user);

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tabValue, setTabValue] = useState(0);

  // ── Liste durumu ─────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(false);
  const [advances, setAdvances] = useState<MemberAdvance[]>([]);

  // ── Yeni Avans dialog ─────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allMembers, setAllMembers] = useState<MemberListItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberListItem | null>(null);
  const [createForm, setCreateForm] = useState<Omit<CreateAdvanceDto, 'memberId'>>({
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    description: '',
  });
  const [createPdfFile, setCreatePdfFile] = useState<File | null>(null);
  const [uploadingCreatePdf, setUploadingCreatePdf] = useState(false);
  const createPdfInputRef = useRef<HTMLInputElement>(null);

  // ── Düzenle dialog ────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<MemberAdvance | null>(null);
  const [editForm, setEditForm] = useState<UpdateAdvanceDto>({});
  const [saving, setSaving] = useState(false);
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editClearPdf, setEditClearPdf] = useState(false);
  const [uploadingEditPdf, setUploadingEditPdf] = useState(false);
  const editPdfInputRef = useRef<HTMLInputElement>(null);

  // ── Sil dialog ────────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAdvance, setDeletingAdvance] = useState<MemberAdvance | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Detay dialog ─────────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAdvance, setDetailAdvance] = useState<MemberAdvance | null>(null);

  const [advancePdfViewerOpen, setAdvancePdfViewerOpen] = useState(false);
  const [advancePdfBlobUrl, setAdvancePdfBlobUrl] = useState<string | null>(null);
  const [advancePdfTitle, setAdvancePdfTitle] = useState('');
  const [loadingAdvancePdf, setLoadingAdvancePdf] = useState(false);

  // ── Veri yükleme ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadProvinces();
  }, []);

  useEffect(() => {
    loadAdvances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, yearFilter, monthFilter, provinceFilter]);

  const loadProvinces = async () => {
    try {
      setProvinces(await getProvinces());
    } catch {
      // sessizce geç
    }
  };

  const loadAdvances = async () => {
    setLoading(true);
    try {
      const filters: Parameters<typeof getAdvances>[0] = {
        year: yearFilter,
        ...(monthFilter !== MONTH_FILTER_ALL ? { month: monthFilter } : {}),
      };
      if (searchText.trim()) filters.search = searchText.trim();
      if (provinceFilter !== 'ALL') filters.provinceId = provinceFilter;
      setAdvances(await getAdvances(filters));
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Avans listesi yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  // ── İstatistikler (Tab 1 için hesaplamalar) ───────────────────────────────
  const stats = useMemo(() => {
    const total = advances.reduce((sum, a) => {
      const v = typeof a.amount === 'string' ? parseFloat(a.amount) : a.amount;
      return sum + (Number.isNaN(v) ? 0 : v);
    }, 0);
    const byMonth: Record<number, { count: number; total: number }> = {};
    for (const a of advances) {
      const v = typeof a.amount === 'string' ? parseFloat(a.amount) : a.amount;
      if (!byMonth[a.month]) byMonth[a.month] = { count: 0, total: 0 };
      byMonth[a.month].count++;
      byMonth[a.month].total += Number.isNaN(v) ? 0 : v;
    }
    return { total, count: advances.length, byMonth };
  }, [advances]);

  // ── Yeni avans: oluştur ───────────────────────────────────────────────────
  const handleCreateAdvance = async () => {
    if (!selectedMember) {
      toast.showError('Lütfen bir üye seçin');
      return;
    }
    if (!createForm.amount.trim()) {
      toast.showError('Avans tutarı zorunludur');
      return;
    }
    setCreating(true);
    try {
      let documentUrl: string | undefined;
      if (createPdfFile) {
        setUploadingCreatePdf(true);
        try {
          const up = await uploadAdvanceDocument(
            createPdfFile,
            selectedMember.id,
            createForm.month,
            createForm.year,
            createPdfFile.name,
          );
          documentUrl = up.fileUrl;
        } finally {
          setUploadingCreatePdf(false);
        }
      }
      const created = await createAdvance({
        memberId: selectedMember.id,
        ...createForm,
        description: createForm.description?.trim() || undefined,
        documentUrl,
      });
      toast.showSuccess('Avans kaydı oluşturuldu');
      setCreateOpen(false);
      setCreatePdfFile(null);
      setAdvances((prev) => [created, ...prev]);
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Avans oluşturulamadı'));
    } finally {
      setCreating(false);
    }
  };

  const handleOpenCreate = async () => {
    setSelectedMember(null);
    setCreatePdfFile(null);
    setCreateForm({
      amount: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      description: '',
    });
    setCreateOpen(true);
    if (allMembers.length === 0) {
      setMembersLoading(true);
      try {
        setAllMembers(await getMembers('ACTIVE'));
      } catch (e) {
        toast.showError(getApiErrorMessage(e, 'Üyeler yüklenemedi'));
      } finally {
        setMembersLoading(false);
      }
    }
  };

  // ── Düzenle ───────────────────────────────────────────────────────────────
  const handleOpenEdit = (adv: MemberAdvance) => {
    setEditingAdvance(adv);
    setEditPdfFile(null);
    setEditClearPdf(false);
    setEditForm({
      amount: String(adv.amount),
      month: adv.month,
      year: adv.year,
      description: adv.description ?? '',
    });
    setEditOpen(true);
  };

  const closeAdvancePdfViewer = useCallback(() => {
    setAdvancePdfViewerOpen(false);
    setLoadingAdvancePdf(false);
    setAdvancePdfBlobUrl((prev) => {
      if (prev) window.URL.revokeObjectURL(prev);
      return null;
    });
    setAdvancePdfTitle('');
  }, []);

  const handleViewAdvancePdf = useCallback(
    async (adv: MemberAdvance) => {
      if (!adv.documentUrl) {
        toast.showError('Bu avans için belge yok.');
        return;
      }
      setAdvancePdfTitle(
        adv.documentUrl.split('/').pop() || `Avans — ${adv.member?.firstName ?? ''} ${adv.member?.lastName ?? ''}`.trim() || 'Avans belgesi',
      );
      setAdvancePdfViewerOpen(true);
      setLoadingAdvancePdf(true);
      setAdvancePdfBlobUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return null;
      });
      try {
        const blob = await fetchAdvanceDocumentBlob(adv.id);
        setAdvancePdfBlobUrl(window.URL.createObjectURL(blob));
      } catch (e) {
        toast.showError(getApiErrorMessage(e, 'Belge açılamadı'));
        closeAdvancePdfViewer();
      } finally {
        setLoadingAdvancePdf(false);
      }
    },
    [toast, closeAdvancePdfViewer],
  );

  const handleUpdateAdvance = async () => {
    if (!editingAdvance) return;
    if (!editForm.amount?.trim()) {
      toast.showError('Avans tutarı zorunludur');
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateAdvanceDto = {
        ...editForm,
        description: editForm.description?.trim() || undefined,
      };
      if (editPdfFile) {
        setUploadingEditPdf(true);
        try {
          const up = await uploadAdvanceDocument(
            editPdfFile,
            editingAdvance.member.id,
            editForm.month ?? editingAdvance.month,
            editForm.year ?? editingAdvance.year,
            editPdfFile.name,
          );
          payload.documentUrl = up.fileUrl;
        } finally {
          setUploadingEditPdf(false);
        }
      } else if (editClearPdf && editingAdvance.documentUrl) {
        payload.clearDocument = true;
      }
      const updated = await updateAdvance(editingAdvance.id, payload);
      toast.showSuccess('Avans güncellendi');
      setEditOpen(false);
      setEditPdfFile(null);
      setEditClearPdf(false);
      setAdvances((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Avans güncellenemedi'));
    } finally {
      setSaving(false);
    }
  };

  // ── Sil ───────────────────────────────────────────────────────────────────
  const handleOpenDelete = (adv: MemberAdvance) => {
    setDeletingAdvance(adv);
    setDeleteOpen(true);
  };

  const handleDeleteAdvance = async () => {
    if (!deletingAdvance) return;
    setDeleting(true);
    try {
      await deleteAdvance(deletingAdvance.id);
      toast.showSuccess('Avans silindi');
      setDeleteOpen(false);
      setAdvances((prev) => prev.filter((a) => a.id !== deletingAdvance.id));
      setDeletingAdvance(null);
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Avans silinemedi'));
    } finally {
      setDeleting(false);
    }
  };

  // ── Detay ─────────────────────────────────────────────────────────────────
  const handleOpenDetail = (adv: MemberAdvance) => {
    setDetailAdvance(adv);
    setDetailOpen(true);
  };

  // ── Tablo sütunları ───────────────────────────────────────────────────────
  const columns: GridColDef<MemberAdvance>[] = useMemo(
    () => [
      {
        field: 'fullName',
        headerName: 'Ad Soyad',
        flex: 1.4,
        minWidth: 180,
        valueGetter: (_v, row) =>
          `${row.member.firstName} ${row.member.lastName}`,
      },
      {
        field: 'province',
        headerName: 'İl',
        flex: 1,
        minWidth: 130,
        valueGetter: (_v, row) => row.member.province?.name ?? '-',
      },
      {
        field: 'registrationNumber',
        headerName: 'Kayıt No',
        flex: 0.9,
        minWidth: 110,
        valueGetter: (_v, row) => row.registrationNumber ?? '-',
      },
      {
        field: 'advanceDate',
        headerName: 'İşlem Tarihi',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) =>
          new Date(row.advanceDate).toLocaleDateString('tr-TR'),
      },
      {
        field: 'month',
        headerName: 'Ay',
        flex: 0.8,
        minWidth: 100,
        valueGetter: (_v, row) => monthName(row.month),
      },
      {
        field: 'year',
        headerName: 'Yıl',
        flex: 0.6,
        minWidth: 80,
      },
      {
        field: 'amount',
        headerName: 'Avans Miktarı',
        flex: 1,
        minWidth: 150,
        align: 'right',
        headerAlign: 'right',
        valueGetter: (_v, row) => fmtAmount(row.amount),
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
          row.documentUrl ? (
            <Tooltip title="PDF görüntüle">
              <IconButton
                size="small"
                onClick={() => void handleViewAdvancePdf(row)}
                sx={{ color: theme.palette.error.main }}
              >
                <PictureAsPdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Typography variant="caption" color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        field: 'actions',
        headerName: 'İşlemler',
        width: canEditAdvance || canRemoveAdvance ? 120 : 56,
        sortable: false,
        filterable: false,
        align: 'center',
        headerAlign: 'center',
        cellClassName: 'advance-actions-cell',
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
            {canEditAdvance && (
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
            {canRemoveAdvance && (
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
    ],
    [canEditAdvance, canRemoveAdvance, theme, handleViewAdvancePdf],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout>
      <PageHeader
        icon={
          <MonetizationOnIcon
            sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }}
          />
        }
        title="Avans Sistemi"
        description="Üyelere ait avans kayıtlarını listeleyin ve yönetin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          canAdd ? (
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
              Avans Ekle
            </Button>
          ) : undefined
        }
        mobileContent={
          canAdd ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              fullWidth
              onClick={handleOpenCreate}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
            >
              Avans Ekle
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
            <Tab
              icon={<ListAltIcon fontSize="small" />}
              iconPosition="start"
              label="Avans Listesi"
            />
            <Tab
              icon={<BarChartIcon fontSize="small" />}
              iconPosition="start"
              label="Avans İstatistikleri"
            />
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
                    placeholder="Ad, soyad veya kayıt no ile ara…"
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#fff',
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <FormControl
                    size="small"
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                  >
                    <InputLabel>Yıl</InputLabel>
                    <Select
                      value={yearFilter}
                      label="Yıl"
                      onChange={(e) => setYearFilter(Number(e.target.value))}
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <FormControl
                    size="small"
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                  >
                    <InputLabel>Ay</InputLabel>
                    <Select
                      value={monthFilter}
                      label="Ay"
                      onChange={(e) => setMonthFilter(Number(e.target.value))}
                    >
                      <MenuItem value={MONTH_FILTER_ALL}>Tüm aylar</MenuItem>
                      {MONTHS.map((m) => (
                        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                  <FormControl
                    size="small"
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' } }}
                  >
                    <InputLabel>İl</InputLabel>
                    <Select
                      value={provinceFilter}
                      label="İl"
                      onChange={(e) => setProvinceFilter(e.target.value)}
                    >
                      <MenuItem value="ALL">Tümü</MenuItem>
                      {provinces.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 2 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      background: alpha(theme.palette.info.main, 0.06),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <MonetizationOnIcon
                      fontSize="small"
                      sx={{ color: theme.palette.info.main }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: theme.palette.info.main, whiteSpace: 'nowrap' }}
                    >
                      {advances.length} kayıt
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
                    '& .MuiDataGrid-cell': {
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                    },
                    '& .advance-actions-cell': {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 0,
                    },
                    '& .advance-actions-cell .MuiDataGrid-cellContent': {
                      width: '100%',
                      height: '100%',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                  }}
                >
                  <DataGrid
                    rows={advances}
                    columns={columns}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    initialState={{
                      pagination: { paginationModel: { pageSize: 25, page: 0 } },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    localeText={{
                      noRowsLabel: 'Avans kaydı bulunamadı',
                    }}
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
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)}, ${alpha(theme.palette.primary.light, 0.03)})`,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                    {stats.count}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Toplam Kayıt
                  </Typography>
                </Paper>
              </Grid>

              {/* Toplam Tutar */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.06)}, ${alpha(theme.palette.success.light, 0.03)})`,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.success.main }}>
                    {stats.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Toplam Tutar
                  </Typography>
                </Paper>
              </Grid>

              {/* Ortalama */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.06)}, ${alpha(theme.palette.info.light, 0.03)})`,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.info.main }}>
                    {stats.count
                      ? (stats.total / stats.count).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
                      : '0,00'}{' '}₺
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Ortalama Avans
                  </Typography>
                </Paper>
              </Grid>

              {/* Dönem */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.06)}, ${alpha(theme.palette.warning.light, 0.03)})`,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.warning.main }}>
                    {monthFilterLabel(monthFilter, yearFilter)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Seçili Dönem
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Aylık dağılım */}
            {Object.keys(stats.byMonth).length > 0 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Aylık Dağılım
                </Typography>
                <Stack spacing={1.5}>
                  {MONTHS.filter((m) => stats.byMonth[m.value]).map((m) => {
                    const d = stats.byMonth[m.value];
                    const pct = stats.total > 0 ? (d.total / stats.total) * 100 : 0;
                    return (
                      <Box key={m.value}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {m.label}
                          </Typography>
                          <Stack direction="row" spacing={2}>
                            <Chip
                              label={`${d.count} kayıt`}
                              size="small"
                              sx={{ fontSize: '0.75rem' }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                              {d.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </Typography>
                          </Stack>
                        </Box>
                        <Box
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${pct}%`,
                              borderRadius: 4,
                              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                              transition: 'width 0.5s ease',
                            }}
                          />
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
                <Typography>Seçili dönemde avans verisi yok</Typography>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  YENI AVANS DIALOG                                                 */}
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
            color: '#fff',
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <MonetizationOnIcon />
          <Box component="span" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
            Yeni Avans Ekle
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2.5}>
            {/* Üye Seç */}
            <Grid size={12} sx={{ mt: 1.5 }}>
              <Autocomplete
                options={allMembers}
                loading={membersLoading}
                value={selectedMember}
                onChange={(_, val) => setSelectedMember(val)}
                getOptionLabel={(m) =>
                  `${m.firstName} ${m.lastName}${m.registrationNumber ? ` — ${m.registrationNumber}` : ''}`
                }
                filterOptions={(options, { inputValue }) => {
                  const q = inputValue.toLowerCase();
                  return options.filter(
                    (m) =>
                      m.firstName.toLowerCase().includes(q) ||
                      m.lastName.toLowerCase().includes(q) ||
                      (m.registrationNumber ?? '').toLowerCase().includes(q),
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Üye Seç"
                    required
                    size="small"
                    placeholder="Ad, soyad veya kayıt no ile filtrele…"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {membersLoading && <CircularProgress size={16} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                noOptionsText="Üye bulunamadı"
                loadingText="Yükleniyor…"
              />
            </Grid>

            <Grid size={12}><Divider /></Grid>

            {/* Tutar */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Avans Tutarı (₺)"
                type="number"
                fullWidth
                required
                size="small"
                value={createForm.amount}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, amount: e.target.value }))
                }
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Ay */}
            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Ay</InputLabel>
                <Select
                  value={createForm.month}
                  label="Ay"
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, month: Number(e.target.value) }))
                  }
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
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
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, year: Number(e.target.value) }))
                  }
                >
                  {YEAR_OPTIONS.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </Grid>

            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Avans belgesi (PDF, isteğe bağlı)
              </Typography>
              {!canDoc ? (
                <Typography variant="body2" color="text.disabled">
                  Belge eklemek için rolünüze &quot;Avans belgesi yönet&quot; izni atanmalıdır.
                </Typography>
              ) : (
                <>
                  <input
                    ref={createPdfInputRef}
                    type="file"
                    hidden
                    accept="application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setCreatePdfFile(f);
                      e.target.value = '';
                    }}
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
                        <Button
                          type="button"
                          size="small"
                          onClick={() => setCreatePdfFile(null)}
                          disabled={creating}
                          sx={{ textTransform: 'none' }}
                        >
                          Kaldır
                        </Button>
                      </>
                    )}
                  </Stack>
                </>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            background: alpha(theme.palette.primary.main, 0.03),
          }}
        >
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={creating}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            İptal
          </Button>
          <Button
            onClick={handleCreateAdvance}
            variant="contained"
            disabled={creating || uploadingCreatePdf}
            startIcon={
              creating || uploadingCreatePdf ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <AddIcon />
              )
            }
            sx={{ textTransform: 'none', fontWeight: 700, minWidth: 140, borderRadius: 2 }}
          >
            {uploadingCreatePdf
              ? 'PDF yükleniyor…'
              : creating
                ? 'Kaydediliyor…'
                : 'Avans Ekle'}
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
            color: '#fff',
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <EditIcon />
          <Box component="span" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>
            Avans Düzenle
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {editingAdvance && (
            <Paper
              elevation={0}
              sx={{
                mt: 1.5,
                p: 2,
                mb: 3,
                borderRadius: 2,
                background: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {editingAdvance.member.firstName} {editingAdvance.member.lastName}
                {editingAdvance.registrationNumber && (
                  <span style={{ color: theme.palette.text.secondary, fontWeight: 400 }}>
                    {' '}— {editingAdvance.registrationNumber}
                  </span>
                )}
              </Typography>
              {editingAdvance.member.province && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {editingAdvance.member.province.name}
                </Typography>
              )}
            </Paper>
          )}

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Avans Tutarı (₺)"
                type="number"
                fullWidth
                required
                size="small"
                value={editForm.amount ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Ay</InputLabel>
                <Select
                  value={editForm.month ?? ''}
                  label="Ay"
                  onChange={(e) => setEditForm((p) => ({ ...p, month: Number(e.target.value) }))}
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Yıl</InputLabel>
                <Select
                  value={editForm.year ?? ''}
                  label="Yıl"
                  onChange={(e) => setEditForm((p) => ({ ...p, year: Number(e.target.value) }))}
                >
                  {YEAR_OPTIONS.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

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

            {editingAdvance && (
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Avans belgesi (PDF)
                </Typography>
                {editingAdvance.documentUrl && !editPdfFile && (
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                    <Button
                      type="button"
                      size="small"
                      variant="outlined"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => void handleViewAdvancePdf(editingAdvance)}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                    >
                      Görüntüle
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() =>
                        void downloadAdvanceDocument(editingAdvance.id).catch((e: unknown) =>
                          toast.showError(getApiErrorMessage(e, 'İndirilemedi')),
                        )
                      }
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                    >
                      İndir
                    </Button>
                  </Stack>
                )}
                {!canDoc ? (
                  editingAdvance.documentUrl ? null : (
                    <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                      Belge eklemek veya kaldırmak için &quot;Avans belgesi yönet&quot; izni gerekir.
                    </Typography>
                  )
                ) : (
                  <>
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
                          <Button
                            type="button"
                            size="small"
                            onClick={() => setEditPdfFile(null)}
                            disabled={saving}
                            sx={{ textTransform: 'none' }}
                          >
                            Vazgeç
                          </Button>
                        </>
                      )}
                    </Stack>
                    {editingAdvance.documentUrl && (
                      <FormControlLabel
                        sx={{ mt: 1, alignItems: 'flex-start' }}
                        control={
                          <Checkbox
                            size="small"
                            checked={editClearPdf}
                            onChange={(_, c) => {
                              setEditClearPdf(c);
                              if (c) setEditPdfFile(null);
                            }}
                            disabled={saving || Boolean(editPdfFile)}
                          />
                        }
                        label={
                          <Typography variant="body2" color="text.secondary">
                            Mevcut belgeyi kaldır
                          </Typography>
                        }
                      />
                    )}
                  </>
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            background: alpha(theme.palette.warning.main, 0.03),
          }}
        >
          <Button
            onClick={() => setEditOpen(false)}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            İptal
          </Button>
          <Button
            onClick={handleUpdateAdvance}
            variant="contained"
            disabled={saving || uploadingEditPdf}
            color="warning"
            startIcon={
              saving || uploadingEditPdf ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <EditIcon />
              )
            }
            sx={{ textTransform: 'none', fontWeight: 700, minWidth: 140, borderRadius: 2 }}
          >
            {uploadingEditPdf
              ? 'PDF yükleniyor…'
              : saving
                ? 'Kaydediliyor…'
                : 'Güncelle'}
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
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            color: theme.palette.error.main,
          }}
        >
          <WarningAmberIcon />
          <Box component="span" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>Avansı Sil</Box>
        </DialogTitle>
        <DialogContent>
          {deletingAdvance && (
            <Typography variant="body1">
              <strong>
                {deletingAdvance.member.firstName} {deletingAdvance.member.lastName}
              </strong>{' '}
              adlı üyeye ait{' '}
              <strong>{fmtAmount(deletingAdvance.amount)}</strong> tutarındaki{' '}
              <strong>
                {monthName(deletingAdvance.month)} {deletingAdvance.year}
              </strong>{' '}
              dönemi avans kaydı silinecek. Bu işlem geri alınamaz.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Vazgeç
          </Button>
          <Button
            onClick={handleDeleteAdvance}
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
            color: '#fff',
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <InfoOutlinedIcon />
          <Box component="span" sx={{ fontWeight: 700, fontSize: '1.25rem' }}>Avans Detayı</Box>
        </DialogTitle>

        {detailAdvance && (
          <DialogContent sx={{ pt: 3 }}>
            {(
              [
                ['Üye', `${detailAdvance.member.firstName} ${detailAdvance.member.lastName}`],
                ['İl', detailAdvance.member.province?.name ?? '-'],
                ['Kayıt No', detailAdvance.registrationNumber ?? '-'],
                ['Avans Tutarı', fmtAmount(detailAdvance.amount)],
                ['Dönem', `${monthName(detailAdvance.month)} ${detailAdvance.year}`],
                [
                  'İşlem Tarihi',
                  new Date(detailAdvance.advanceDate).toLocaleDateString('tr-TR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  }),
                ],
                ['Açıklama', detailAdvance.description ?? '-'],
                [
                  'Kaydeden',
                  detailAdvance.createdByUser
                    ? `${detailAdvance.createdByUser.firstName} ${detailAdvance.createdByUser.lastName}`
                    : '-',
                ],
              ] as [string, string][]
            ).map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
                  {value}
                </Typography>
              </Box>
            ))}
            {detailAdvance.documentUrl && (
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                }}
              >
                <Button
                  type="button"
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => void handleViewAdvancePdf(detailAdvance)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  PDF görüntüle
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() =>
                    void downloadAdvanceDocument(detailAdvance.id).catch((e: unknown) =>
                      toast.showError(getApiErrorMessage(e, 'İndirilemedi')),
                    )
                  }
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  İndir
                </Button>
              </Stack>
            )}
          </DialogContent>
        )}

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDetailOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Kapat
          </Button>
          {canEditAdvance && detailAdvance && (
            <Button
              onClick={() => {
                setDetailOpen(false);
                handleOpenEdit(detailAdvance);
              }}
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
        open={advancePdfViewerOpen}
        onClose={closeAdvancePdfViewer}
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
            <Typography variant="h6">{advancePdfTitle}</Typography>
          </Box>
          <IconButton
            onClick={closeAdvancePdfViewer}
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
          {loadingAdvancePdf ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                PDF yükleniyor...
              </Typography>
            </Box>
          ) : advancePdfBlobUrl ? (
            <DraftPdfCanvasPreview blobUrl={advancePdfBlobUrl} variant="document" />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default AdvancesPage;
