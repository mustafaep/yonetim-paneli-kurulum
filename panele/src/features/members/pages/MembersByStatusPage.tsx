import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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
  IconButton,
  Tooltip,
  Alert,
  InputAdornment,
  Button,
  Stack,
  Grid,
  useTheme,
  alpha,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import FilterListIcon from '@mui/icons-material/FilterList';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
  import { exportToExcel, exportToPDF, type ExportColumn } from '../../../shared/utils/exportUtils';

import type { MemberListItem, MemberStatus } from '../../../types/member';
import { getMembers, exportMembersToPdf, updateMember, deleteMember } from '../services/membersApi';
import MemberStatusChangeDialog from '../components/MemberStatusChangeDialog';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { getBranches } from '../../regions/services/branchesApi';
import { getInstitutions } from '../../regions/services/institutionsApi';
import type { Province, District } from '../../../types/region';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import {
  getProvinces,
  getDistricts,
} from '../../regions/services/regionsApi';

const MembersByStatusPage: React.FC = () => {
  const { status } = useParams<{ status: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [provinceFilter, setProvinceFilter] = useState<string[]>([]);
  const [districtFilter, setDistrictFilter] = useState<string[]>([]);
  const [institutionFilter, setInstitutionFilter] = useState<string[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  
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

  const canChangeStatus = hasPermission('MEMBER_STATUS_CHANGE');
  const canDeleteMember = hasRole('ADMIN');

  // Durum bilgileri
  const statusInfo = useMemo(() => {
    const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' | 'secondary' }> = {
      ACTIVE: { label: 'Aktif Üyeler', color: 'success' },
      PENDING: { label: 'Bekleyen Üyeler', color: 'warning' },
      INACTIVE: { label: 'Pasif Üyeler', color: 'default' },
      RESIGNED: { label: 'İstifa Eden Üyeler', color: 'secondary' },
      EXPELLED: { label: 'İhraç Edilen Üyeler', color: 'error' },
      REJECTED: { label: 'Reddedilen Üyeler', color: 'error' },
    };
      return statusMap[status?.toUpperCase() || ''] || { label: 'Üyeler', color: 'info' };
  }, [status]);

  const memberStatus = status?.toUpperCase() as MemberStatus | undefined;

  // Şubeleri yükle
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await getBranches({ isActive: true });
        setBranches(data.map(b => ({ id: b.id, name: b.name })));
      } catch (e) {
        console.error('Şubeler yüklenirken hata:', e);
      }
    };
    loadBranches();
  }, []);

  // İlleri yükle
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const data = await getProvinces();
        setProvinces(data);
      } catch (e) {
        console.error('İller yüklenirken hata:', e);
      }
    };
    loadProvinces();
  }, []);

  // İlçeleri yükle (seçili illere göre)
  useEffect(() => {
    const loadDistricts = async () => {
      if (provinceFilter.length === 0) {
        setDistricts([]);
        setDistrictFilter([]);
        return;
      }
      try {
        const allDistricts: District[] = [];
        for (const provinceId of provinceFilter) {
          const data = await getDistricts(provinceId);
          allDistricts.push(...data);
        }
        setDistricts(allDistricts);
        setDistrictFilter(prev => 
          prev.filter(districtId => 
            allDistricts.some(d => d.id === districtId)
          )
        );
      } catch (e) {
        console.error('İlçeler yüklenirken hata:', e);
      }
    };
    loadDistricts();
  }, [provinceFilter]);

  // Kurumları yükle
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const data = await getInstitutions();
        setInstitutions(data.map(i => ({ id: i.id, name: i.name })));
      } catch (e) {
        console.error('Kurumlar yüklenirken hata:', e);
      }
    };
    loadInstitutions();
  }, []);

  // Filtrelenmiş veriler
  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Durum filtresi - sayfa durumuna göre
    if (memberStatus) {
      filtered = filtered.filter((row) => row.status === memberStatus);
    }

    // Şube filtresi
    if (branchFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.branch?.id === branchFilter);
    }

    // İl filtresi
    if (provinceFilter.length > 0) {
      filtered = filtered.filter((row) => 
        row.province?.id && provinceFilter.includes(row.province.id)
      );
    }

    // İlçe filtresi
    if (districtFilter.length > 0) {
      filtered = filtered.filter((row) => 
        row.district?.id && districtFilter.includes(row.district.id)
      );
    }

    // Kurum filtresi
    if (institutionFilter.length > 0) {
      filtered = filtered.filter((row) => 
        row.institution?.id && institutionFilter.includes(row.institution.id)
      );
    }

    // Arama filtresi (Sadece Ad ve Soyad)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (row) =>
          row.firstName.toLowerCase().includes(searchLower) ||
          row.lastName.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [rows, memberStatus, branchFilter, provinceFilter, districtFilter, institutionFilter, searchText]);

  const getStatusLabel = (status: MemberStatus): string => {
    switch (status) {
      case 'ACTIVE':
        return 'Aktif';
      case 'PENDING':
        return 'Onay Bekliyor';
      case 'RESIGNED':
        return 'İstifa';
      case 'EXPELLED':
        return 'İhraç';
      case 'REJECTED':
        return 'Reddedildi';
      case 'INACTIVE':
        return 'Pasif';
      default:
        return String(status);
    }
  };

  const getStatusColor = (status: MemberStatus): 'success' | 'warning' | 'error' | 'default' | 'info' | 'secondary' => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING':
        return 'warning';
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
      renderCell: (params: GridRenderCellParams<MemberListItem>) => (
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
          {canChangeStatus && params.row.status !== 'PENDING' && (
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
        </Box>
      ),
    },
  ];

  // Durum değiştirme handler
  const handleStatusChange = async (newStatus: MemberStatus, reason?: string) => {
    if (!selectedMember) return;

    setUpdatingStatus(true);
    try {
      const updateData: { status: MemberStatus; cancellationReason?: string } = { status: newStatus };
      if (reason && (newStatus === 'RESIGNED' || newStatus === 'EXPELLED')) {
        updateData.cancellationReason = reason;
      }
      await updateMember(selectedMember.id, updateData);
      toast.showSuccess('Üye durumu başarıyla güncellendi');
      setStatusDialogOpen(false);
      setSelectedMember(null);
      // Listeyi yeniden yükle ve kayıt tarihine göre sırala (yeni üyeler önce)
      const data = await getMembers();
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Azalan sıralama (yeni önce)
      });
      setRows(sortedData);
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
      // Listeyi yeniden yükle ve kayıt tarihine göre sırala (yeni üyeler önce)
      const data = await getMembers();
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Azalan sıralama (yeni önce)
      });
      setRows(sortedData);
    } catch (error: unknown) {
      console.error('Üye silinirken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Üye silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setError(null);
        const data = await getMembers();
        // Kayıt tarihine göre sırala (yeni üyeler önce)
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA; // Azalan sıralama (yeni önce)
        });
        setRows(sortedData);
      } catch (error: unknown) {
        console.error('Üyeler alınırken hata:', error);
        setError(getApiErrorMessage(error, 'Üyeler alınırken bir hata oluştu'));
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  return (
    <PageLayout>
      <PageHeader
        icon={<PeopleIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title={statusInfo.label}
        description={`${statusInfo.label} listesini görüntüleyin ve yönetin`}
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
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
            Yeni Üye Ekle
          </Button>
        }
        mobileContent={
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
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
            }}
          >
            Yeni Üye Ekle
          </Button>
        }
      />

      {/* Hata Mesajı */}
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
                Üyeleri hızlıca bulun ve filtreleyin
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={2.5}>
            {/* Arama */}
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <TextField
                placeholder="Ad, Soyad ile arayın..."
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
            {/* Şube */}
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
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                  },
                }}
              >
                <InputLabel>Şube Filtresi</InputLabel>
                <Select
                  value={branchFilter}
                  label="Şube Filtresi"
                  onChange={(e) => setBranchFilter(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: branchFilter !== 'ALL' ? 600 : 400,
                      color: branchFilter !== 'ALL' ? theme.palette.primary.main : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: branchFilter !== 'ALL' ? theme.palette.primary.main : undefined,
                      borderWidth: branchFilter !== 'ALL' ? 2 : 1,
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
                    <Typography>Tümü</Typography>
                  </MenuItem>
                  {branches.map((branch) => {
                    const isSelected = branchFilter === branch.id;
                    return (
                      <MenuItem 
                        key={branch.id} 
                        value={branch.id}
                        sx={{
                          backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected 
                              ? alpha(theme.palette.primary.main, 0.15) 
                              : alpha(theme.palette.action.hover, 0.05),
                          },
                        }}
                      >
                        <Typography 
                          sx={{ 
                            fontWeight: isSelected ? 700 : 400,
                            color: isSelected ? theme.palette.primary.main : 'inherit',
                          }}
                        >
                          {branch.name}
                        </Typography>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            {/* İl */}
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
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                  },
                }}
              >
                <InputLabel>İl Filtresi</InputLabel>
                <Select
                  multiple
                  value={provinceFilter}
                  label="İl Filtresi"
                  onChange={(e) => {
                    const value = e.target.value;
                    setProvinceFilter(typeof value === 'string' ? value.split(',') : value);
                  }}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'Tümü';
                    if (selected.length === 1) {
                      const province = provinces.find(p => p.id === selected[0]);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                            {province?.name || selected[0]}
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          {selected.length} il seçildi
                        </Typography>
                      </Box>
                    );
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: provinceFilter.length > 0 ? 600 : 400,
                      color: provinceFilter.length > 0 ? theme.palette.primary.main : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: provinceFilter.length > 0 ? theme.palette.primary.main : undefined,
                      borderWidth: provinceFilter.length > 0 ? 2 : 1,
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
                  {provinces.map((province) => {
                    const isSelected = provinceFilter.includes(province.id);
                    return (
                      <MenuItem 
                        key={province.id} 
                        value={province.id}
                        sx={{
                          backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected 
                              ? alpha(theme.palette.primary.main, 0.15) 
                              : alpha(theme.palette.action.hover, 0.05),
                          },
                        }}
                      >
                        <Typography 
                          sx={{ 
                            fontWeight: isSelected ? 700 : 400,
                            color: isSelected ? theme.palette.primary.main : 'inherit',
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
            {/* İlçe */}
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
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                  },
                }}
              >
                <InputLabel>İlçe Filtresi</InputLabel>
                <Select
                  multiple
                  value={districtFilter}
                  label="İlçe Filtresi"
                  onChange={(e) => {
                    const value = e.target.value;
                    setDistrictFilter(typeof value === 'string' ? value.split(',') : value);
                  }}
                  disabled={provinceFilter.length === 0}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'Tümü';
                    if (selected.length === 1) {
                      const district = districts.find(d => d.id === selected[0]);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                            {district?.name || selected[0]}
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          {selected.length} ilçe seçildi
                        </Typography>
                      </Box>
                    );
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: districtFilter.length > 0 ? 600 : 400,
                      color: districtFilter.length > 0 ? theme.palette.primary.main : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: districtFilter.length > 0 ? theme.palette.primary.main : undefined,
                      borderWidth: districtFilter.length > 0 ? 2 : 1,
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
                  {districts.map((district) => {
                    const isSelected = districtFilter.includes(district.id);
                    return (
                      <MenuItem 
                        key={district.id} 
                        value={district.id}
                        sx={{
                          backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected 
                              ? alpha(theme.palette.primary.main, 0.15) 
                              : alpha(theme.palette.action.hover, 0.05),
                          },
                        }}
                      >
                        <Typography 
                          sx={{ 
                            fontWeight: isSelected ? 700 : 400,
                            color: isSelected ? theme.palette.primary.main : 'inherit',
                          }}
                        >
                          {district.name}
                        </Typography>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            {/* Kurum */}
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
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                  },
                }}
              >
                <InputLabel>Kurum Filtresi</InputLabel>
                <Select
                  multiple
                  value={institutionFilter}
                  label="Kurum Filtresi"
                  onChange={(e) => {
                    const value = e.target.value;
                    setInstitutionFilter(typeof value === 'string' ? value.split(',') : value);
                  }}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'Tümü';
                    if (selected.length === 1) {
                      const institution = institutions.find(i => i.id === selected[0]);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                            {institution?.name || selected[0]}
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          {selected.length} kurum seçildi
                        </Typography>
                      </Box>
                    );
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: institutionFilter.length > 0 ? 600 : 400,
                      color: institutionFilter.length > 0 ? theme.palette.primary.main : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: institutionFilter.length > 0 ? theme.palette.primary.main : undefined,
                      borderWidth: institutionFilter.length > 0 ? 2 : 1,
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
                  {institutions.map((institution) => {
                    const isSelected = institutionFilter.includes(institution.id);
                    return (
                      <MenuItem 
                        key={institution.id} 
                        value={institution.id}
                        sx={{
                          backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                          '&:hover': {
                            backgroundColor: isSelected 
                              ? alpha(theme.palette.primary.main, 0.15) 
                              : alpha(theme.palette.action.hover, 0.05),
                          },
                        }}
                      >
                        <Typography 
                          sx={{ 
                            fontWeight: isSelected ? 700 : 400,
                            color: isSelected ? theme.palette.primary.main : 'inherit',
                          }}
                        >
                          {institution.name}
                        </Typography>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Seçili Filtreler */}
          {(branchFilter !== 'ALL' || provinceFilter.length > 0 || districtFilter.length > 0 || institutionFilter.length > 0 || searchText.trim()) && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    setBranchFilter('ALL');
                    setProvinceFilter([]);
                    setDistrictFilter([]);
                    setInstitutionFilter([]);
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
                {branchFilter !== 'ALL' && (
                  <Chip
                    label={`Şube: ${branches.find(b => b.id === branchFilter)?.name || branchFilter}`}
                    onDelete={() => setBranchFilter('ALL')}
                    deleteIcon={<CloseIcon />}
                    color="primary"
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
                {provinceFilter.map((provinceId) => {
                  const province = provinces.find(p => p.id === provinceId);
                  return (
                    <Chip
                      key={provinceId}
                      label={`İl: ${province?.name || provinceId}`}
                      onDelete={() => {
                        setProvinceFilter(prev => prev.filter(id => id !== provinceId));
                      }}
                      deleteIcon={<CloseIcon />}
                      color="primary"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        height: 32,
                        '& .MuiChip-deleteIcon': {
                          fontSize: '1.1rem',
                        },
                      }}
                    />
                  );
                })}
                {districtFilter.map((districtId) => {
                  const district = districts.find(d => d.id === districtId);
                  return (
                    <Chip
                      key={districtId}
                      label={`İlçe: ${district?.name || districtId}`}
                      onDelete={() => {
                        setDistrictFilter(prev => prev.filter(id => id !== districtId));
                      }}
                      deleteIcon={<CloseIcon />}
                      color="primary"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        height: 32,
                        '& .MuiChip-deleteIcon': {
                          fontSize: '1.1rem',
                        },
                      }}
                    />
                  );
                })}
                {institutionFilter.map((institutionId) => {
                  const institution = institutions.find(i => i.id === institutionId);
                  return (
                    <Chip
                      key={institutionId}
                      label={`Kurum: ${institution?.name || institutionId}`}
                      onDelete={() => {
                        setInstitutionFilter(prev => prev.filter(id => id !== institutionId));
                      }}
                      deleteIcon={<CloseIcon />}
                      color="primary"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        height: 32,
                        '& .MuiChip-deleteIcon': {
                          fontSize: '1.1rem',
                        },
                      }}
                    />
                  );
                })}
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
                      '& .MuiChip-deleteIcon': {
                        fontSize: '1.1rem',
                      },
                    }}
                  />
                )}
              </Box>
            </Box>
          )}

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
                <PeopleIcon fontSize="small" />
                {filteredRows.length} üye listeleniyor
                {filteredRows.length !== rows.length && ` (Toplam ${rows.length} üyeden)`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Tablo Bölümü */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {/* Export Butonları */}
          {!loading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<FileDownloadIcon />}
                onClick={() => {
                  const exportColumns: ExportColumn[] = columns.map((col) => ({
                    field: col.field,
                    headerName: col.headerName,
                    width: col.width,
                    valueGetter: col.valueGetter,
                  }));
                  exportToExcel(filteredRows, exportColumns, `uyeler_${status?.toLowerCase() || 'all'}`);
                }}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  px: 3,
                  py: 1.25,
                  fontSize: '0.9rem',
                  borderWidth: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
                  },
                }}
              >
                Excel İndir
              </Button>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<PictureAsPdfIcon />}
                onClick={async () => {
                  try {
                    await exportMembersToPdf();
                  } catch (error) {
                    console.error('PDF export hatası:', error);
                    toast.showError('PDF export sırasında bir hata oluştu');
                  }
                }}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  px: 3,
                  py: 1.25,
                  fontSize: '0.9rem',
                  borderWidth: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
                  },
                }}
              >
                PDF İndir
              </Button>
            </Box>
          )}

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
                noRowsLabel: 'Üye bulunamadı',
                MuiTablePagination: {
                  labelRowsPerPage: 'Sayfa başına satır:',
                },
              }}
            />
          </Box>
        </Box>
      </Card>

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

export default MembersByStatusPage;

