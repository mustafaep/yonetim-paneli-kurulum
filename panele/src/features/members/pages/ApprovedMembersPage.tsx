// src/pages/members/MembersApplicationsPage.tsx
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
  Grid,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BadgeIcon from '@mui/icons-material/Badge';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BookIcon from '@mui/icons-material/Book';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';

import type { MemberApplicationRow, MemberStatus } from '../../../types/member';
import {
  getApprovedMembers,
  activateMember,
  rejectMember,
} from '../services/membersApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import ConfirmDialog from '../../../shared/components/common/ConfirmDialog';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const ApprovedMembersPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const [rows, setRows] = useState<MemberApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [createdByFilter, setCreatedByFilter] = useState<string>('ALL');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'activate' | 'reject' | null;
    memberId: string | null;
  }>({
    open: false,
    type: null,
    memberId: null,
  });


  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canApprove = hasPermission('MEMBER_APPROVE');
  const canReject = hasPermission('MEMBER_REJECT');
  const canUpdateMember = hasPermission('MEMBER_UPDATE');

  const filteredRows = useMemo(() => {
    let filtered = rows;

    // İl filtreleme
    if (provinceFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.province?.id === provinceFilter);
    }

    // Başvuruyu yapan filtreleme
    if (createdByFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.createdBy?.id === createdByFilter);
    }

    // Metin araması
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (row) =>
          row.firstName.toLowerCase().includes(searchLower) ||
          row.lastName.toLowerCase().includes(searchLower) ||
          row.province?.name.toLowerCase().includes(searchLower) ||
          (row.createdBy && 
            (`${row.createdBy.firstName} ${row.createdBy.lastName}`.toLowerCase().includes(searchLower) ||
             row.createdBy.email.toLowerCase().includes(searchLower))
          ),
      );
    }

    return filtered;
  }, [rows, provinceFilter, createdByFilter, searchText]);

  // Benzersiz iller listesi
  const uniqueProvinces = useMemo(() => {
    const provinces = rows
      .map((row) => row.province)
      .filter((province): province is NonNullable<typeof province> => province !== null && province !== undefined);
    
    const uniqueMap = new Map(provinces.map((p) => [p.id, p]));
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [rows]);

  // Benzersiz başvuru yapanlar listesi
  const uniqueCreatedBy = useMemo(() => {
    const creators = rows
      .map((row) => row.createdBy)
      .filter((creator): creator is NonNullable<typeof creator> => creator !== null && creator !== undefined);
    
    const uniqueMap = new Map(creators.map((c) => [c.id, c]));
    return Array.from(uniqueMap.values()).sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr')
    );
  }, [rows]);

  const getStatusLabel = (status: MemberStatus): string => {
    switch (status) {
      case 'PENDING':
        return 'Başvuru Alındı';
      case 'APPROVED':
        return 'Admin Onayladı (Beklemede)';
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

  const loadApprovedMembers = async () => {
    setLoading(true);
    try {
      const data = await getApprovedMembers();
      // Kayıt tarihine göre sırala (yeni üyeler önce)
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Azalan sıralama (yeni önce)
      });
      setRows(sortedData);
    } catch (e) {
      console.error('Onaylanmış üyeler alınırken hata:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovedMembers();
  }, []);

  const handleActivateClick = (id: string) => {
    if (!canApprove) return;
    setConfirmDialog({
      open: true,
      type: 'activate',
      memberId: id,
    });
  };

  const handleEditClick = (id: string) => {
    if (!canUpdateMember) return;
    navigate(`/members/${id}/edit`);
  };

  const handleRejectClick = (id: string) => {
    if (!canReject) return;
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
      if (confirmDialog.type === 'activate') {
        await activateMember(id);
        await loadApprovedMembers();
        toast.showSuccess('Üye başarıyla aktifleştirildi.');
      } else {
        await rejectMember(id);
        await loadApprovedMembers();
        toast.showSuccess('Üye başarıyla reddedildi.');
      }
    } catch (e) {
      console.error('Üye işlenirken hata:', e);
      toast.showError(
        confirmDialog.type === 'activate'
          ? 'Üye aktifleştirilirken bir hata oluştu.'
          : 'Üye reddedilirken bir hata oluştu.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleCloseConfirmDialog = () => {
    if (processingId) return; // İşlem devam ederken kapatılamaz
    setConfirmDialog({ open: false, type: null, memberId: null });
  };


  const columns: GridColDef<MemberApplicationRow>[] = [
    {
      field: 'firstName',
      headerName: 'Ad',
      flex: 1,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'lastName',
      headerName: 'Soyad',
      flex: 1,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'province',
      headerName: 'İl',
      flex: 1,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberApplicationRow) => row.province?.name ?? '-',
    },
    {
      field: 'createdBy',
      headerName: 'Başvuruyu Yapan',
      flex: 1.2,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberApplicationRow) => {
        if (row.createdBy) {
          return `${row.createdBy.firstName} ${row.createdBy.lastName}`;
        }
        return '-';
      },
      renderCell: (params: GridRenderCellParams<MemberApplicationRow>) => {
        const createdBy = params.row.createdBy;
        if (!createdBy) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2">-</Typography>
            </Box>
          );
        }
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" fontWeight={600}>
              {createdBy.firstName} {createdBy.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {createdBy.email}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Başvuru Tarihi',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberApplicationRow) => row.createdAt,
      valueFormatter: (value: string | null | undefined) =>
        value
          ? new Date(value).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          : '-',
    },
    {
      field: 'status',
      headerName: 'Durum',
      width: 160,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<MemberApplicationRow>) => {
        const statusColor = getStatusColor(params.row.status);
        const isExpelled = params.row.status === 'EXPELLED';
        const isResigned = params.row.status === 'RESIGNED';
        const getShadowColor = (color: string): string => {
          const palette = theme.palette as any;
          const colorObj = palette[color];
          if (colorObj && colorObj.main) return colorObj.main;
          return theme.palette.grey[500];
        };
        const shadowColor = isExpelled ? '#212121' : getShadowColor(statusColor);

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
      field: 'actions',
      headerName: 'İşlemler',
      width: 250,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<MemberApplicationRow>) => {
        const disabled = processingId === params.row.id;
        const isApproved = params.row.status === 'APPROVED';
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Tooltip title="Detayları Görüntüle" arrow placement="top">
              <IconButton
                size="medium"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/members/${params.row.id}`);
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
            {canUpdateMember && isApproved && (
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
            {canApprove && isApproved && (
              <Tooltip title="Üyeyi Aktifleştir" arrow placement="top">
                <span>
                  <IconButton
                    size="medium"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivateClick(params.row.id);
                    }}
                    sx={{
                      width: 38,
                      height: 38,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      color: theme.palette.success.main,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                        color: '#fff',
                        transform: 'translateY(-2px)',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.35)}`,
                      },
                      '&:disabled': {
                        opacity: 0.5,
                      },
                    }}
                  >
                    <PlayArrowIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {canReject && isApproved && (
              <Tooltip title="Üyeyi Reddet" arrow placement="top">
                <span>
                  <IconButton
                    size="medium"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRejectClick(params.row.id);
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
          </Box>
        );
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        icon={<CheckIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Üyelik Kabul Ekranı"
        description="Onaylanmış üyeleri aktifleştirin, düzenleyin ve yönetin"
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
                Onaylanmış üyeleri hızlıca bulun ve filtreleyin
              </Typography>
            </Box>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.5}
            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
          >
            <TextField
              placeholder="Ad, Soyad, İl veya Email ile arayın..."
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
            
            <FormControl 
              size="medium" 
              sx={{ 
                minWidth: { xs: '100%', sm: 200 },
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
              >
                <MenuItem value="ALL">
                  <Typography>Tüm İller</Typography>
                </MenuItem>
                {uniqueProvinces.map((province) => (
                  <MenuItem key={province.id} value={province.id}>
                    <Typography>{province.name}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl 
              size="medium" 
              sx={{ 
                minWidth: { xs: '100%', sm: 220 },
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
              <InputLabel>Başvuruyu Yapan</InputLabel>
              <Select
                value={createdByFilter}
                label="Başvuruyu Yapan"
                onChange={(e) => setCreatedByFilter(e.target.value)}
                startAdornment={
                  <InputAdornment position="start" sx={{ ml: 1 }}>
                    <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="ALL">
                  <Typography>Tüm Kullanıcılar</Typography>
                </MenuItem>
                {uniqueCreatedBy.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

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
                <CheckIcon fontSize="small" />
                {filteredRows.length} onaylanmış üye listeleniyor
                {filteredRows.length !== rows.length && ` (Toplam ${rows.length} onaylanmış üyeden)`}
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
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
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
              localeText={{
                noRowsLabel: 'Onaylanmış üye bulunamadı',
                MuiTablePagination: {
                  labelRowsPerPage: 'Sayfa başına satır:',
                },
              }}
            />
          </Box>
        </Box>
      </Card>

      {/* Aktifleştirme ve Reddetme Dialog'ları */}
      {confirmDialog.type === 'activate' ? (
        <Dialog
          open={confirmDialog.open}
          onClose={handleCloseConfirmDialog}
          maxWidth="md"
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
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.02)} 0%, ${alpha(theme.palette.success.light, 0.01)} 100%)`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.35)}`,
                }}
              >
                <CheckIcon sx={{ fontSize: '2rem', color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
                  Üyeyi Aktifleştir
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Üyeyi aktif hale getirin
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
                mb: 3.5, 
                lineHeight: 1.7,
                fontSize: '0.95rem',
              }}
            >
              Bu üyeyi aktifleştirmek istediğinize emin misiniz? Aktifleştirildikten sonra üye <strong>aktif</strong> hale gelecektir.
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
              color="success"
              startIcon={processingId ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              sx={{
                borderRadius: 2.5,
                px: 4,
                py: 1.25,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.95rem',
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.35)}`,
                '&:hover': {
                  boxShadow: `0 12px 32px ${alpha(theme.palette.success.main, 0.45)}`,
                  background: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`,
                },
              }}
            >
              {processingId ? 'Aktifleştiriliyor...' : 'Aktifleştir'}
            </Button>
          </DialogActions>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={confirmDialog.open}
          onClose={handleCloseConfirmDialog}
          onConfirm={handleConfirm}
          title="Üyeyi Reddet"
          message="Bu üyeyi reddetmek istediğinize emin misiniz? Bu işlem geri alınamaz."
          confirmText="Reddet"
          cancelText="İptal"
          variant="error"
          loading={!!processingId && processingId === confirmDialog.memberId}
        />
      )}
    </PageLayout>
  );
};

export default ApprovedMembersPage;
