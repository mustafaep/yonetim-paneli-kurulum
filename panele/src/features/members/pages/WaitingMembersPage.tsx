// src/pages/members/ActiveWaitingMembersPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  alpha,
  InputAdornment,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Alert,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

import type { MemberListItem, MemberStatus } from '../../../types/member';
import {
  getMembers,
  rejectMember,
  updateMember,
  deleteMember,
} from '../services/membersApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import ConfirmDialog from '../../../shared/components/common/ConfirmDialog';
import { ActivateMemberButton } from '../components/ActivateMemberButton';
import MemberStatusChangeDialog from '../components/MemberStatusChangeDialog';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const ActiveWaitingMembersPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const [rows, setRows] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'activate' | 'reject' | null;
    memberId: string | null;
  }>({
    open: false,
    type: null,
    memberId: null,
  });
  const [selectedMemberName, setSelectedMemberName] = useState('');

  // Durum değiştirme dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberListItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Silme dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<MemberListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePayments, setDeletePayments] = useState(false);
  const [deleteDocuments, setDeleteDocuments] = useState(false);

  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const canApprove = hasPermission('MEMBER_APPROVE');
  const canReject = hasPermission('MEMBER_REJECT');
  const canUpdateMember = hasPermission('MEMBER_UPDATE');
  const canChangeStatus = hasPermission('MEMBER_STATUS_CHANGE');
  const canDeleteMember = hasRole('ADMIN');

  const filteredRows = useMemo(() => {
    let filtered = rows;

    // İl filtreleme
    if (provinceFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.province?.id === provinceFilter);
    }

    // Metin araması
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (row) =>
          row.firstName.toLowerCase().includes(searchLower) ||
          row.lastName.toLowerCase().includes(searchLower) ||
          row.registrationNumber?.toLowerCase().includes(searchLower) ||
          row.nationalId?.toLowerCase().includes(searchLower) ||
          row.province?.name.toLowerCase().includes(searchLower) ||
          row.institution?.name.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [rows, provinceFilter, searchText]);

  // Benzersiz iller listesi
  const uniqueProvinces = useMemo(() => {
    const provinces = rows
      .map((row) => row.province)
      .filter((province): province is NonNullable<typeof province> => province !== null && province !== undefined);
    
    const uniqueMap = new Map(provinces.map((p) => [p.id, p]));
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [rows]);

  const getStatusLabel = (status: MemberStatus): string => {
    switch (status) {
      case 'PENDING':
        return 'Başvuru Alındı';
      case 'APPROVED':
        return 'Onaylanmış (Beklemede)';
      case 'ACTIVE':
        return 'Aktif';
      case 'REJECTED':
        return 'Reddedildi';
      case 'RESIGNED':
        return 'İstifa';
      case 'EXPELLED':
        return 'İhraç';
      case 'INACTIVE':
        return 'Pasif';
      default:
        return String(status);
    }
  };

  const getStatusColor = (
    status: MemberStatus,
  ): 'success' | 'warning' | 'error' | 'default' | 'info' | 'secondary' => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'info';
      case 'ACTIVE':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'EXPELLED':
        return 'default';
      case 'RESIGNED':
        return 'secondary';
      case 'INACTIVE':
        return 'default';
      default:
        return 'info';
    }
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Hem APPROVED hem ACTIVE üyeleri getir
      const [approvedMembers, activeMembers] = await Promise.all([
        getMembers('APPROVED'),
        getMembers('ACTIVE'),
      ]);
      
      // İki listeyi birleştir ve kayıt tarihine göre sırala (yeni üyeler önce)
      const allMembers = [...approvedMembers, ...activeMembers].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Azalan sıralama (yeni önce)
      });
      setRows(allMembers);
    } catch (e) {
      console.error('Üyeler alınırken hata:', e);
      toast.showError('Üyeler yüklenirken bir hata oluştu');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleActivated = () => {
    loadMembers();
  };

  const handleEditClick = (id: string) => {
    if (!canUpdateMember) return;
    navigate(`/members/${id}/edit`);
  };

  const handleRejectClick = (id: string, memberName: string) => {
    if (!canReject) return;
    setSelectedMemberName(memberName);
    setConfirmDialog({
      open: true,
      type: 'reject',
      memberId: id,
    });
  };

  const handleConfirm = async () => {
    if (!confirmDialog.memberId || !confirmDialog.type) return;

    const id = confirmDialog.memberId;

    setProcessingId(id);
    setConfirmDialog({ open: false, type: null, memberId: null });

    try {
      if (confirmDialog.type === 'reject') {
        await rejectMember(id);
        await loadMembers();
        toast.showSuccess('Üye başarıyla reddedildi.');
      }
    } catch (e) {
      console.error('Üye işlenirken hata:', e);
      toast.showError('Üye reddedilirken bir hata oluştu.');
    } finally {
      setProcessingId(null);
    }
  };

  // Durum değiştirme handler
  const handleStatusChange = async (status: MemberStatus, reason?: string) => {
    if (!selectedMember) return;

    setUpdatingStatus(true);
    try {
      const updateData: { status: MemberStatus; cancellationReason?: string } = { status };
      if (reason && (status === 'RESIGNED' || status === 'EXPELLED')) {
        updateData.cancellationReason = reason;
      }
      await updateMember(selectedMember.id, updateData);
      toast.showSuccess('Üye durumu başarıyla güncellendi');
      setStatusDialogOpen(false);
      setSelectedMember(null);
      await loadMembers();
    } catch (error: unknown) {
      console.error('Durum güncellenirken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Durum güncellenirken bir hata oluştu'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Silme handler
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    setDeleting(true);
    try {
      await deleteMember(memberToDelete.id, {
        deletePayments,
        deleteDocuments,
      });
      toast.showSuccess('Üye başarıyla silindi');
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      setDeletePayments(false);
      setDeleteDocuments(false);
      await loadMembers();
    } catch (error: unknown) {
      console.error('Üye silinirken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Üye silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseConfirmDialog = () => {
    if (processingId) return; // İşlem devam ederken kapatılamaz
    setConfirmDialog({ open: false, type: null, memberId: null });
  };

  const columns: GridColDef<MemberListItem>[] = [
    { 
      field: 'registrationNumber',
      headerName: 'Üye Kayıt No',
      flex: 1,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberListItem) => row.registrationNumber ?? '-',
    },
    {
      field: 'fullName',
      headerName: 'Ad Soyad',
      flex: 1.5,
      minWidth: 180,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberListItem) => `${row.firstName} ${row.lastName}`,
      renderCell: (params: GridRenderCellParams<MemberListItem>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              fontSize: '0.9rem',
            }}
          >
            {`${params.row.firstName} ${params.row.lastName}`}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'nationalId',
      headerName: 'TC Kimlik No',
      flex: 1,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberListItem) => row.nationalId ?? '-',
    },
    {
      field: 'institution',
      headerName: 'Çalıştığı Kurum',
      flex: 1.5,
      minWidth: 200,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberListItem) => row.institution?.name ?? '-',
    },
    {
      field: 'status',
      headerName: 'Üyelik Durumu',
      flex: 1,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<MemberListItem>) => {
        const statusColor = getStatusColor(params.row.status);
        const isExpelled = params.row.status === 'EXPELLED';
        const isResigned = params.row.status === 'RESIGNED';
        
        const getShadowColor = (color: string): string => {
          const palette = theme.palette as any;
          const colorObj = palette[color];
          if (colorObj && colorObj.main) {
            return colorObj.main;
          }
          return theme.palette.grey[500];
        };
        
        const shadowColor = getShadowColor(statusColor);
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Chip
              label={getStatusLabel(params.row.status)}
              size="medium"
              color={statusColor}
              sx={{ 
                fontWeight: 700,
                fontSize: '0.8rem',
                height: '32px',
                borderRadius: 2,
                px: 1,
                boxShadow: `0 2px 8px ${alpha(shadowColor, 0.25)}`,
                ...(isExpelled && {
                  backgroundColor: '#212121',
                  color: '#fff',
                }),
                ...(isResigned && {
                  backgroundColor: theme.palette.secondary.main,
                  color: '#fff',
                }),
              }}
            />
          </Box>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Kayıt Tarihi',
      flex: 1,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberListItem) => {
        if (row.createdAt) {
          return new Date(row.createdAt).toLocaleDateString('tr-TR');
        }
        return '-';
      },
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: canDeleteMember ? 250 : 200,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<MemberListItem>) => {
        const disabled = processingId === params.row.id;
        const isApproved = params.row.status === 'APPROVED';
        const isActive = params.row.status === 'ACTIVE';
        
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Tooltip title="Detayları Görüntüle" arrow placement="top">
              <IconButton
                size="medium"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/members/${params.row.id}?source=waiting`);
                }}
                sx={{
                  width: 38,
                  height: 38,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  color: theme.palette.primary.main,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: '#fff',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
                  },
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {/* APPROVED durumu için mevcut butonlar */}
            {isApproved && (
              <>
                {canUpdateMember && (
                  <Tooltip title="Bilgileri Düzenle" arrow placement="top">
                    <span>
                      <IconButton
                        size="medium"
                        disabled={disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(params.row.id);
                        }}
                        sx={{
                          width: 38,
                          height: 38,
                          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
                          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                          color: theme.palette.info.main,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                            color: '#fff',
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.35)}`,
                          },
                          '&:disabled': {
                            opacity: 0.5,
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                {canApprove && (
                  <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'contents' }}>
                    <ActivateMemberButton
                      memberId={params.row.id}
                      memberName={`${params.row.firstName} ${params.row.lastName}`}
                      onActivated={handleActivated}
                      disabled={disabled}
                      variant="text"
                      size="small"
                      iconOnly={true}
                    />
                  </Box>
                )}
                {canReject && (
                  <Tooltip title="Üyeyi Reddet" arrow placement="top">
                    <span>
                      <IconButton
                        size="medium"
                        disabled={disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectClick(params.row.id, `${params.row.firstName} ${params.row.lastName}`);
                        }}
                        sx={{
                          width: 38,
                          height: 38,
                          background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.light, 0.05)} 100%)`,
                          border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                          color: theme.palette.error.main,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                            color: '#fff',
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.35)}`,
                          },
                          '&:disabled': {
                            opacity: 0.5,
                          },
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </>
            )}
            
            {/* ACTIVE durumu için yeni butonlar */}
            {isActive && (
              <>
                {canChangeStatus && (
                  <Tooltip title="Durum Değiştir" arrow placement="top">
                    <IconButton
                      size="medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMember(params.row);
                        setStatusDialogOpen(true);
                      }}
                      sx={{
                        width: 38,
                        height: 38,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                        color: theme.palette.secondary.main,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                          color: '#fff',
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.35)}`,
                        },
                      }}
                    >
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDeleteMember && (
                  <Tooltip title="Üyeyi Sil" arrow placement="top">
                    <IconButton
                      size="medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToDelete(params.row);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{
                        width: 38,
                        height: 38,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.light, 0.05)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                        color: theme.palette.error.main,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                          color: '#fff',
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.35)}`,
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

  return (
    <PageLayout>
      <PageHeader
        icon={<HourglassEmptyIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Üyeler"
        description="Onaylanmış ve aktif üyeleri görüntüleyin ve yönetin"
        color={theme.palette.info.main}
        darkColor={theme.palette.info.dark}
        lightColor={theme.palette.info.light}
      />

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
        {/* Gelişmiş Filtre Bölümü */}
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.02)} 0%, ${alpha(theme.palette.info.light, 0.01)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.3)}`,
              }}
            >
              <FilterListIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, textAlign: 'left' }}>
                Filtrele ve Ara
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', textAlign: 'left' }}>
                Üyeleri hızlıca bulun ve filtreleyin
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={2.5}>
            {/* Arama */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <TextField
                placeholder="Ad, Soyad, TC Kimlik No, Kurum ile arayın..."
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
                      boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.12)}`,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.info.main,
                        borderWidth: '2px',
                      },
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 4px 16px ${alpha(theme.palette.info.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>
            {/* İl Filtresi */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <FormControl 
                size="medium" 
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    borderRadius: 2.5,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.12)}`,
                    },
                  },
                }}
              >
                <InputLabel>İl Filtresi</InputLabel>
                <Select
                  value={provinceFilter}
                  label="İl Filtresi"
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: provinceFilter !== 'ALL' ? 600 : 400,
                      color: provinceFilter !== 'ALL' ? theme.palette.info.main : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.info.main,
                      borderWidth: 2,
                    },
                  }}
                  MenuProps={{
                    disablePortal: false,
                    disableScrollLock: true,
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        borderRadius: 12,
                      },
                    },
                  }}
                >
                  <MenuItem value="ALL">
                    <Typography>Tüm İller</Typography>
                  </MenuItem>
                  {uniqueProvinces.map((province) => {
                    const isSelected = provinceFilter === province.id;
                    return (
                      <MenuItem 
                        key={province.id} 
                        value={province.id}
                        sx={{
                          backgroundColor: isSelected ? alpha(theme.palette.info.main, 0.1) : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected 
                              ? alpha(theme.palette.info.main, 0.15) 
                              : alpha(theme.palette.action.hover, 0.05),
                          },
                        }}
                      >
                        <Typography 
                          sx={{ 
                            fontWeight: isSelected ? 700 : 400,
                            color: isSelected ? theme.palette.info.main : 'inherit',
                          }}
                        >
                          {province.name}
                        </Typography>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Seçili Filtreler */}
          {(provinceFilter !== 'ALL' || searchText.trim()) && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.info.main,
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
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    setProvinceFilter('ALL');
                    setSearchText('');
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
                {provinceFilter !== 'ALL' && (
                  <Chip
                    label={`İl: ${uniqueProvinces.find(p => p.id === provinceFilter)?.name || provinceFilter}`}
                    onDelete={() => setProvinceFilter('ALL')}
                    deleteIcon={<CloseIcon />}
                    color="info"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                      '& .MuiChip-deleteIcon': {
                        fontSize: '1.1rem',
                      },
                    }}
                  />
                )}
                {searchText.trim() && (
                  <Chip
                    label={`Arama: "${searchText}"`}
                    onDelete={() => setSearchText('')}
                    deleteIcon={<CloseIcon />}
                    color="info"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                      '& .MuiChip-deleteIcon': {
                        fontSize: '1.1rem',
                      },
                    }}
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Sonuç Sayısı - Filtre içine taşındı */}
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
                <PeopleIcon fontSize="small" />
                {filteredRows.length} üye listeleniyor
                {filteredRows.length !== rows.length && ` (Toplam ${rows.length} üyeden)`}
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
              },
              '& .MuiDataGrid-columnHeaders': {
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.06)} 0%, ${alpha(theme.palette.info.light, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.info.main, 0.12)}`,
                borderRadius: 0,
                minHeight: '56px !important',
                maxHeight: '56px !important',
              },
              '& .MuiDataGrid-columnHeaderTitleContainer': {
                justifyContent: 'center',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                fontSize: '0.9rem',
                color: theme.palette.text.primary,
              },
              '& .MuiDataGrid-row': {
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.info.main, 0.03),
                  boxShadow: `inset 4px 0 0 ${theme.palette.info.main}`,
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
            localeText={{
              noRowsLabel: 'Üye bulunamadı',
            }}
            slotProps={{
              pagination: {
                labelRowsPerPage: 'Sayfa başına satır:',
              },
            }}
          />
          </Box>
        </Box>
      </Card>

      {/* Aktifleştirme ve Reddetme Dialog'ları */}
      {confirmDialog.type === 'reject' && (
        <Dialog
          open={confirmDialog.open}
          onClose={handleCloseConfirmDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.2)}`,
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 2.5,
              pt: 3,
              px: 3,
              borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.02)} 0%, ${alpha(theme.palette.error.light, 0.01)} 100%)`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.35)}`,
                }}
              >
                <CloseIcon sx={{ fontSize: '2rem', color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
                  Üyeyi Reddet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Bu işlem geri alınamaz
                </Typography>
              </Box>
            </Box>
            {!processingId && (
              <IconButton
                onClick={handleCloseConfirmDialog}
                size="medium"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main,
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </DialogTitle>

          <DialogContent sx={{ pt: 3.5, pb: 3, px: 3 }}>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                mb: 2, 
                lineHeight: 1.7,
                fontSize: '0.95rem',
              }}
            >
              <strong>{selectedMemberName}</strong> isimli üyeyi reddetmek istediğinize emin misiniz?
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.error.main,
                fontWeight: 600,
                p: 2,
                borderRadius: 2,
                background: alpha(theme.palette.error.main, 0.1),
              }}
            >
              ⚠️ Bu işlem geri alınamaz ve üye bilgileri kalıcı olarak reddedilmiş duruma geçecektir.
            </Typography>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              pb: 3,
              pt: 2,
              gap: 1.5,
              borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.8)} 0%, ${alpha(theme.palette.grey[50], 0.5)} 100%)`,
              justifyContent: 'flex-end',
            }}
          >
            <Button
              onClick={handleCloseConfirmDialog}
              disabled={!!processingId}
              variant="outlined"
              size="large"
              sx={{
                borderRadius: 2.5,
                px: 4,
                py: 1.25,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.95rem',
                borderWidth: '2px',
                '&:hover': {
                  borderWidth: '2px',
                  backgroundColor: alpha(theme.palette.grey[500], 0.08),
                },
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!!processingId}
              variant="contained"
              size="large"
              color="error"
              startIcon={processingId ? <CircularProgress size={20} color="inherit" /> : <CloseIcon />}
              sx={{
                borderRadius: 2.5,
                px: 4,
                py: 1.25,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.95rem',
                background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.35)}`,
                '&:hover': {
                  boxShadow: `0 12px 32px ${alpha(theme.palette.error.main, 0.45)}`,
                  background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
                },
              }}
            >
              {processingId ? 'Reddediliyor...' : 'Evet, Reddet'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Durum Değiştirme Dialog */}
      {selectedMember && (
        <MemberStatusChangeDialog
          open={statusDialogOpen}
          onClose={() => {
            setStatusDialogOpen(false);
            setSelectedMember(null);
          }}
          onConfirm={handleStatusChange}
          currentStatus={selectedMember.status}
          memberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
          loading={updatingStatus}
        />
      )}

      {/* Silme Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteDialogOpen(false);
            setMemberToDelete(null);
            setDeletePayments(false);
            setDeleteDocuments(false);
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.light, 0.05)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.error.main, 0.2)}`,
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
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
            }}
          >
            <DeleteIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Üyeyi Sil
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bu işlem geri alınamaz
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              "{memberToDelete?.firstName} {memberToDelete?.lastName}" adlı üyeyi silmek istediğinize emin misiniz?
            </Typography>
            <Typography variant="body2">
              Üye silindiğinde listeden kaldırılacaktır. Üyeye bağlı kayıtlara ne yapılacağını seçmeniz gerekmektedir.
            </Typography>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <FormLabel sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.95rem', display: 'block' }}>
              Kesintiler
            </FormLabel>
            <RadioGroup
              value={deletePayments ? 'delete' : 'keep'}
              onChange={(e) => setDeletePayments(e.target.value === 'delete')}
              sx={{ gap: 1 }}
            >
              <FormControlLabel
                value="keep"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Kesintileri Koru
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Kesinti kayıtları silinmeyecek, üye silinse bile kayıtlarda kalacak
                    </Typography>
                  </Box>
                }
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  p: 1.5,
                  m: 0,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.success.main, 0.04),
                  },
                }}
              />
              <FormControlLabel
                value="delete"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Kesintileri Sil
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tüm Kesinti kayıtları silinecek
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

          <Box>
            <FormLabel sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.95rem', display: 'block' }}>
              Dökümanlar
            </FormLabel>
            <RadioGroup
              value={deleteDocuments ? 'delete' : 'keep'}
              onChange={(e) => setDeleteDocuments(e.target.value === 'delete')}
              sx={{ gap: 1 }}
            >
              <FormControlLabel
                value="keep"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Dökümanları Koru
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Döküman kayıtları silinmeyecek, üye silinse bile kayıtlarda kalacak
                    </Typography>
                  </Box>
                }
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  p: 1.5,
                  m: 0,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.success.main, 0.04),
                  },
                }}
              />
              <FormControlLabel
                value="delete"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Dökümanları Sil
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tüm döküman kayıtları ve dosyaları silinecek
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

          <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Not:</strong> Üye geçmişi kayıtları her durumda korunacaktır.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setMemberToDelete(null);
              setDeletePayments(false);
              setDeleteDocuments(false);
            }}
            disabled={deleting}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleDeleteMember}
            disabled={deleting}
            variant="contained"
            color="error"
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.35)}`,
              '&:hover': {
                boxShadow: `0 6px 16px ${alpha(theme.palette.error.main, 0.45)}`,
                transform: 'translateY(-1px)',
              },
            }}
          >
            {deleting ? 'Siliniyor...' : 'Üyeyi Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default WaitingMembersPage;

