// src/features/roles/pages/RolesListPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  TextField,
  Button,
  IconButton,
  Tooltip,
  InputAdornment,
  useTheme,
  alpha,
  Paper,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import type { RoleListItem, CustomRole } from '../../../types/role';
import { getRoles, deleteRole } from '../services/rolesApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import ConfirmDialog from '../../../shared/components/common/ConfirmDialog';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { useAuth } from '../../../app/providers/AuthContext';

const RolesListPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canViewDetail = hasPermission('ROLE_VIEW');
  const canCreate = hasPermission('ROLE_CREATE');
  const canEdit =
    hasPermission('ROLE_UPDATE') && hasPermission('ROLE_MANAGE_PERMISSIONS');
  const canDelete = hasPermission('ROLE_DELETE');
  const [rows, setRows] = useState<RoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  // Filtrelenmiş veriler
  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Arama filtresi
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter((row) => {
        if ('isSystemRole' in row && row.isSystemRole) {
          return row.name.toLowerCase().includes(searchLower);
        } else {
          const customRole = row as CustomRole;
          return (
            customRole.name.toLowerCase().includes(searchLower) ||
            (customRole.description &&
              customRole.description.toLowerCase().includes(searchLower))
          );
        }
      });
    }

    return filtered;
  }, [rows, searchText]);

  const columns: GridColDef<RoleListItem>[] = [
    {
      field: 'name',
      headerName: 'Rol Adı',
      flex: 1.5,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 500 }}>{params.row.name}</Typography>
          {'isSystemRole' in params.row && params.row.isSystemRole && (
            <Chip 
              label="Sistem" 
              size="small" 
              color="primary" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'description',
      headerName: 'Açıklama',
      flex: 2,
      minWidth: 200,
      renderCell: (params) => {
        if ('isSystemRole' in params.row && params.row.isSystemRole) {
          return <Typography variant="body2" color="text.secondary">Sistem rolü</Typography>;
        }
        return (
          <Typography variant="body2">
            {(params.row as CustomRole).description || '-'}
          </Typography>
        );
      },
    },
    {
      field: 'permissions',
      headerName: 'İzin Sayısı',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={`${params.row.permissions.length} izin`}
          size="small"
          icon={<SecurityIcon />}
          color="info"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'isActive',
      headerName: 'Durum',
      width: 120,
      renderCell: (params) => {
        if ('isSystemRole' in params.row && params.row.isSystemRole) {
          return <Chip label="Aktif" color="success" size="small" sx={{ fontWeight: 500 }} />;
        }
        const customRole = params.row as CustomRole;
        return customRole.isActive ? (
          <Chip label="Aktif" color="success" size="small" sx={{ fontWeight: 500 }} />
        ) : (
          <Chip label="Pasif" size="small" />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<RoleListItem>) => {
        // Sistem rolleri için sadece görüntüle
        if ('isSystemRole' in params.row && params.row.isSystemRole) {
          return (
            <Tooltip title="Detay">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  // Sistem rolleri için detay sayfası yok, sadece izinleri göster
                }}
                sx={{
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        }

        const customRole = params.row as CustomRole;
        const isAdmin = customRole.name === 'ADMIN';
        
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={canViewDetail ? 'Detay' : 'Rol detayı için ROLE_VIEW gerekir'}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canViewDetail}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canViewDetail) {
                      navigate(`/roles/${customRole.id}`);
                    }
                  }}
                  sx={{
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                isAdmin
                  ? 'ADMIN rolü düzenlenemez'
                  : !canEdit
                    ? 'Düzenlemek için ROLE_UPDATE ve ROLE_MANAGE_PERMISSIONS gerekir'
                    : 'Düzenle'
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={isAdmin || !canEdit}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAdmin && canEdit) {
                      navigate(`/roles/${customRole.id}/edit`);
                    }
                  }}
                  sx={{
                    color: theme.palette.info.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.info.main, 0.08),
                    },
                    '&.Mui-disabled': {
                      color: theme.palette.action.disabled,
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                isAdmin
                  ? 'ADMIN rolü silinemez'
                  : !canDelete
                    ? 'Rol silmek için ROLE_DELETE gerekir'
                    : 'Sil'
              }
            >
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={isAdmin || !canDelete}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAdmin && canDelete) {
                      setRoleToDelete(customRole);
                      setDeleteDialogOpen(true);
                    }
                  }}
                  sx={{
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.error.main, 0.08),
                    },
                    '&.Mui-disabled': {
                      color: theme.palette.action.disabled,
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getRoles();
        setRows(data);
      } catch (e: unknown) {
        console.error('Roller alınırken hata:', e);
        toast.showError(getApiErrorMessage(e, 'Roller alınırken bir hata oluştu.'));
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleDelete = async () => {
    if (!roleToDelete) return;

    setDeleting(true);
    try {
      await deleteRole(roleToDelete.id);
      setRows((prev) => prev.filter((r) => !('id' in r) || r.id !== roleToDelete.id));
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    } catch (e: unknown) {
      console.error('Rol silinirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Rol silinirken bir hata oluştu. Rol kullanıcılara atanmış olabilir.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
          icon={<AdminPanelSettingsIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="Roller"
          description="Sistem rolleri ve özel rolleri görüntüleyin ve yönetin"
          color={theme.palette.primary.main}
          darkColor={theme.palette.primary.dark}
          lightColor={theme.palette.primary.light}
          rightContent={
            canCreate ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/roles/new')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': {
                    boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                }}
              >
                Yeni Rol
              </Button>
            ) : undefined
          }
          mobileContent={
            canCreate ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                fullWidth
                onClick={() => navigate('/roles/new')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                Yeni Rol Ekle
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
        {/* Arama Bölümü */}
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
            <TextField
              placeholder="Rol adı veya açıklama ile ara..."
              size="small"
              fullWidth
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fff',
                  borderRadius: 2,
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                },
              }}
            />
        </Box>

        {/* İçerik Bölümü */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {/* Sonuç Sayısı */}
            {!loading && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
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
                  <AdminPanelSettingsIcon fontSize="small" />
                  Toplam {filteredRows.length} rol bulundu
                </Typography>
              </Paper>
            )}

          {/* Tablo */}
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
                getRowId={(row) => ('id' in row ? row.id : `system-${row.name}`)}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25, page: 0 } },
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteDialogOpen(false);
            setRoleToDelete(null);
          }
        }}
        onConfirm={handleDelete}
        title="Rolü Sil"
        message={
          roleToDelete
            ? `${roleToDelete.name} rolünü silmek istediğinize emin misiniz? Bu rol kullanıcılara atanmışsa silinemez.`
            : ''
        }
        confirmText="Sil"
        cancelText="İptal"
        variant="error"
        loading={deleting}
      />
    </PageLayout>
  );
};

export default RolesListPage;
