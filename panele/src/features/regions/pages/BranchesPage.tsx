// src/pages/regions/BranchesPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
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
  Alert,
  useTheme,
  alpha,
  Chip,
  CircularProgress,
  Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Divider,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useNavigate } from 'react-router-dom';

import type { Branch, DeleteBranchDto } from '../services/branchesApi';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  assignBranchPresident,
} from '../services/branchesApi';
import { getUsers } from '../../users/services/usersApi';
import { getProvinces, getDistricts, type Province, type District } from '../services/regionsApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import type { UserListItem } from '../../../types/user';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const BranchesPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [branchToAssign, setBranchToAssign] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteActionType, setDeleteActionType] = useState<DeleteBranchDto['memberActionType']>('TRANSFER_TO_BRANCH');
  const [deleteTargetBranchId, setDeleteTargetBranchId] = useState<string>('');

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selectedPresidentId, setSelectedPresidentId] = useState<string>('');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    provinceId: '',
    districtId: '',
  });

  const canManage = hasPermission('BRANCH_MANAGE');
  const canAssignPresident = hasPermission('BRANCH_ASSIGN_PRESIDENT');

  useEffect(() => {
    loadBranches();
    loadUsers();
    loadProvinces();
  }, []);

  const loadProvinces = async () => {
    try {
      const data = await getProvinces();
      setProvinces(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error('İller alınırken hata:', e);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'İller alınırken bir hata oluştu.');
    }
  };

  const loadDistrictsForProvince = async (provinceId?: string) => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    try {
      const data = await getDistricts(provinceId);
      setDistricts(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error('İlçeler alınırken hata:', e);
      setDistricts([]);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'İlçeler alınırken bir hata oluştu.');
    }
  };

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await getBranches();
      setRows(data);
    } catch (e: unknown) {
      console.error('Şubeler yüklenirken hata:', e);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'Şubeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };


  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e: unknown) {
      console.error('Kullanıcılar yüklenirken hata:', e);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'Kullanıcılar yüklenirken bir hata oluştu.');
    }
  };

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      const provinceId = branch.provinceId || '';
      setFormData({
        name: branch.name,
        provinceId,
        districtId: branch.districtId || '',
      });
      if (provinceId) {
        loadDistrictsForProvince(provinceId);
      } else {
        setDistricts([]);
      }
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        provinceId: '',
        districtId: '',
      });
      setDistricts([]);
    }
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBranch(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Şube adı gereklidir');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
          provinceId: formData.provinceId && formData.provinceId.trim() !== '' ? formData.provinceId : undefined,
          districtId: formData.districtId && formData.districtId.trim() !== '' ? formData.districtId : undefined,
      };
      if (editingBranch) {
        await updateBranch(editingBranch.id, payload);
        toast.success('Şube başarıyla güncellendi');
      } else {
        await createBranch(payload);
        toast.success('Şube başarıyla oluşturuldu');
      }
      handleCloseDialog();
      loadBranches();
    } catch (e: unknown) {
      console.error('Şube kaydedilirken hata:', e);
      setError(getApiErrorMessage(e, 'Şube kaydedilirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!branchToAssign || !selectedPresidentId) return;

    setAssigning(true);
    try {
      await assignBranchPresident(branchToAssign.id, { presidentId: selectedPresidentId });
      toast.success('Şube başkanı başarıyla atandı');
      setAssignDialogOpen(false);
      setBranchToAssign(null);
        setSelectedPresidentId('');
      loadBranches();
    } catch (e: unknown) {
      console.error('Başkan atanırken hata:', e);
      toast.error(getApiErrorMessage(e, 'Başkan atanırken bir hata oluştu'));
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;

    if (!deleteTargetBranchId) {
      toast.error('Lütfen hedef şube seçin');
      return;
    }

    setDeleting(true);
    try {
      const dto: DeleteBranchDto = {
        memberActionType: deleteActionType,
        targetBranchId: deleteTargetBranchId,
      };
      await deleteBranch(branchToDelete.id, dto);
      toast.success('Şube başarıyla silindi');
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
      setDeleteActionType('TRANSFER_TO_BRANCH');
      setDeleteTargetBranchId('');
      loadBranches();
    } catch (e: unknown) {
      console.error('Şube silinirken hata:', e);
      toast.error(getApiErrorMessage(e, 'Şube silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Şube Adı',
      flex: 1,
      minWidth: 200,
      align: 'left',
      headerAlign: 'left',
    },
    {
      field: 'president',
      headerName: 'Şube Başkanı',
      width: 200,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const president = params.row.president;
        return president ? `${president.firstName} ${president.lastName}` : '-';
      },
    },
    {
      field: 'memberCount',
      headerName: 'Üye Sayısı',
      width: 120,
      align: 'left',
      headerAlign: 'left',
      valueGetter: (value) => value ?? 0,
    },
    {
      field: 'isActive',
      headerName: 'Aktif / Pasif',
      width: 120,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Aktif' : 'Pasif'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 250,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const branch = params.row as Branch;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
            <Tooltip title="Detay">
              <IconButton
                size="small"
                onClick={() => navigate(`/regions/branches/${branch.id}`)}
                sx={{ color: theme.palette.info.main }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canAssignPresident && (
              <Tooltip title="Başkan Ata">
                <IconButton
                  size="small"
                  onClick={() => {
                    setBranchToAssign(branch);
                    setSelectedPresidentId(branch.presidentId || '');
                    setAssignDialogOpen(true);
                  }}
                  sx={{ color: theme.palette.secondary.main }}
                >
                  <PersonIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canManage && (
              <>
                <Tooltip title="Düzenle">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(branch)}
                    sx={{ color: theme.palette.primary.main }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Sil">
                  <IconButton
                    size="small"
                    onClick={() => {
                      // Toplam şube sayısını kontrol et
                      if (rows.length <= 1) {
                        toast.error('Sistemde en az 1 şube bulunmalıdır. Son kalan şubeyi silemezsiniz.');
                        return;
                      }
                      setBranchToDelete(branch);
                      setDeleteActionType('TRANSFER_TO_BRANCH');
                      setDeleteTargetBranchId('');
                      setDeleteDialogOpen(true);
                    }}
                    sx={{ color: theme.palette.error.main }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <PageLayout>
      {/* Modern Header */}
      <PageHeader
        icon={<BusinessIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Şube Yönetimi"
        description="Şubeleri yönetin ve başkan atayın"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
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
                  Yeni Şube
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
          background: '#fff',
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          sx={{
            border: 'none',
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
            },
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              justifyContent: 'center',
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
            '& .MuiDataGrid-virtualScroller': {
              minHeight: '200px',
            },
          }}
        />
        </Box>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
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
          <BusinessIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {editingBranch ? 'Şube Düzenle' : 'Yeni Şube Oluştur'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                borderRadius: 2,
                boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.15)}`,
              }} 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Şube Adı"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <FormControl 
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel>İl (Opsiyonel)</InputLabel>
              <Select
                label="İl (Opsiyonel)"
                value={formData.provinceId}
                onChange={(e) => {
                  const provinceId = e.target.value as string;
                  setFormData({
                    ...formData,
                    provinceId,
                    districtId: '',
                  });
                  loadDistrictsForProvince(provinceId);
                }}
              >
                <MenuItem value="">
                  <em>İl seçin (opsiyonel)</em>
                </MenuItem>
                {provinces.map((province) => (
                  <MenuItem key={province.id} value={province.id}>
                    {province.name} {province.code && `(${province.code})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl 
              fullWidth 
              disabled={!formData.provinceId}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel>İlçe (Opsiyonel)</InputLabel>
              <Select
                label="İlçe (Opsiyonel)"
                value={formData.districtId}
                onChange={(e) =>
                  setFormData({ ...formData, districtId: e.target.value as string })
                }
              >
                <MenuItem value="">
                  <em>İlçe seçin (opsiyonel)</em>
                </MenuItem>
                {districts.map((district) => (
                  <MenuItem key={district.id} value={district.id}>
                    {district.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
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
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
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
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign President Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onClose={() => setAssignDialogOpen(false)} 
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
          background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
          color: 'white',
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <PersonIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Şube Başkanı Ata
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ pt: 1 }}>
            <FormControl 
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel>Başkan Seçimi</InputLabel>
              <Select
                value={selectedPresidentId}
                onChange={(e) => setSelectedPresidentId(e.target.value)}
                label="Başkan Seçimi"
              >
                <MenuItem value="">
                  <em>Başkan seçmeyin</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, background: alpha(theme.palette.secondary.main, 0.04) }}>
          <Button 
            onClick={() => setAssignDialogOpen(false)} 
            disabled={assigning}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleAssign}
            variant="contained"
            color="secondary"
            disabled={assigning || !selectedPresidentId}
            startIcon={assigning ? <CircularProgress size={16} /> : <PersonIcon />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 160,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.3)}`,
              }
            }}
          >
            {assigning ? 'Atanıyor...' : 'Ata'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.error.main, 0.15)}`,
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
            Şubeyi Sil
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                "{branchToDelete?.name}" adlı şubeyi silmek istediğinize emin misiniz?
              </Typography>
              <Typography variant="body2">
                Bu şubeye bağlı {branchToDelete?.memberCount || 0} üye bulunmaktadır. 
                Şubeyi silmeden önce üyelere ne yapılacağını seçmeniz gerekmektedir.
              </Typography>
            </Alert>

            <Box>
              <FormLabel sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.95rem', display: 'block' }}>
                Üyelere Ne Yapılacak?
              </FormLabel>
              <RadioGroup
                value={deleteActionType}
                onChange={(e) => setDeleteActionType(e.target.value as DeleteBranchDto['memberActionType'])}
                sx={{ gap: 1 }}
              >
                <FormControlLabel
                  value="TRANSFER_TO_BRANCH"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Başka Bir Şubeye Taşı
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler seçilen şubeye taşınacak, durumları değişmeyecek
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
                  value="TRANSFER_AND_DEACTIVATE"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Başka Bir Şubeye Taşı ve Pasif Et
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler seçilen şubeye taşınacak ve pasif duruma getirilecek
                      </Typography>
                    </Box>
                  }
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    p: 1.5,
                    m: 0,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.warning.main, 0.04),
                    },
                  }}
                />
                <FormControlLabel
                  value="TRANSFER_AND_CANCEL"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Başka Bir Şubeye Taşı ve İptal Et
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler seçilen şubeye taşınacak ve üyelikleri iptal edilecek (İstifa)
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
                <FormControlLabel
                  value="TRANSFER_DEACTIVATE_AND_CANCEL"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Başka Bir Şubeye Taşı, Pasif Et ve İptal Et
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler seçilen şubeye taşınacak, pasif edilecek ve üyelikleri iptal edilecek
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

            <Divider />

            <FormControl fullWidth required>
              <InputLabel>Hedef Şube</InputLabel>
              <Select
                value={deleteTargetBranchId}
                onChange={(e) => setDeleteTargetBranchId(e.target.value)}
                label="Hedef Şube"
                disabled={deleting}
                sx={{
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.divider, 0.2),
                  },
                }}
              >
                <MenuItem value="">
                  <em>Hedef şube seçin</em>
                </MenuItem>
                {rows
                  .filter(branch => branch.id !== branchToDelete?.id && branch.isActive)
                  .map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.memberCount !== undefined && ` (${branch.memberCount} üye)`}
                    </MenuItem>
                  ))}
              </Select>
              <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
                Üyeler bu şubeye taşınacaktır
              </Alert>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setBranchToDelete(null);
              setDeleteActionType('TRANSFER_TO_BRANCH');
              setDeleteTargetBranchId('');
            }} 
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
            disabled={deleting || !deleteTargetBranchId}
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
            {deleting ? 'Siliniyor...' : 'Şubeyi Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default BranchesPage;


