// src/pages/users/UsersListPage.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  TextField,
  IconButton,
  Tooltip,
  InputAdornment,
  useTheme,
  alpha,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PeopleIcon from '@mui/icons-material/People';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';

import type { UserListItem } from '../../../types/user';
import { getUsers, demoteUserToMember } from '../services/usersApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const RECENT_APPROVED_PANEL_USERS_KEY = 'recentApprovedPanelUsers';

type ApprovedPanelUserSyncPayload = UserListItem;

const readRecentApprovedPanelUsers = (): ApprovedPanelUserSyncPayload[] => {
  try {
    const raw = localStorage.getItem(RECENT_APPROVED_PANEL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Panel kullanıcı listesi yalnızca GET /users (aktif, silinmemiş) kaydına dayanır.
 * localStorage’daki son onaylar sadece sıralamayı günceller; API’de artık olmayan
 * (ör. üyeliğe düşürülmüş) id’ler asla eklenmez.
 */
const mergeUsers = (
  apiUsers: UserListItem[],
  recentFromStorage: ApprovedPanelUserSyncPayload[],
): UserListItem[] => {
  if (recentFromStorage.length === 0) {
    return apiUsers;
  }

  const apiById = new Map(apiUsers.map((u) => [u.id, u]));
  const mergedRecent: UserListItem[] = [];

  for (const incoming of recentFromStorage) {
    const fromApi = apiById.get(incoming.id);
    if (!fromApi) {
      continue;
    }
    mergedRecent.push({
      ...incoming,
      ...fromApi,
      roles:
        fromApi.roles.length > 0 ? fromApi.roles : incoming.roles,
      memberId: fromApi.memberId ?? incoming.memberId ?? null,
    });
  }

  const recentIds = new Set(mergedRecent.map((u) => u.id));
  const rest = apiUsers.filter((u) => !recentIds.has(u.id));

  return [...mergedRecent, ...rest];
};

const removeUserIdFromRecentApprovedStorage = (userId: string) => {
  try {
    const recent = readRecentApprovedPanelUsers().filter((u) => u.id !== userId);
    localStorage.setItem(RECENT_APPROVED_PANEL_USERS_KEY, JSON.stringify(recent));
  } catch {
    /* ignore */
  }
};

const UsersListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission, user: authUser } = useAuth();
  const canDemoteToMember =
    hasPermission('USER_SOFT_DELETE') ||
    hasPermission('PANEL_USER_APPLICATION_APPROVE');
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [rows, setRows] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [demoteTarget, setDemoteTarget] = useState<UserListItem | null>(null);
  const [demoteSubmitting, setDemoteSubmitting] = useState(false);

  // Filtrelenmiş veriler
  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Arama filtresi
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (row) =>
          row.firstName.toLowerCase().includes(searchLower) ||
          row.lastName.toLowerCase().includes(searchLower) ||
          row.email.toLowerCase().includes(searchLower) ||
          row.roles.some((role) => role.toLowerCase().includes(searchLower)),
      );
    }

    return filtered;
  }, [rows, searchText]);

  const columns: GridColDef<UserListItem>[] = [
    {
      field: 'fullName',
      headerName: 'Kullanıcı',
      flex: 1.5,
      minWidth: 200,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<UserListItem>) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            {params.row.firstName} {params.row.lastName}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mt: 0.25 }}>
            {params.row.email}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'roles',
      headerName: 'Roller',
      flex: 2,
      minWidth: 250,
      align: 'left',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
          {params.row.roles.map((r, idx) => (
            <Chip 
              key={`${r}-${idx}`}
              label={r} 
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
                '& .MuiChip-label': { px: 1.5 }
              }}
            />
          ))}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: canDemoteToMember ? 140 : 100,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<UserListItem>) => {
        const memberId = params.row.memberId;
        const isAdminUser = params.row.roles.some(
          (r) => r.toUpperCase() === 'ADMIN',
        );
        const showDemote =
          canDemoteToMember &&
          Boolean(memberId) &&
          !isAdminUser &&
          params.row.id !== authUser?.id;

        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title="Detay Görüntüle" arrow placement="top">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/users/panel/${params.row.id}`);
                }}
                sx={{
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    transform: 'scale(1.1)',
                  },
                  transition: 'all 0.2s',
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {showDemote && (
              <Tooltip title="Tekrar üyeliğe düşür" arrow placement="top">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDemoteTarget(params.row);
                  }}
                  sx={{
                    color: theme.palette.warning.dark,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.12),
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  <PersonRemoveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  const fetchUsers = React.useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getUsers();
      setRows(mergeUsers(data, readRecentApprovedPanelUsers()));
    } catch (e: unknown) {
      console.error('Kullanıcılar alınırken hata:', e);
      toastRef.current.showError(getApiErrorMessage(e, 'Kullanıcılar alınırken bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Panel Kullanıcı Başvurusu onaylandığında listeyi güncelle (onaylanan üye panel kullanıcıları listesinde görünsün)
  useEffect(() => {
    const handlePanelUserApproved = () => {
      void fetchUsers(false);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== RECENT_APPROVED_PANEL_USERS_KEY) return;
      void fetchUsers(false);
    };

    window.addEventListener('panelUserApproved', handlePanelUserApproved as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(
        'panelUserApproved',
        handlePanelUserApproved as EventListener,
      );
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchUsers]);

  const handleConfirmDemote = async () => {
    if (!demoteTarget) return;
    setDemoteSubmitting(true);
    try {
      await demoteUserToMember(demoteTarget.id);
      removeUserIdFromRecentApprovedStorage(demoteTarget.id);
      toast.showSuccess(
        `${demoteTarget.firstName} ${demoteTarget.lastName} artık yalnızca üye; panel hesabı kapatıldı.`,
      );
      setDemoteTarget(null);
      await fetchUsers(false);
    } catch (e: unknown) {
      console.error('Üyeliğe düşürme hatası:', e);
      toast.showError(getApiErrorMessage(e, 'İşlem sırasında bir hata oluştu.'));
    } finally {
      setDemoteSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<PeopleIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Panel Kullanıcıları"
        description="Sistemde tanımlı tüm kullanıcıları ve rollerini görüntüleyin"
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
        {/* Filtre Bölümü */}
        <Box
            sx={{
              p: { xs: 3, sm: 4 },
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
              borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
            }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                placeholder="Ad, Soyad, E-posta, Rol..."
                size="medium"
                fullWidth
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: theme.palette.primary.main }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    borderRadius: 2,
                    transition: 'all 0.3s',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  },
                }}
              />
            </Stack>
          </Box>

          {/* DataGrid */}
          <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Box
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              height: { xs: 450, sm: 550, md: 650 },
              minHeight: { xs: 450, sm: 550, md: 650 },
              width: '100%',
              '& .MuiDataGrid-root': {
                border: 'none',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                '&:focus': {
                  outline: 'none',
                },
                '&:focus-within': {
                  outline: 'none',
                },
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
              '& .MuiDataGrid-columnHeaderTitleContainer': {
                justifyContent: 'center',
              },
              '& .MuiDataGrid-row': {
                transition: 'all 0.2s ease',
                cursor: 'pointer',
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
              getRowId={(row) => row.id}
              initialState={{
                pagination: { paginationModel: { pageSize: 25, page: 0 } },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              onRowClick={(params) => {
                navigate(`/users/panel/${params.row.id}`);
              }}
            />
          </Box>
          </Box>
        </Card>

      <Dialog
        open={Boolean(demoteTarget)}
        onClose={() => !demoteSubmitting && setDemoteTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Panel erişimini kaldır</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>
              {demoteTarget
                ? `${demoteTarget.firstName} ${demoteTarget.lastName}`
                : ''}
            </strong>{' '}
            kullanıcısının panel hesabı kapatılacak; kişi yalnızca üye olarak kalacak. İstenirse
            daha sonra yeniden panel kullanıcı başvurusu yapılabilir. Devam edilsin mi?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDemoteTarget(null)} disabled={demoteSubmitting}>
            Vazgeç
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void handleConfirmDemote()}
            disabled={demoteSubmitting}
          >
            {demoteSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Evet, üyeliğe düşür'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default UsersListPage;