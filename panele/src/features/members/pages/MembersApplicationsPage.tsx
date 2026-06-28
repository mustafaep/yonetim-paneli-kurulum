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
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';

import type { MemberApplicationRow, MemberStatus } from '../../../types/member';
import {
  getMemberApplications,
  getMembers,
  approveMember,
  rejectMember,
} from '../services/membersApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import ConfirmDialog from '../../../shared/components/common/ConfirmDialog';
import MemberApprovalDialog, { type ApproveFormData } from '../components/MemberApprovalDialog';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const MembersApplicationsPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const [rows, setRows] = useState<MemberApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'REJECTED'>('PENDING');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [createdByFilter, setCreatedByFilter] = useState<string>('ALL');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | null;
    memberId: string | null;
  }>({
    open: false,
    type: null,
    memberId: null,
  });
  const [emptyFieldsInfoDialogOpen, setEmptyFieldsInfoDialogOpen] = useState(false);
  const [emptyFieldsList, setEmptyFieldsList] = useState<string[]>([]);

  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canApprove = hasPermission('MEMBER_APPROVE');
  const canReject = hasPermission('MEMBER_REJECT');

  // Status'a göre tema rengi
  const statusTheme = statusFilter === 'PENDING' 
    ? {
        mainColor: theme.palette.warning.main,
        darkColor: theme.palette.warning.dark,
        lightColor: theme.palette.warning.light,
      }
    : {
        mainColor: theme.palette.error.main,
        darkColor: theme.palette.error.dark,
        lightColor: theme.palette.error.light,
      };

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
             getCreatedByRoleText(row.createdBy).toLowerCase().includes(searchLower))
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

  const getCreatedByRoleText = (createdBy: MemberApplicationRow['createdBy']): string => {
    const roles = createdBy?.customRoles?.map((role) => role.name).filter(Boolean) ?? [];
    return roles.length > 0 ? roles.join(', ') : '-';
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      let data: MemberApplicationRow[];
      if (statusFilter === 'PENDING') {
        data = await getMemberApplications();
      } else {
        // REJECTED için getMembers kullan
        const rejectedMembers = await getMembers('REJECTED');
        // MemberListItem'ı MemberApplicationRow'a dönüştür
        data = rejectedMembers.map(member => ({
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          nationalId: member.nationalId,
          province: member.province,
          createdBy: null, // REJECTED üyelerde createdBy bilgisi olmayabilir
          createdAt: member.createdAt || '',
          status: member.status,
        })) as MemberApplicationRow[];
      }
      // Kayıt tarihine göre sırala (yeni üyeler önce)
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Azalan sıralama (yeni önce)
      });
      setRows(sortedData);
    } catch (e) {
      console.error('Üye başvuruları alınırken hata:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  const handleApproveClick = (id: string) => {
    if (!canApprove) return;
    setConfirmDialog({
      open: true,
      type: 'approve',
      memberId: id,
    });
  };

  const handleRejectClick = (id: string) => {
    if (!canReject) return;
    setConfirmDialog({
      open: true,
      type: 'reject',
      memberId: id,
    });
  };

  const handleApproveConfirm = async (data: ApproveFormData) => {
    if (!confirmDialog.memberId) return;
    const id = confirmDialog.memberId;

    setProcessingId(id);

    try {
      const approveData = {
        registrationNumber: data.registrationNumber.trim(),
        // Backend `@IsOptional` + `@IsDateString` beklediği için boş string gönderme.
        boardDecisionDate: data.boardDecisionDate?.trim() ? data.boardDecisionDate.trim() : undefined,
        boardDecisionBookNo: data.boardDecisionBookNo.trim(),
        tevkifatCenterId: data.tevkifatCenterId,
        tevkifatTitleId: data.tevkifatTitleId,
        branchId: data.branchId,
        memberGroupId: data.memberGroupId,
      };

      const response = await approveMember(id, approveData);
      await loadApplications();
      toast.showSuccess('Başvuru başarıyla onaylandı. Üye bekleyen üyeler listesine eklendi.');

      // Boş alanlar varsa bilgilendirme pop-up'ı göster
      if (response?.emptyOptionalFields?.length) {
        setEmptyFieldsList(response.emptyOptionalFields);
        setEmptyFieldsInfoDialogOpen(true);
      }
    } catch (e) {
      console.error('Başvuru onaylanırken hata:', e);
      throw e; // Re-throw so the dialog can handle it
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!confirmDialog.memberId) return;
    const id = confirmDialog.memberId;

    setProcessingId(id);

    try {
      await rejectMember(id);
      setConfirmDialog({ open: false, type: null, memberId: null });
      await loadApplications();
      toast.showSuccess('Başvuru başarıyla reddedildi.');
    } catch (e) {
      console.error('Başvuru reddedilirken hata:', e);
      toast.showError('Başvuru reddedilirken bir hata oluştu.');
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
          return `${row.createdBy.firstName} ${row.createdBy.lastName} - ${getCreatedByRoleText(row.createdBy)}`;
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
              {getCreatedByRoleText(createdBy)}
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
        
        // Safely get the color from palette with fallback
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
      field: 'actions',
      headerName: 'İşlemler',
      width: 200,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<MemberApplicationRow>) => {
        const disabled = processingId === params.row.id;
        const isPending = params.row.status === 'PENDING';
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Tooltip title="Detayları Görüntüle" arrow placement="top">
              <IconButton
                size="medium"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/members/${params.row.id}?source=application`);
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
            {canApprove && isPending && statusFilter === 'PENDING' && (
              <Tooltip title="Başvuruyu Onayla" arrow placement="top">
                <span>
                  <IconButton
                    size="medium"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApproveClick(params.row.id);
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
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {canReject && isPending && statusFilter === 'PENDING' && (
              <Tooltip title="Başvuruyu Reddet" arrow placement="top">
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
        icon={<AssignmentIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Üye Başvuruları"
        description="Başvuruları yönetin, onaylayın ve takip edin"
        color={statusTheme.mainColor}
        darkColor={statusTheme.darkColor}
        lightColor={statusTheme.lightColor}
        rightContent={
          statusFilter === 'PENDING' ? (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => navigate('/members/applications/new')}
              size="large"
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                background: `linear-gradient(135deg, ${statusTheme.mainColor} 0%, ${statusTheme.darkColor} 100%)`,
                boxShadow: `0 8px 24px ${alpha(statusTheme.mainColor, 0.35)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 32px ${alpha(statusTheme.mainColor, 0.45)}`,
                  background: `linear-gradient(135deg, ${statusTheme.darkColor} 0%, ${statusTheme.mainColor} 100%)`,
                },
              }}
            >
              Yeni Başvuru
            </Button>
          ) : undefined
        }
        mobileContent={
          statusFilter === 'PENDING' ? (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              fullWidth
              onClick={() => navigate('/members/applications/new')}
              size="large"
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                fontSize: '1rem',
                background: `linear-gradient(135deg, ${statusTheme.mainColor} 0%, ${statusTheme.darkColor} 100%)`,
                boxShadow: `0 8px 24px ${alpha(statusTheme.mainColor, 0.35)}`,
              }}
            >
              Yeni Başvuru
            </Button>
          ) : undefined
        }
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
            background: `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.02)} 0%, ${alpha(statusTheme.lightColor, 0.01)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${statusTheme.mainColor} 0%, ${statusTheme.darkColor} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.3)}`,
              }}
            >
              <FilterListIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, textAlign: 'left' }}>
                Filtrele ve Ara
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', textAlign: 'left' }}>
                Başvuruları hızlıca bulun ve filtreleyin
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={2.5}>
            {/* Durum Filtresi */}
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
                      boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.12)}`,
                    },
                  },
                }}
              >
                <InputLabel>Durum</InputLabel>
                <Select
                  value={statusFilter}
                  label="Durum"
                  onChange={(e) => setStatusFilter(e.target.value as 'PENDING' | 'REJECTED')}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: 600,
                      color: statusTheme.mainColor,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: statusTheme.mainColor,
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
                  <MenuItem value="PENDING">
                    <Typography sx={{ fontWeight: statusFilter === 'PENDING' ? 700 : 400 }}>
                      Onay Bekliyor
                    </Typography>
                  </MenuItem>
                  <MenuItem value="REJECTED">
                    <Typography sx={{ fontWeight: statusFilter === 'REJECTED' ? 700 : 400 }}>
                      Reddedilen
                    </Typography>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* Arama */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <TextField
                placeholder="Ad, Soyad, İl veya Rol ile arayın..."
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
                      boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.12)}`,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: statusTheme.mainColor,
                        borderWidth: '2px',
                      },
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 4px 16px ${alpha(statusTheme.mainColor, 0.2)}`,
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
                      boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.12)}`,
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
                      color: provinceFilter !== 'ALL' ? statusTheme.mainColor : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: statusTheme.mainColor,
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
                          backgroundColor: isSelected ? alpha(statusTheme.mainColor, 0.1) : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected 
                              ? alpha(statusTheme.mainColor, 0.15) 
                              : alpha(theme.palette.action.hover, 0.05),
                          },
                        }}
                      >
                        <Typography 
                          sx={{ 
                            fontWeight: isSelected ? 700 : 400,
                            color: isSelected ? statusTheme.mainColor : 'inherit',
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
            {/* Başvuruyu Yapan */}
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
                      boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.12)}`,
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
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: createdByFilter !== 'ALL' ? 600 : 400,
                      color: createdByFilter !== 'ALL' ? statusTheme.mainColor : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: statusTheme.mainColor,
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
                    <Typography>Tüm Kullanıcılar</Typography>
                  </MenuItem>
                  {uniqueCreatedBy.map((user) => {
                    const isSelected = createdByFilter === user.id;
                    return (
                      <MenuItem 
                        key={user.id} 
                        value={user.id}
                        sx={{
                          backgroundColor: isSelected ? alpha(statusTheme.mainColor, 0.1) : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected 
                              ? alpha(statusTheme.mainColor, 0.15) 
                              : alpha(theme.palette.action.hover, 0.05),
                          },
                        }}
                      >
                        <Box>
                          <Typography 
                            variant="body2" 
                            sx={{
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? statusTheme.mainColor : 'inherit',
                            }}
                          >
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getCreatedByRoleText(user)}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Seçili Filtreler */}
          {(provinceFilter !== 'ALL' || createdByFilter !== 'ALL' || searchText.trim()) && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.08)} 0%, ${alpha(statusTheme.lightColor, 0.05)} 100%)`,
                border: `1px solid ${alpha(statusTheme.mainColor, 0.2)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: statusTheme.mainColor,
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
                    setCreatedByFilter('ALL');
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
                    color="warning"
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
                {createdByFilter !== 'ALL' && (
                  <Chip
                    label={`Başvuruyu Yapan: ${uniqueCreatedBy.find(u => u.id === createdByFilter)?.firstName} ${uniqueCreatedBy.find(u => u.id === createdByFilter)?.lastName}`}
                    onDelete={() => setCreatedByFilter('ALL')}
                    deleteIcon={<CloseIcon />}
                    color="warning"
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
                    color="warning"
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
                background: `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.08)} 0%, ${alpha(statusTheme.lightColor, 0.05)} 100%)`,
                border: `1px solid ${alpha(statusTheme.mainColor, 0.15)}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: statusTheme.darkColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.9rem',
                }}
              >
                <AssignmentIcon fontSize="small" />
                {filteredRows.length} {statusFilter === 'PENDING' ? 'başvuru' : 'reddedilen üye'} listeleniyor
                {filteredRows.length !== rows.length && ` (Toplam ${rows.length} ${statusFilter === 'PENDING' ? 'başvurudan' : 'reddedilen üyeden'})`}
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
                background: `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.06)} 0%, ${alpha(statusTheme.lightColor, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(statusTheme.mainColor, 0.12)}`,
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
                  backgroundColor: alpha(statusTheme.mainColor, 0.03),
                  boxShadow: `inset 4px 0 0 ${statusTheme.mainColor}`,
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
              noRowsLabel: 'Başvuru bulunamadı',
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

      {/* Onay Dialog'u */}
      {confirmDialog.type === 'approve' && (
        <MemberApprovalDialog
          open={confirmDialog.open}
          onClose={handleCloseConfirmDialog}
          onConfirm={handleApproveConfirm}
          loading={!!processingId && processingId === confirmDialog.memberId}
          successMessage="Bu başvuruyu onaylamak istediğinize emin misiniz? Onaylandıktan sonra üye aktif hale gelecektir."
        />
      )}

      {/* Boş Alanlar Bilgilendirme Dialog'u */}
      <Dialog
        open={emptyFieldsInfoDialogOpen}
        onClose={() => setEmptyFieldsInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Bilgilendirme</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Üye başvurusu başarıyla onaylandı. Aşağıdaki alanlar boş olarak kaydedildi. İsterseniz üye düzenleme sayfasından bu bilgileri ekleyebilirsiniz:
          </Alert>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            {emptyFieldsList.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setEmptyFieldsInfoDialogOpen(false)}>
            Tamam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reddetme Dialog'u */}
      {confirmDialog.type === 'reject' && (
        <ConfirmDialog
          open={confirmDialog.open}
          onClose={handleCloseConfirmDialog}
          onConfirm={handleRejectConfirm}
          title="Başvuruyu Reddet"
          message="Bu başvuruyu reddetmek istediğinize emin misiniz? Bu işlem geri alınamaz."
          confirmText="Reddet"
          cancelText="İptal"
          variant="error"
          loading={!!processingId && processingId === confirmDialog.memberId}
        />
      )}
    </PageLayout>
  );
};

export default MembersApplicationsPage;
