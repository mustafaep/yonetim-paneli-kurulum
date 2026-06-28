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
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useNavigate } from 'react-router-dom';

  import type { MemberListItem, MemberStatus } from '../../../types/member';
import {
  getMembers,
  rejectMember,
  updateMember,
  deleteMember,
  exportMembersToPdf,
} from '../services/membersApi';
import { exportToExcel, exportToPDF, type ExportColumn } from '../../../shared/utils/exportUtils';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import ConfirmDialog from '../../../shared/components/common/ConfirmDialog';
import { ActivateMemberButton } from '../components/ActivateMemberButton';
import MemberStatusChangeDialog from '../components/MemberStatusChangeDialog';
import { getBranches } from '../../regions/services/branchesApi';
import { getInstitutions } from '../../regions/services/institutionsApi';
import type { Province, District } from '../../../types/region';
import {
  getProvinces,
  getDistricts,
} from '../../regions/services/regionsApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const ActiveWaitingMembersPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const [rows, setRows] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'APPROVED'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [provinceFilter, setProvinceFilter] = useState<string[]>([]);
  const [districtFilter, setDistrictFilter] = useState<string[]>([]);
  const [institutionFilter, setInstitutionFilter] = useState<string[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);
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

  // Status filtresine göre tema rengi
  const statusTheme = useMemo(() => {
    if (statusFilter === 'ACTIVE') {
      return {
        mainColor: theme.palette.success.main,
        darkColor: theme.palette.success.dark,
        lightColor: theme.palette.success.light,
      };
    } else if (statusFilter === 'APPROVED') {
      return {
        mainColor: theme.palette.info.main,
        darkColor: theme.palette.info.dark,
        lightColor: theme.palette.info.light,
      };
    } else {
      // ALL seçilirse mavi-yeşil karışımı
      return {
        mainColor: '#0891b2', // Cyan
        darkColor: '#0e7490',
        lightColor: '#22d3ee',
      };
    }
  }, [statusFilter, theme]);

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
        setDistrictFilter([]); // İl seçimi kaldırıldığında ilçe filtresini temizle
        return;
      }
      try {
        // Tüm seçili illerin ilçelerini birleştir
        const allDistricts: District[] = [];
        for (const provinceId of provinceFilter) {
          const data = await getDistricts(provinceId);
          allDistricts.push(...data);
        }
        setDistricts(allDistricts);
        // Seçili ilçeleri, yeni yüklenen ilçeler listesinde olmayanları temizle
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

  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Durum filtresi
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((row) => row.status === statusFilter);
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
  }, [rows, statusFilter, branchFilter, provinceFilter, districtFilter, institutionFilter, searchText]);

  const getStatusLabel = (status: MemberStatus): string => {
    switch (status) {
      case 'PENDING':
        return 'Başvuru Alındı';
      case 'APPROVED':
        return 'Beklemede';
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
        icon={<PeopleIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Üyeler"
        description="Onaylanmış ve aktif üyeleri görüntüleyin ve yönetin"
        color={statusFilter === 'ALL' ? '#0891b2' : statusTheme.mainColor}
        darkColor={statusFilter === 'ALL' ? '#059669' : statusTheme.darkColor}
        lightColor={statusFilter === 'ALL' ? undefined : statusTheme.lightColor}
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
            background: statusFilter === 'ALL'
              ? `linear-gradient(135deg, ${alpha('#0891b2', 0.02)} 0%, ${alpha('#059669', 0.02)} 100%)`
              : `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.02)} 0%, ${alpha(statusTheme.lightColor, 0.01)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: statusFilter === 'ALL'
                  ? `linear-gradient(135deg, #0891b2 0%, #059669 100%)`
                  : `linear-gradient(135deg, ${statusTheme.mainColor} 0%, ${statusTheme.darkColor} 100%)`,
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
                Üyeleri hızlıca bulun ve filtreleyin
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={2.5}>
            {/* Üyelik Durumu Filtresi */}
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
                <InputLabel>Üyelik Durumu</InputLabel>
                <Select
                  value={statusFilter}
                  label="Üyelik Durumu"
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'APPROVED')}
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 1 }}>
                      <FilterListIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                    </InputAdornment>
                  }
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: statusFilter !== 'ALL' ? 600 : 400,
                      color: statusFilter !== 'ALL' ? statusTheme.mainColor : 'inherit',
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
                    <Typography sx={{ fontWeight: statusFilter === 'ALL' ? 700 : 400 }}>
                      Tümü
                    </Typography>
                  </MenuItem>
                  <MenuItem value="ACTIVE">
                    <Typography sx={{ fontWeight: statusFilter === 'ACTIVE' ? 700 : 400 }}>
                      Aktif
                    </Typography>
                  </MenuItem>
                  <MenuItem value="APPROVED">
                    <Typography sx={{ fontWeight: statusFilter === 'APPROVED' ? 700 : 400 }}>
                      Beklemede
                    </Typography>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
                      boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.12)}`,
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
                      color: branchFilter !== 'ALL' ? statusTheme.mainColor : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: branchFilter !== 'ALL' ? statusTheme.mainColor : undefined,
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
                      boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.12)}`,
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
                          <Typography sx={{ fontWeight: 700, color: statusTheme.mainColor }}>
                            {province?.name || selected[0]}
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, color: statusTheme.mainColor }}>
                          {selected.length} il seçildi
                        </Typography>
                      </Box>
                    );
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: provinceFilter.length > 0 ? 600 : 400,
                      color: provinceFilter.length > 0 ? statusTheme.mainColor : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: provinceFilter.length > 0 ? statusTheme.mainColor : undefined,
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
                      boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.12)}`,
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
                          <Typography sx={{ fontWeight: 700, color: statusTheme.mainColor }}>
                            {district?.name || selected[0]}
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, color: statusTheme.mainColor }}>
                          {selected.length} ilçe seçildi
                        </Typography>
                      </Box>
                    );
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: districtFilter.length > 0 ? 600 : 400,
                      color: districtFilter.length > 0 ? statusTheme.mainColor : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: districtFilter.length > 0 ? statusTheme.mainColor : undefined,
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
                      boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.12)}`,
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
                          <Typography sx={{ fontWeight: 700, color: statusTheme.mainColor }}>
                            {institution?.name || selected[0]}
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, color: statusTheme.mainColor }}>
                          {selected.length} kurum seçildi
                        </Typography>
                      </Box>
                    );
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      fontWeight: institutionFilter.length > 0 ? 600 : 400,
                      color: institutionFilter.length > 0 ? statusTheme.mainColor : 'inherit',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: institutionFilter.length > 0 ? statusTheme.mainColor : undefined,
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
          {(statusFilter !== 'ALL' || branchFilter !== 'ALL' || provinceFilter.length > 0 || districtFilter.length > 0 || institutionFilter.length > 0 || searchText.trim()) && (
            <Box
              sx={{
                mt: 3,
                p: 2.5,
                borderRadius: 2.5,
                background: statusFilter === 'ALL'
                  ? `linear-gradient(135deg, ${alpha('#0891b2', 0.08)} 0%, ${alpha('#059669', 0.08)} 100%)`
                  : `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.08)} 0%, ${alpha(statusTheme.lightColor, 0.05)} 100%)`,
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
                    setStatusFilter('ALL');
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
                {statusFilter !== 'ALL' && (
                  <Chip
                    label={`Durum: ${statusFilter === 'ACTIVE' ? 'Aktif' : 'Beklemede'}`}
                    onDelete={() => setStatusFilter('ALL')}
                    deleteIcon={<CloseIcon />}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                      backgroundColor: alpha(statusTheme.mainColor, 0.12),
                      color: statusTheme.mainColor,
                      border: `1px solid ${alpha(statusTheme.mainColor, 0.3)}`,
                      '& .MuiChip-deleteIcon': {
                        fontSize: '1.1rem',
                        color: statusTheme.mainColor,
                        '&:hover': {
                          color: statusTheme.darkColor,
                        },
                      },
                    }}
                  />
                )}
                {branchFilter !== 'ALL' && (
                  <Chip
                    label={`Şube: ${branches.find(b => b.id === branchFilter)?.name || branchFilter}`}
                    onDelete={() => setBranchFilter('ALL')}
                    deleteIcon={<CloseIcon />}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                      backgroundColor: alpha(statusTheme.mainColor, 0.12),
                      color: statusTheme.mainColor,
                      border: `1px solid ${alpha(statusTheme.mainColor, 0.3)}`,
                      '& .MuiChip-deleteIcon': {
                        fontSize: '1.1rem',
                        color: statusTheme.mainColor,
                        '&:hover': {
                          color: statusTheme.darkColor,
                        },
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
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        height: 32,
                        backgroundColor: alpha(statusTheme.mainColor, 0.12),
                        color: statusTheme.mainColor,
                        border: `1px solid ${alpha(statusTheme.mainColor, 0.3)}`,
                        '& .MuiChip-deleteIcon': {
                          fontSize: '1.1rem',
                          color: statusTheme.mainColor,
                          '&:hover': {
                            color: statusTheme.darkColor,
                          },
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
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        height: 32,
                        backgroundColor: alpha(statusTheme.mainColor, 0.12),
                        color: statusTheme.mainColor,
                        border: `1px solid ${alpha(statusTheme.mainColor, 0.3)}`,
                        '& .MuiChip-deleteIcon': {
                          fontSize: '1.1rem',
                          color: statusTheme.mainColor,
                          '&:hover': {
                            color: statusTheme.darkColor,
                          },
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
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        height: 32,
                        backgroundColor: alpha(statusTheme.mainColor, 0.12),
                        color: statusTheme.mainColor,
                        border: `1px solid ${alpha(statusTheme.mainColor, 0.3)}`,
                        '& .MuiChip-deleteIcon': {
                          fontSize: '1.1rem',
                          color: statusTheme.mainColor,
                          '&:hover': {
                            color: statusTheme.darkColor,
                          },
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
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      height: 32,
                      backgroundColor: alpha(statusTheme.mainColor, 0.12),
                      color: statusTheme.mainColor,
                      border: `1px solid ${alpha(statusTheme.mainColor, 0.3)}`,
                      '& .MuiChip-deleteIcon': {
                        fontSize: '1.1rem',
                        color: statusTheme.mainColor,
                        '&:hover': {
                          color: statusTheme.darkColor,
                        },
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
                background: statusFilter === 'ALL'
                  ? `linear-gradient(135deg, ${alpha('#0891b2', 0.08)} 0%, ${alpha('#059669', 0.08)} 100%)`
                  : `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.08)} 0%, ${alpha(statusTheme.lightColor, 0.05)} 100%)`,
                border: `1px solid ${alpha(statusTheme.mainColor, 0.15)}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: statusFilter === 'ALL' ? '#0e7490' : statusTheme.darkColor,
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
                    headerName: col.headerName || col.field,
                    width: col.width,
                    valueGetter: col.valueGetter,
                  }));
                  exportToExcel(filteredRows, exportColumns, 'uyeler-onayli-aktif');
                  toast.showSuccess('Excel dosyası indirildi');
                }}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  px: 3,
                  py: 1.25,
                  fontSize: '0.9rem',
                  borderWidth: 2,
                  borderColor: statusTheme.mainColor,
                  color: statusTheme.mainColor,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: statusTheme.darkColor,
                    backgroundColor: alpha(statusTheme.mainColor, 0.08),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 16px ${alpha(statusTheme.mainColor, 0.25)}`,
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
                    toast.showSuccess('PDF dosyası indirildi');
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
                  borderColor: statusTheme.mainColor,
                  color: statusTheme.mainColor,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: statusTheme.darkColor,
                    backgroundColor: alpha(statusTheme.mainColor, 0.08),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 16px ${alpha(statusTheme.mainColor, 0.25)}`,
                  },
                }}
              >
                PDF İndir
              </Button>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<FileDownloadIcon />}
                onClick={() => {
                  const exportColumns: ExportColumn[] = columns.map((col) => ({
                    field: col.field,
                    headerName: col.headerName || col.field,
                    width: col.width,
                    valueGetter: col.valueGetter,
                  }));
                  exportToPDF(filteredRows, exportColumns, 'uyeler-onayli-aktif', 'Üyeler Listesi (Onaylı ve Aktif)', toast.showInfo);
                  toast.showSuccess('HTML dosyası indirildi');
                }}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 600,
                  px: 3,
                  py: 1.25,
                  fontSize: '0.9rem',
                  borderWidth: 2,
                  borderColor: statusTheme.mainColor,
                  color: statusTheme.mainColor,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: statusTheme.darkColor,
                    backgroundColor: alpha(statusTheme.mainColor, 0.08),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 16px ${alpha(statusTheme.mainColor, 0.25)}`,
                  },
                }}
              >
                HTML İndir
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
                background: statusFilter === 'ALL'
                  ? `linear-gradient(135deg, ${alpha('#0891b2', 0.06)} 0%, ${alpha('#059669', 0.06)} 100%)`
                  : `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.06)} 0%, ${alpha(statusTheme.lightColor, 0.03)} 100%)`,
                borderBottom: `2px solid ${alpha(statusTheme.mainColor, 0.15)}`,
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
              sorting: {
                sortModel: [{ field: 'createdAt', sort: 'desc' }],
              },
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

export default ActiveWaitingMembersPage;

