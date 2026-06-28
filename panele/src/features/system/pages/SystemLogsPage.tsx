// src/features/system/pages/SystemLogsPage.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Drawer,
  Chip,
  Divider,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';

import { useAuth } from '../../../app/providers/AuthContext';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { getSystemLogs, getSystemLogById, type SystemLog } from '../services/systemApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';

const ENTITY_TYPES = [
  { value: '', label: 'Tümü' },
  { value: 'AUTH', label: 'Kimlik (AUTH)' },
  { value: 'USER', label: 'Kullanıcı' },
  { value: 'MEMBER', label: 'Üye' },
  { value: 'ROLE', label: 'Rol' },
  { value: 'REGION', label: 'Bölge' },
  { value: 'PROVINCE', label: 'İl' },
  { value: 'DISTRICT', label: 'İlçe' },
  { value: 'BRANCH', label: 'Şube' },
  { value: 'CONTENT', label: 'İçerik' },
  { value: 'NOTIFICATION', label: 'Bildirim' },
  { value: 'PAYMENT', label: 'Kesinti' },
  { value: 'DOCUMENT', label: 'Döküman' },
  { value: 'INSTITUTION', label: 'Kurum' },
  { value: 'APPROVAL', label: 'Onay' },
  { value: 'ACCOUNTING', label: 'Muhasebe' },
  { value: 'SYSTEM_SETTING', label: 'Sistem Ayarı' },
  { value: 'SYSTEM_LOG', label: 'Sistem Logu' },
  { value: 'PANEL_APPLICATION', label: 'Panel Başvurusu' },
  { value: 'PROFESSION', label: 'Meslek' },
  { value: 'MEMBER_GROUP', label: 'Üye Grubu' },
  { value: 'IMPORT', label: 'İçe Aktarma' },
  { value: 'REPORT', label: 'Rapor' },
];

const ACTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'LOGIN', label: 'Giriş' },
  { value: 'LOGOUT', label: 'Çıkış' },
  { value: 'LOGIN_FAILED', label: 'Başarısız Giriş' },
  { value: 'CREATE', label: 'Oluşturma' },
  { value: 'UPDATE', label: 'Güncelleme' },
  { value: 'DELETE', label: 'Silme' },
  { value: 'VIEW', label: 'Görüntüleme' },
  { value: 'APPROVE', label: 'Onay' },
  { value: 'REJECT', label: 'Red' },
];

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function actionLabel(action: string): string {
  const found = ACTIONS.find((a) => a.value === action);
  return found ? found.label : action;
}

const SystemLogsPage: React.FC = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const canViewAll = hasPermission('LOG_VIEW_ALL');
  const canViewOwn = hasPermission('LOG_VIEW_OWN_SCOPE');
  const canView = canViewAll || canViewOwn;

  const [rows, setRows] = useState<SystemLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailLog, setDetailLog] = useState<SystemLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLogs = useCallback(
    async (showLoading = true) => {
      if (!canView) return;
      if (showLoading) setLoading(true);
      try {
        const { logs: data, total: totalCount } = await getSystemLogs({
          limit: paginationModel.pageSize,
          offset: paginationModel.page * paginationModel.pageSize,
          entityType: entityType || undefined,
          action: action || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setRows(data);
        setTotal(totalCount);
      } catch (e: unknown) {
        console.error('Sistem logları alınırken hata:', e);
        toastRef.current.showError(getApiErrorMessage(e, 'Sistem logları yüklenirken bir hata oluştu.'));
      } finally {
        setLoading(false);
      }
    },
    [
      canView,
      paginationModel.page,
      paginationModel.pageSize,
      entityType,
      action,
      startDate,
      endDate,
    ],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilter = async () => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setLoading(true);
    try {
      const { logs: data, total: totalCount } = await getSystemLogs({
        limit: paginationModel.pageSize,
        offset: 0,
        entityType: entityType || undefined,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setRows(data);
      setTotal(totalCount);
    } catch (e: unknown) {
      console.error('Sistem logları alınırken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Sistem logları yüklenirken bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setEntityType('');
    setAction('');
    setStartDate('');
    setEndDate('');
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };


  const handleRowClick = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailLog(null);
    try {
      const log = await getSystemLogById(id);
      setDetailLog(log);
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Log detayı alınamadı.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: GridColDef<SystemLog>[] = [
    {
      field: 'createdAt',
      headerName: 'Tarih',
      width: 170,
      align: 'left',
      headerAlign: 'center',
      valueFormatter: (value) => (value ? formatDate(String(value)) : ''),
    },
    {
      field: 'action',
      headerName: 'İşlem',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<SystemLog>) => (
        <Chip
          size="small"
          label={actionLabel(params.row.action)}
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: theme.palette.primary.main,
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />
      ),
    },
    {
      field: 'entityType',
      headerName: 'Varlık',
      width: 150,
      align: 'left',
      headerAlign: 'center',
    },
    {
      field: 'user',
      headerName: 'Kullanıcı',
      flex: 1,
      minWidth: 180,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<SystemLog>) => {
        const u = params.row.user;
        if (!u) return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Box sx={{ py: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {u.firstName} {u.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {u.email}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'entityId',
      headerName: 'Varlık ID',
      width: 120,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
          {params.row.entityId || '—'}
        </Typography>
      ),
    },
    {
      field: 'ipAddress',
      headerName: 'IP',
      width: 130,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params) => params.row.ipAddress || '—',
    },
    {
      field: 'actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<SystemLog>) => (
        <Tooltip title="Detay" arrow placement="left">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(params.row.id);
            }}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) },
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  if (!canView) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Typography>Bu sayfaya erişim yetkiniz bulunmamaktadır.</Typography>
      </Box>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<ListAltIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Sistem Logları"
        description="Sistem işlem kayıtlarını görüntüleyin ve takip edin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
      />

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
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end" flexWrap="wrap">
            <FormControl size="medium" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <InputLabel>Varlık tipi</InputLabel>
              <Select
                value={entityType}
                label="Varlık tipi"
                onChange={(e) => setEntityType(e.target.value)}
              >
                {ENTITY_TYPES.map((opt) => (
                  <MenuItem key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="medium" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
              <InputLabel>İşlem</InputLabel>
              <Select value={action} label="İşlem" onChange={(e) => setAction(e.target.value)}>
                {ACTIONS.map((opt) => (
                  <MenuItem key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Başlangıç"
              type="date"
              size="medium"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
            />
            <TextField
              label="Bitiş"
              type="date"
              size="medium"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleFilter}
              sx={{ minWidth: 120 }}
            >
              Filtrele
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={async () => {
                handleClearFilters();
                setLoading(true);
                try {
                  const { logs: data, total: totalCount } = await getSystemLogs({
                    limit: paginationModel.pageSize,
                    offset: 0,
                  });
                  setRows(data);
                  setTotal(totalCount);
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                } catch (e: unknown) {
                  toast.showError(getApiErrorMessage(e, 'Sistem logları yüklenirken bir hata oluştu.'));
                } finally {
                  setLoading(false);
                }
              }}
            >
              Yenile
            </Button>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Box
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              height: { xs: 450, sm: 550, md: 650 },
              minHeight: { xs: 450, sm: 550, md: 650 },
              width: '100%',
              '& .MuiDataGrid-root': { border: 'none' },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                '&:focus': { outline: 'none' },
                '&:focus-within': { outline: 'none' },
              },
              '& .MuiDataGrid-columnHeaders': {
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                minHeight: '56px !important',
                maxHeight: '56px !important',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                fontSize: '0.9rem',
                color: theme.palette.text.primary,
              },
              '& .MuiDataGrid-columnHeaderTitleContainer': { justifyContent: 'center' },
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.03),
                  boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
                },
                '&:nth-of-type(even)': { backgroundColor: alpha(theme.palette.grey[50], 0.3) },
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                backgroundColor: alpha(theme.palette.grey[50], 0.5),
                minHeight: '52px',
              },
              '& .MuiDataGrid-virtualScroller': { minHeight: '200px' },
            }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.id}
              rowCount={total}
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              onRowClick={(params) => handleRowClick(params.row.id)}
            />
          </Box>
        </Box>
      </Card>

      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            p: 3,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Log detayı
          </Typography>
          <IconButton onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {detailLoading && (
          <Typography color="text.secondary">Yükleniyor...</Typography>
        )}
        {!detailLoading && detailLog && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Tarih</Typography>
              <Typography variant="body2" fontWeight={600}>{formatDate(detailLog.createdAt)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">İşlem</Typography>
              <Typography variant="body2" fontWeight={600}>{actionLabel(detailLog.action)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Varlık tipi</Typography>
              <Typography variant="body2" fontWeight={600}>{detailLog.entityType}</Typography>
            </Box>
            {detailLog.entityId && (
              <Box>
                <Typography variant="caption" color="text.secondary">Varlık ID</Typography>
                <Typography variant="body2" fontFamily="monospace">{detailLog.entityId}</Typography>
              </Box>
            )}
            {detailLog.user && (
              <Box>
                <Typography variant="caption" color="text.secondary">Kullanıcı</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {detailLog.user.firstName} {detailLog.user.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">{detailLog.user.email}</Typography>
              </Box>
            )}
            {detailLog.ipAddress && (
              <Box>
                <Typography variant="caption" color="text.secondary">IP</Typography>
                <Typography variant="body2" fontFamily="monospace">{detailLog.ipAddress}</Typography>
              </Box>
            )}
            {detailLog.userAgent && (
              <Box>
                <Typography variant="caption" color="text.secondary">User-Agent</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{detailLog.userAgent}</Typography>
              </Box>
            )}
            {detailLog.details && Object.keys(detailLog.details).length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Detaylar</Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    maxHeight: 280,
                  }}
                >
                  {JSON.stringify(detailLog.details, null, 2)}
                </Box>
              </Box>
            )}
          </Stack>
        )}
        {!detailLoading && !detailLog && (
          <Typography color="text.secondary">Detay yüklenemedi.</Typography>
        )}
      </Drawer>
    </PageLayout>
  );
};

export default SystemLogsPage;
