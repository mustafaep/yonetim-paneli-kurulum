// src/pages/accounting/TevkifatCentersPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Paper,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BusinessIcon from '@mui/icons-material/Business';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import BadgeIcon from '@mui/icons-material/Badge';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import {
  getTevkifatCenters,
  getTevkifatTitles,
  createTevkifatTitle,
  updateTevkifatTitle,
  deleteTevkifatTitle,
  type TevkifatCenter,
  type TevkifatTitle,
  type CreateTevkifatTitleDto,
} from '../services/accountingApi';
import DeleteTevkifatCenterDialog from '../components/DeleteTevkifatCenterDialog';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const TevkifatCentersPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(0);
  
  // Tevkifat Merkezileri state
  const [rows, setRows] = useState<TevkifatCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCenter, setDeletingCenter] = useState<TevkifatCenter | null>(null);

  // Tevkifat Unvanları state
  const [titles, setTitles] = useState<TevkifatTitle[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<TevkifatTitle | null>(null);
  const [titleForm, setTitleForm] = useState<CreateTevkifatTitleDto>({ name: '' });
  const [savingTitle, setSavingTitle] = useState(false);
  const [deleteTitleDialogOpen, setDeleteTitleDialogOpen] = useState(false);
  const [deletingTitle, setDeletingTitle] = useState<TevkifatTitle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canViewCenter =
    hasPermission('TEVKIFAT_CENTER_VIEW') ||
    hasPermission('TEVKIFAT_CENTER_CREATE') ||
    hasPermission('TEVKIFAT_CENTER_UPDATE') ||
    hasPermission('TEVKIFAT_CENTER_DELETE');
  const canCreateCenter = hasPermission('TEVKIFAT_CENTER_CREATE');
  const canUpdateCenter = hasPermission('TEVKIFAT_CENTER_UPDATE');
  const canDeleteCenter = hasPermission('TEVKIFAT_CENTER_DELETE');
  const canViewTitles = hasPermission('TEVKIFAT_TITLE_VIEW');
  const canCreateTitle = hasPermission('TEVKIFAT_TITLE_CREATE');
  const canUpdateTitle = hasPermission('TEVKIFAT_TITLE_UPDATE');
  const canDeleteTitle = hasPermission('TEVKIFAT_TITLE_DELETE');
  const canManageTitles =
    canCreateTitle || canUpdateTitle || canDeleteTitle;
  const canShowTitleActions = canUpdateTitle || canDeleteTitle;

  useEffect(() => {
    if (canViewCenter) {
      loadCenters();
      if (canViewTitles || canManageTitles) {
        loadTitles();
      }
    }
  }, [canViewCenter, canViewTitles, canManageTitles]);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const data = await getTevkifatCenters();
      setRows(data);
    } catch (e: unknown) {
      console.error('Tevkifat merkezleri yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Tevkifat merkezleri yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const loadTitles = async () => {
    setLoadingTitles(true);
    try {
      const data = await getTevkifatTitles();
      setTitles(data);
    } catch (e: unknown) {
      console.error('Tevkifat unvanları yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Tevkifat unvanları yüklenirken bir hata oluştu'));
    } finally {
      setLoadingTitles(false);
    }
  };

  const handleDeleteSuccess = () => {
    loadCenters();
  };

  // Sadece aktif tevkifat merkezlerini göster
  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch && row.isActive;
  });


  // Tevkifat Unvanları handler'ları
  const handleOpenTitleDialog = (title?: TevkifatTitle) => {
    if (title && !canUpdateTitle) return;
    if (!title && !canCreateTitle) return;
    if (title) {
      setEditingTitle(title);
      setTitleForm({ name: title.name });
    } else {
      setEditingTitle(null);
      setTitleForm({ name: '' });
    }
    setTitleDialogOpen(true);
  };

  const handleCloseTitleDialog = () => {
    setTitleDialogOpen(false);
    setEditingTitle(null);
      setTitleForm({ name: '' });
  };

  const handleSaveTitle = async () => {
    if (!titleForm.name.trim()) {
      toast.showError('Unvan adı gereklidir');
      return;
    }

    setSavingTitle(true);
    try {
      if (editingTitle) {
        if (!canUpdateTitle) {
          toast.showError('Tevkifat unvanı güncelleme yetkiniz yok');
          return;
        }
        await updateTevkifatTitle(editingTitle.id, titleForm);
        toast.showSuccess('Tevkifat unvanı güncellendi');
      } else {
        if (!canCreateTitle) {
          toast.showError('Tevkifat unvanı oluşturma yetkiniz yok');
          return;
        }
        await createTevkifatTitle(titleForm);
        toast.showSuccess('Tevkifat unvanı oluşturuldu');
      }
      handleCloseTitleDialog();
      loadTitles();
    } catch (e: unknown) {
      console.error('Tevkifat unvanı kaydedilirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Tevkifat unvanı kaydedilirken bir hata oluştu'));
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDeleteTitle = async () => {
    if (!canDeleteTitle) {
      toast.showError('Tevkifat unvanı silme yetkiniz yok');
      return;
    }
    if (!deletingTitle) return;

    setDeleting(true);
    try {
      await deleteTevkifatTitle(deletingTitle.id);
      toast.showSuccess('Tevkifat unvanı silindi');
      setDeleteTitleDialogOpen(false);
      setDeletingTitle(null);
      loadTitles();
    } catch (e: unknown) {
      console.error('Tevkifat unvanı silinirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Tevkifat unvanı silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const handleActivateTitle = async (title: TevkifatTitle) => {
    if (!canUpdateTitle) {
      toast.showError('Tevkifat unvanı güncelleme yetkiniz yok');
      return;
    }
    setDeleting(true);
    try {
      await updateTevkifatTitle(title.id, { isActive: true });
      toast.showSuccess('Tevkifat unvanı aktifleştirildi');
      loadTitles();
    } catch (e: unknown) {
      console.error('Tevkifat unvanı aktifleştirilirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Tevkifat unvanı aktifleştirilirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<TevkifatCenter>[] = [
    {
      field: 'name',
      headerName: 'Tevkifat Merkezi Adı',
      flex: 1,
      minWidth: 250,
      align: 'left',
      headerAlign: 'left',
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 200,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const center = params.row as TevkifatCenter;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
            <Tooltip title="Detay" arrow>
              <IconButton
                size="small"
                onClick={() => navigate(`/accounting/tevkifat-centers/${center.id}`)}
                sx={{
                  color: theme.palette.info.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.info.main, 0.08),
                  },
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {(canUpdateCenter || canDeleteCenter) && (
              <>
                {canUpdateCenter && (
                  <Tooltip title="Düzenle" arrow>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/accounting/tevkifat-centers/${center.id}/edit`)}
                      sx={{
                        color: theme.palette.primary.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDeleteCenter && (
                  <Tooltip title="Kaldır" arrow>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingCenter(center);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{
                        color: theme.palette.error.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.error.main, 0.08),
                        },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Box>
        );
      },
    },
  ];

  if (!canViewCenter) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            borderRadius: 3,
            boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.15)}`,
          }}
        >
          <BusinessIcon sx={{ fontSize: 64, color: theme.palette.error.main, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            Yetkisiz İşlem
          </Typography>
          <Typography color="text.secondary">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<BusinessIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Tevkifat Merkezleri"
        description="Kurumlardan gelen toplu Kesinti kesintilerinin merkezi takibi ve unvan yönetimi"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          (activeTab === 0 ? canCreateCenter : canCreateTitle) ? (
            <Button
              variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  if (activeTab === 0) {
                    navigate('/accounting/tevkifat-centers/new');
                  } else {
                    handleOpenTitleDialog();
                  }
                }}
                size="large"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.45)}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                }}
              >
                {activeTab === 0 ? 'Yeni Tevkifat Merkezi' : 'Yeni Unvan Ekle'}
              </Button>
            ) : undefined
        }
        mobileContent={
          (activeTab === 0 ? canCreateCenter : canCreateTitle) ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              fullWidth
              onClick={() => {
                if (activeTab === 0) {
                  navigate('/accounting/tevkifat-centers/new');
                } else {
                  handleOpenTitleDialog();
                }
              }}
              size="large"
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                fontSize: '1rem',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
              }}
            >
              {activeTab === 0 ? 'Yeni Tevkifat Merkezi' : 'Yeni Unvan Ekle'}
            </Button>
          ) : undefined
        }
      />
      {/* Tabs */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          mb: 3,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 64,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab 
            icon={<BusinessIcon />} 
            iconPosition="start"
            label="Tevkifat Merkezleri" 
          />
          <Tab 
            icon={<BadgeIcon />} 
            iconPosition="start"
            label="Tevkifat Unvanları" 
          />
        </Tabs>
      </Card>
      {/* Ana Kart - Filtre ve Tablo */}
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
        {activeTab === 0 ? (
          <>
            {/* Filtre Bölümü */}
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
                  <SearchIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Filtrele ve Ara
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Tevkifat merkezlerini hızlıca bulun ve filtreleyin
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                <TextField
                  placeholder="Ara (isim)..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  size="medium"
                  sx={{
                    flexGrow: 1,
                    minWidth: { xs: '100%', sm: 300 },
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.4rem' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Sonuç Sayısı */}
              {!loading && (
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
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
                    <BusinessIcon fontSize="small" />
                    {filteredRows.length} tevkifat merkezi listeleniyor
                    {filteredRows.length !== rows.length && ` (Toplam ${rows.length} merkezden)`}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Tablo Bölümü */}
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>

              <Box
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                  height: { xs: 450, sm: 550, md: 650 },
                  minHeight: { xs: 450, sm: 550, md: 650 },
                  '& .MuiDataGrid-root': {
                    border: 'none',
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
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
                  '& .MuiDataGrid-virtualScroller': {
                    minHeight: '200px',
                  },
                }}
              >
                <DataGrid
                  rows={filteredRows}
                  columns={columns}
                  loading={loading}
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 25 },
                    },
                  }}
                  disableRowSelectionOnClick
                  localeText={{
                    noRowsLabel: 'Tevkifat merkezi bulunamadı',
                  }}
                />
              </Box>
            </Box>
          </>
        ) : activeTab === 1 ? (
          /* Tevkifat Unvanları Tab */
          (<Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {loadingTitles ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                }}
              >
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow 
                        sx={{ 
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                        }}
                      >
                        <TableCell align="left" sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>Unvan Adı</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>Durum</TableCell>
                        {canShowTitleActions && (
                          <TableCell align="left" sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>İşlemler</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {titles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canShowTitleActions ? 3 : 2} align="center" sx={{ py: 6 }}>
                            <BadgeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
                            <Typography variant="body2" color="text.secondary">
                              Henüz unvan eklenmemiş
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        titles.map((title, index) => (
                          <TableRow 
                            key={title.id}
                            sx={{
                              transition: 'all 0.2s ease',
                              backgroundColor: index % 2 === 0 ? 'transparent' : alpha(theme.palette.grey[50], 0.3),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                                boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
                              },
                            }}
                          >
                        <TableCell align="left">
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>{title.name}</Typography>
                        </TableCell>
                        <TableCell align="left">
                          <Chip
                            label={title.isActive ? 'Aktif' : 'Pasif'}
                            color={title.isActive ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        {canShowTitleActions && (
                          <TableCell align="left">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
                              {canUpdateTitle && (
                                <Tooltip title="Düzenle" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenTitleDialog(title)}
                                    sx={{ 
                                      color: theme.palette.primary.main,
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {title.isActive ? (
                                <>
                                  {canDeleteTitle && (
                                    <Tooltip title="Sil" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setDeletingTitle(title);
                                          setDeleteTitleDialogOpen(true);
                                        }}
                                        sx={{ 
                                          color: theme.palette.error.main,
                                          '&:hover': {
                                            backgroundColor: alpha(theme.palette.error.main, 0.1),
                                          },
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </>
                              ) : (
                                canUpdateTitle && (
                                  <Tooltip title="Aktifleştir" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleActivateTitle(title)}
                                      disabled={deleting}
                                      sx={{ 
                                        color: theme.palette.success.main,
                                        '&:hover': {
                                          backgroundColor: alpha(theme.palette.success.main, 0.1),
                                        },
                                      }}
                                    >
                                      <RestoreIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )
                              )}
                            </Box>
                          </TableCell>
                        )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>)
        ) : null}
      </Card>
      {/* Tevkifat Unvanları Dialog'ları */}
      {/* Unvan Ekle/Düzenle Dialog */}
      <Dialog 
        open={titleDialogOpen} 
        onClose={handleCloseTitleDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <BadgeIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {editingTitle ? 'Tevkifat Unvanı Düzenle' : 'Yeni Tevkifat Unvanı Ekle'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="Unvan Adı"
            value={titleForm.name}
            onChange={(e) => setTitleForm({ name: e.target.value })}
            fullWidth
            margin="normal"
            required
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, background: alpha(theme.palette.primary.main, 0.04) }}>
          <Button 
            onClick={handleCloseTitleDialog} 
            disabled={savingTitle}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleSaveTitle}
            variant="contained"
            disabled={savingTitle}
            startIcon={savingTitle ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 160,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }
            }}
          >
            {savingTitle ? 'Kaydediliyor...' : editingTitle ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Unvan Sil Dialog */}
      <Dialog 
        open={deleteTitleDialogOpen} 
        onClose={() => setDeleteTitleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
          color: 'white',
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <DeleteIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Tevkifat Unvanını Sil</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ mb: 1 }}>
            "{deletingTitle?.name}" adlı tevkifat unvanını kalıcı olarak silmek istediğinize emin misiniz?
          </Typography>
          <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Bu işlem geri alınamaz. Unvan veritabanından tamamen silinecektir.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, background: alpha(theme.palette.error.main, 0.04) }}>
          <Button 
            onClick={() => setDeleteTitleDialogOpen(false)} 
            disabled={deleting}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleDeleteTitle}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 160,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
              }
            }}
          >
            {deleting ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Tevkifat Merkezi Kaldırma Dialog */}
      <DeleteTevkifatCenterDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingCenter(null);
        }}
        center={deletingCenter ? {
          id: deletingCenter.id,
          name: deletingCenter.name,
          memberCount: deletingCenter.memberCount,
        } : null}
        availableCenters={rows}
        loadingCenters={loading}
        onSuccess={handleDeleteSuccess}
      />
    </PageLayout>
  );
};

export default TevkifatCentersPage;
