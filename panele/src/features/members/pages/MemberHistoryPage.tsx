import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  InputAdornment,
  Button,
  Grid,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import {
  getMemberHistoryList,
  type MemberHistoryListResponse,
} from '../services/membersApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';

const MemberHistoryPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();

  const [rows, setRows] = useState<MemberHistoryListResponse['items']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE'>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<MemberHistoryListResponse['items'][number] | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);

      const params: any = {
        page: 1,
        pageSize: 200,
      };

      if (searchText.trim()) {
        params.search = searchText.trim();
      }
      if (actionFilter !== 'ALL') {
        params.action = actionFilter;
      }
      if (fromDate) {
        params.from = new Date(fromDate).toISOString();
      }
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        params.to = d.toISOString();
      }

      const data = await getMemberHistoryList(params);
      setRows(data.items);
    } catch (e: unknown) {
      console.error('Üye hareketleri alınırken hata:', e);
      setError(getApiErrorMessage(e, 'Üye hareketleri alınırken bir hata oluştu'));
      toast.showError(getApiErrorMessage(e, 'Üye hareketleri alınırken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    return rows;
  }, [rows]);

  const getActionLabel = (action: string) => {
    const upper = action?.toUpperCase?.() ?? action;
    if (upper === 'CREATE') return 'Kayıt Oluşturma';
    if (upper === 'UPDATE') return 'Güncelleme';
    if (upper === 'DELETE') return 'Silme';
    return upper || '-';
  };

  const columns: GridColDef<MemberHistoryListResponse['items'][number]>[] = [
    {
      field: 'createdAt',
      headerName: 'Tarih / Saat',
      flex: 1,
      minWidth: 170,
      valueGetter: (_value, row) => {
        if (!row.createdAt) return '-';
        const d = new Date(row.createdAt);
        return d.toLocaleString('tr-TR');
      },
    },
    {
      field: 'nationalId',
      headerName: 'TC Kimlik No',
      flex: 1,
      minWidth: 150,
      valueGetter: (_value, row) => row.member?.nationalId ?? '-',
    },
    {
      field: 'memberName',
      headerName: 'Üye Adı Soyadı',
      flex: 1.4,
      minWidth: 200,
      valueGetter: (_value, row) => {
        if (!row.member) return '-';
        return `${row.member.firstName} ${row.member.lastName}`;
      },
    },
    {
      field: 'action',
      headerName: 'İşlem',
      flex: 1,
      minWidth: 140,
      valueGetter: (value) => getActionLabel(String(value)),
    },
    {
      field: 'changedByUser',
      headerName: 'İşlemi Yapan Kullanıcı',
      flex: 1.4,
      minWidth: 200,
      valueGetter: (_value, row) => {
        if (!row.changedByUser) return '-';
        const fullName = `${row.changedByUser.firstName} ${row.changedByUser.lastName}`;
        return `${fullName} (${row.changedByUser.email})`;
      },
    },
    {
      field: 'ipAddress',
      headerName: 'IP',
      flex: 0.8,
      minWidth: 140,
      valueGetter: (_value, row) => row.ipAddress ?? '-',
    },
    {
      field: 'userAgent',
      headerName: 'Tarayıcı / İstemci',
      flex: 1.2,
      minWidth: 220,
      valueGetter: (_value, row) => row.userAgent ?? '-',
    },
    {
      field: 'summary',
      headerName: 'Özet',
      flex: 1.6,
      minWidth: 260,
      sortable: false,
      valueGetter: (_value, row) => {
        if (row.action === 'CREATE') {
          return 'Üye kaydı oluşturuldu';
        }
        if (row.action === 'DELETE') {
          return 'Üye kaydı silindi';
        }
        const updatedFields = row.updatedFields
          ? Object.keys(row.updatedFields)
          : [];
        const deletedFields = row.deletedFields ?? [];
        const parts: string[] = [];
        if (updatedFields.length > 0) {
          parts.push(`Güncellenen alanlar: ${updatedFields.join(', ')}`);
        }
        if (deletedFields.length > 0) {
          parts.push(`Silinen alanlar: ${deletedFields.join(', ')}`);
        }
        if (parts.length === 0) return '-';
        return parts.join(' | ');
      },
    },
  ];

  const handleOpenDetails = (row: MemberHistoryListResponse['items'][number]) => {
    setSelectedHistory(row);
    setDetailsOpen(true);
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<HistoryIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Üye Hareketleri"
        description="Üyelikler üzerinde yapılan tüm işlemlerin geçmişini görüntüleyin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => void loadData()}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.25,
            }}
          >
            Listeyi Yenile
          </Button>
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 4,
            borderRadius: 3,
            boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.15)}`,
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <FilterListIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, textAlign: 'left' }}>
                Filtrele ve Ara
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', textAlign: 'left' }}>
                Üye hareketlerini tarih, işlem tipi ve kullanıcıya göre filtreleyin
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2.5}>
            <Grid xs={12} sm={6} md={4} lg={3}>
              <TextField
                placeholder="TC, ad soyad veya kullanıcı..."
                size="medium"
                fullWidth
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.4rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    borderRadius: 2.5,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: '2px',
                      },
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid xs={12} sm={6} md={4} lg={3}>
              <FormControl
                size="medium"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    borderRadius: 2.5,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                  },
                }}
              >
                <InputLabel>İşlem Tipi</InputLabel>
                <Select
                  value={actionFilter}
                  label="İşlem Tipi"
                  onChange={(e) => setActionFilter(e.target.value as any)}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: actionFilter !== 'ALL' ? 600 : 400,
                      color: actionFilter !== 'ALL' ? theme.palette.primary.main : 'inherit',
                    },
                  }}
                >
                  <MenuItem value="ALL">Tümü</MenuItem>
                  <MenuItem value="CREATE">Kayıt Oluşturma</MenuItem>
                  <MenuItem value="UPDATE">Güncelleme</MenuItem>
                  <MenuItem value="DELETE">Silme</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid xs={12} sm={6} md={4} lg={3}>
              <TextField
                label="Başlangıç Tarihi"
                type="date"
                size="medium"
                fullWidth
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    borderRadius: 2.5,
                  },
                }}
              />
            </Grid>

            <Grid xs={12} sm={6} md={4} lg={3}>
              <TextField
                label="Bitiş Tarihi"
                type="date"
                size="medium"
                fullWidth
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    borderRadius: 2.5,
                  },
                }}
              />
            </Grid>
          </Grid>

          {(searchText.trim() || actionFilter !== 'ALL' || fromDate || toDate) && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.08,
                )} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <FilterListIcon fontSize="small" />
                  Aktif Filtreler
                </Typography>
                <Button
                  size="small"
                  startIcon={<CloseIcon />}
                  onClick={() => {
                    setSearchText('');
                    setActionFilter('ALL');
                    setFromDate('');
                    setToDate('');
                    void loadData();
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: theme.palette.error.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                    },
                  }}
                >
                  Tümünü Temizle
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {searchText.trim() && (
                  <Chip
                    label={`Arama: "${searchText}"`}
                    onDelete={() => setSearchText('')}
                    deleteIcon={<CloseIcon />}
                    color="primary"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                    }}
                  />
                )}
                {actionFilter !== 'ALL' && (
                  <Chip
                    label={`İşlem: ${getActionLabel(actionFilter)}`}
                    onDelete={() => setActionFilter('ALL')}
                    deleteIcon={<CloseIcon />}
                    color="primary"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                    }}
                  />
                )}
                {fromDate && (
                  <Chip
                    label={`Başlangıç: ${fromDate}`}
                    onDelete={() => setFromDate('')}
                    deleteIcon={<CloseIcon />}
                    color="primary"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                    }}
                  />
                )}
                {toDate && (
                  <Chip
                    label={`Bitiş: ${toDate}`}
                    onDelete={() => setToDate('')}
                    deleteIcon={<CloseIcon />}
                    color="primary"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                    }}
                  />
                )}
              </Box>
            </Box>
          )}

          {!loading && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.info.main,
                  0.08,
                )} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.info.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.9rem',
                }}
              >
                <HistoryIcon fontSize="small" />
                {filteredRows.length} hareket listeleniyor
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Box
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              height: { xs: 450, sm: 550, md: 650 },
              '& .MuiDataGrid-root': {
                border: 'none',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-columnHeaders': {
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.06,
                )} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                borderRadius: 0,
                minHeight: '56px !important',
                maxHeight: '56px !important',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                fontSize: '0.9rem',
                color: theme.palette.text.primary,
              },
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.03),
                  boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
                },
                '&:nth-of-type(even)': {
                  backgroundColor: alpha(theme.palette.grey[50], 0.3),
                },
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                backgroundColor: alpha(theme.palette.grey[50], 0.5),
                minHeight: '52px',
              },
            }}
          >
            <DataGrid
              rows={filteredRows}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.id}
              initialState={{
                pagination: { paginationModel: { pageSize: 25, page: 0 } },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              onRowClick={(params) => handleOpenDetails(params.row)}
              localeText={{
                noRowsLabel: 'Kayıt bulunamadı',
                MuiTablePagination: {
                  labelRowsPerPage: 'Sayfa başına satır:',
                },
              }}
            />
          </Box>
        </Box>
      </Card>

      <Dialog
        open={detailsOpen && !!selectedHistory}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedHistory(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HistoryIcon />
            <Typography variant="h6" fontWeight={700}>
              Hareket Detayı
            </Typography>
          </Box>
          <IconButton
            onClick={() => {
              setDetailsOpen(false);
              setSelectedHistory(null);
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          {selectedHistory && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2">
                <strong>Tarih:</strong>{' '}
                {new Date(selectedHistory.createdAt).toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Üye:</strong>{' '}
                {selectedHistory.member
                  ? `${selectedHistory.member.nationalId} - ${selectedHistory.member.firstName} ${selectedHistory.member.lastName}`
                  : '-'}
              </Typography>
              <Typography variant="body2">
                <strong>İşlem:</strong> {getActionLabel(selectedHistory.action)}
              </Typography>
              <Typography variant="body2">
                <strong>İşlemi Yapan:</strong>{' '}
                {selectedHistory.changedByUser
                  ? `${selectedHistory.changedByUser.firstName} ${selectedHistory.changedByUser.lastName} (${selectedHistory.changedByUser.email})`
                  : selectedHistory.changedBy}
              </Typography>
              <Typography variant="body2">
                <strong>IP / Tarayıcı:</strong>{' '}
                {selectedHistory.ipAddress || '-'}{' '}
                {selectedHistory.userAgent
                  ? ` / ${selectedHistory.userAgent}`
                  : ''}
              </Typography>

              {selectedHistory.updatedFields && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Güncellenen Alanlar
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.grey[900], 0.04),
                      fontSize: '0.8rem',
                      maxHeight: 260,
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedHistory.updatedFields, null, 2)}
                  </Box>
                </Box>
              )}

              {selectedHistory.deletedFields &&
                selectedHistory.deletedFields.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Silinen Alanlar
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: alpha(
                          theme.palette.error.main,
                          0.04,
                        ),
                        fontSize: '0.8rem',
                      }}
                    >
                      {selectedHistory.deletedFields.join(', ')}
                    </Box>
                  </Box>
                )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default MemberHistoryPage;

