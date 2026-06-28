// src/features/professions/pages/ProfessionsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  alpha,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import type { Profession } from '../services/professionsApi';
import {
  getProfessions,
  getAllProfessions,
  createProfession,
  updateProfession,
  deleteProfession,
} from '../services/professionsApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const ProfessionsPage: React.FC = () => {
  const theme = useTheme();
  const [rows, setRows] = useState<Profession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null);
  const [form, setForm] = useState<{
    name: string;
    isActive: boolean;
  }>({
    name: '',
    isActive: true,
  });

  const { hasPermission } = useAuth();
  const toast = useToast();
  const canListProfession = hasPermission('PROFESSION_VIEW');
  const canCreateProfession = hasPermission('PROFESSION_CREATE');
  const canUpdateProfession = hasPermission('PROFESSION_UPDATE');
  const canDeleteProfession = hasPermission('PROFESSION_DELETE');
  const canManageProfession = canCreateProfession || canUpdateProfession || canDeleteProfession;
  const canShowActionButtons = canUpdateProfession || canDeleteProfession;

  const loadProfessions = async () => {
    if (!canListProfession) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = showInactive ? await getAllProfessions() : await getProfessions();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error('Meslek/Unvanlar alınırken hata:', e);
      setRows([]);
      toast.showError(getApiErrorMessage(e, 'Meslek/Unvanlar yüklenirken bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const handleOpenNew = () => {
    if (!canCreateProfession) {
      toast.showError('Meslek/Unvan oluşturmak için yetkiniz yok.');
      return;
    }
    setEditingProfession(null);
    setForm({
        name: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (profession: Profession) => {
    if (!canUpdateProfession) return;
    setEditingProfession(profession);
    setForm({
      name: profession.name,
      isActive: profession.isActive,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleFormChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.showWarning('Meslek/Unvan adı zorunludur.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ...(editingProfession ? { isActive: form.isActive } : {}),
      };

      if (editingProfession) {
        if (!canUpdateProfession) {
          toast.showError('Meslek/Unvan güncellemek için yetkiniz yok.');
          setSaving(false);
          return;
        }
        await updateProfession(editingProfession.id, payload);
        toast.showSuccess('Meslek/Unvan başarıyla güncellendi.');
      } else {
        if (!canCreateProfession) {
          toast.showError('Meslek/Unvan oluşturmak için yetkiniz yok.');
          setSaving(false);
          return;
        }
        await createProfession({ name: payload.name });
        toast.showSuccess('Meslek/Unvan başarıyla oluşturuldu.');
      }

      await loadProfessions();
      setDialogOpen(false);
    } catch (e: unknown) {
      console.error('Meslek/Unvan kaydedilirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Meslek/Unvan kaydedilirken bir hata oluştu.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteProfession) {
      toast.showError('Meslek/Unvan silmek için yetkiniz yok.');
      return;
    }
    if (!window.confirm('Bu meslek/unvanı silmek istediğinize emin misiniz?')) {
      return;
    }
    try {
      await deleteProfession(id);
      toast.showSuccess('Meslek/Unvan başarıyla silindi.');
      await loadProfessions();
    } catch (e: unknown) {
      console.error('Meslek/Unvan silinirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Meslek/Unvan silinirken bir hata oluştu.'));
    }
  };

  const columns: GridColDef<Profession>[] = [
    {
      field: 'name',
      headerName: 'Meslek/Unvan Adı',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
          <Typography sx={{ fontWeight: 500 }}>{params.row.name}</Typography>
        </Box>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Durum',
      flex: 0.8,
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.isActive ? 'Aktif' : 'Pasif'}
          color={params.row.isActive ? 'success' : 'default'}
          size="small"
          icon={params.row.isActive ? <CheckCircleIcon /> : <CancelIcon />}
          sx={{
            fontWeight: 600,
            '& .MuiChip-icon': {
              fontSize: '1rem',
            },
          }}
        />
      ),
    },
    ...(canShowActionButtons
      ? [
          {
            field: 'actions',
            headerName: 'İşlemler',
            flex: 1,
            minWidth: 150,
            sortable: false,
            renderCell: (params: { row: Profession }) => (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {canUpdateProfession && (
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(params.row);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {canDeleteProfession && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(params.row.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ),
          } as GridColDef<Profession>,
        ]
      : []),
  ];

  if (!canListProfession) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          background: '#fff',
        }}
      >
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Yetkisiz İşlem
            </Typography>
            <Typography>Meslek/Unvan listesini görüntülemek için gerekli izne sahip değilsiniz.</Typography>
          </Alert>
        </Box>
      </Card>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<WorkIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Meslek/Unvan Yönetimi"
        description="Meslek/Unvanları görüntüleyin ve yönetin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          canCreateProfession ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenNew}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                backgroundColor: 'white',
                color: theme.palette.primary.main,
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.9),
                  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                },
              }}
            >
              Yeni Meslek/Unvan
            </Button>
          ) : undefined
        }
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
        {/* Filtre Bölümü */}
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {!loading && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.info.main,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <WorkIcon fontSize="small" />
                  Toplam {rows.length} meslek/unvan bulundu
                </Typography>
              </Paper>
            )}
            {canManageProfession && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    size="small"
                  />
                }
                label="Pasif olanları göster"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  },
                }}
              />
            )}
          </Box>
        </Box>
        
        {/* İçerik Bölümü */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>

          {/* Tablo */}
          <Box
            sx={{
              height: { xs: 400, sm: 500, md: 600 },
              minHeight: { xs: 400, sm: 500, md: 600 },
              '& .MuiDataGrid-root': {
                border: 'none',
                borderRadius: 2,
              },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 0,
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-row': {
                cursor: canUpdateProfession ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.02),
                },
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                backgroundColor: alpha(theme.palette.background.default, 0.5),
              },
            }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              loading={loading}
              onRowDoubleClick={(params) => {
                const profession = rows.find((x) => x.id === params.id);
                if (profession && canUpdateProfession) handleOpenEdit(profession);
              }}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25, page: 0 },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-virtualScroller': {
                  minHeight: '200px',
                },
              }}
            />
          </Box>
        </Box>
      </Card>

      {/* Meslek/Unvan Ekle / Düzenle Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.2)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: 'white',
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <WorkIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {editingProfession ? 'Meslek/Unvan Düzenle' : 'Yeni Meslek/Unvan'}
          </Typography>
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            pt: 3,
          }}
        >
          <TextField
            label="Meslek/Unvan Adı"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  <WorkIcon sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                </Box>
              ),
            }}
          />
          {editingProfession && (
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => handleFormChange('isActive', e.target.checked)}
                />
              }
              label="Aktif"
              sx={{
                '& .MuiFormControlLabel-label': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, background: alpha(theme.palette.primary.main, 0.04) }}>
          <Button
            onClick={handleCloseDialog}
            disabled={saving}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 100,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default ProfessionsPage;
