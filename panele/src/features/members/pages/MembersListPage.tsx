import React, { useEffect, useState, useMemo } from 'react';
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
import GroupsIcon from '@mui/icons-material/Groups';
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
import {
  getProvinces,
  getDistricts,
  getUserScopes,
} from '../../regions/services/regionsApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const MembersListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'ALL'>('ALL'); // Varsayılan olarak Tümü
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [provinceFilter, setProvinceFilter] = useState<string[]>([]);
  const [districtFilter, setDistrictFilter] = useState<string[]>([]);
  const [institutionFilter, setInstitutionFilter] = useState<string[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [scopeFiltersInitialized, setScopeFiltersInitialized] = useState(false);
  
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

  const extractRegistrationOrderValue = (registrationNumber?: string | null): number => {
    if (!registrationNumber) return -1;
    const digits = registrationNumber.match(/\d+/g)?.join('') ?? '';
    if (!digits) return -1;
    const parsed = Number(digits);
    return Number.isNaN(parsed) ? -1 : parsed;
  };

  const sortMembersByRegistrationDesc = (members: MemberListItem[]): MemberListItem[] => {
    return [...members].sort((a, b) => {
      const regB = extractRegistrationOrderValue(b.registrationNumber);
      const regA = extractRegistrationOrderValue(a.registrationNumber);
      if (regB !== regA) return regB - regA;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  };

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

  // Scope kısıtlı kullanıcılar için il/ilçe filtrelerini varsayılan seçili getir
  useEffect(() => {
    if (!user?.id || scopeFiltersInitialized) return;
    if (!hasPermission('MEMBER_LIST_BY_PROVINCE') || hasRole('ADMIN')) {
      setScopeFiltersInitialized(true);
      return;
    }

    const loadUserScopeFilters = async () => {
      try {
        const scopes = await getUserScopes(user.id);
        if (!Array.isArray(scopes) || scopes.length === 0) {
          setScopeFiltersInitialized(true);
          return;
        }

        const scopedProvinceIds = Array.from(
          new Set(
            scopes
              .map((scope) => scope.province?.id)
              .filter((provinceId): provinceId is string => !!provinceId),
          ),
        );

        const scopedDistrictIds = Array.from(
          new Set(
            scopes
              .map((scope) => scope.district?.id)
              .filter((districtId): districtId is string => !!districtId),
          ),
        );

        if (scopedProvinceIds.length > 0) {
          setProvinceFilter((prev) => (prev.length > 0 ? prev : scopedProvinceIds));
        }
        if (scopedDistrictIds.length > 0) {
          setDistrictFilter((prev) => (prev.length > 0 ? prev : scopedDistrictIds));
        }
      } catch (e) {
        console.error('Kullanıcı scope filtreleri alınırken hata:', e);
      } finally {
        setScopeFiltersInitialized(true);
      }
    };

    loadUserScopeFilters();
  }, [user?.id, scopeFiltersInitialized, hasPermission, hasRole]);

  // Filtrelenmiş veriler
  // Not: Backend status filtresine göre veri döndürür, bu yüzden frontend'de sadece diğer filtreler uygulanır
  const filteredRows = useMemo(() => {
    let filtered = rows;

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
  }, [rows, branchFilter, provinceFilter, districtFilter, institutionFilter, searchText]);

  const getStatusLabel = (status: MemberStatus | 'ALL'): string => {
    if (status === 'ALL') return 'Tümü';
    switch (status) {
      case 'ACTIVE':
        return 'Aktif';
      case 'PENDING':
        return 'Onay Bekliyor';
      case 'APPROVED':
        return 'Beklemede';
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

  const getStatusColor = (status: MemberStatus | 'ALL'): 'success' | 'warning' | 'error' | 'default' | 'info' | 'secondary' => {
    if (status === 'ALL') return 'info';
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'info';
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

  const getMemberGroupLabel = (row: MemberListItem): string => {
    const memberGroupName = row.memberGroup?.name?.trim();
    if (memberGroupName) return memberGroupName;

    // Eski/eksik kayıtlarda memberGroup boş olabilir; üyelik bilgisi etiketini fallback göster.
    const membershipInfoLabel = (row as MemberListItem & {
      membershipInfoOption?: { label?: string | null } | null;
    }).membershipInfoOption?.label?.trim();

    return membershipInfoLabel || '-';
  };

  // Sabit renk haritası; bilinmeyen gruplar için hash tabanlı palet
  const MEMBER_GROUP_COLOR_MAP: Record<string, { chip: string; chipText: string; exportBg: string; exportText: string }> = {
    'üye':         { chip: '#1565c0', chipText: '#fff', exportBg: '#BBDEFB', exportText: '0D47A1' },
    'fahri üye':   { chip: '#e65100', chipText: '#fff', exportBg: '#FFE0B2', exportText: 'BF360C' },
    'onursal üye': { chip: '#4a148c', chipText: '#fff', exportBg: '#EDE7F6', exportText: '4A148C' },
    'aday üye':    { chip: '#006064', chipText: '#fff', exportBg: '#E0F7FA', exportText: '006064' },
  };

  const MEMBER_GROUP_PALETTE = [
    { chip: '#1B5E20', chipText: '#fff', exportBg: '#C8E6C9', exportText: '1B5E20' },
    { chip: '#880E4F', chipText: '#fff', exportBg: '#FCE4EC', exportText: '880E4F' },
    { chip: '#1A237E', chipText: '#fff', exportBg: '#E8EAF6', exportText: '1A237E' },
    { chip: '#BF360C', chipText: '#fff', exportBg: '#FBE9E7', exportText: 'BF360C' },
    { chip: '#004D40', chipText: '#fff', exportBg: '#E0F2F1', exportText: '004D40' },
    { chip: '#6A1B9A', chipText: '#fff', exportBg: '#F3E5F5', exportText: '6A1B9A' },
    { chip: '#B71C1C', chipText: '#fff', exportBg: '#FFEBEE', exportText: 'B71C1C' },
    { chip: '#01579B', chipText: '#fff', exportBg: '#E1F5FE', exportText: '01579B' },
    { chip: '#558B2F', chipText: '#fff', exportBg: '#F1F8E9', exportText: '558B2F' },
    { chip: '#F57F17', chipText: '#fff', exportBg: '#FFFDE7', exportText: 'F57F17' },
    { chip: '#4E342E', chipText: '#fff', exportBg: '#EFEBE9', exportText: '4E342E' },
    { chip: '#00695C', chipText: '#fff', exportBg: '#E0F2F1', exportText: '00695C' },
  ];

  const getMemberGroupColors = (name: string | null | undefined) => {
    const EMPTY = { chip: '#9e9e9e', chipText: '#fff', exportBg: '#F5F5F5', exportText: '424242' };
    if (!name || name === '-') return EMPTY;
    const key = name.trim().toLowerCase();
    const known = MEMBER_GROUP_COLOR_MAP[key];
    if (known) return known;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return MEMBER_GROUP_PALETTE[Math.abs(hash) % MEMBER_GROUP_PALETTE.length];
  };

  // Status'a göre tema rengi config'i (MemberDetailPage'den alındı)
  const getStatusThemeConfig = (status: MemberStatus | 'ALL') => {
    if (status === 'ALL') {
      // Tümü seçildiğinde mavi-yeşil karışımı
      return {
        mainColor: '#0891b2', // Cyan
        darkColor: '#0e7490',
        lightColor: '#22d3ee',
      };
    }
    const configs: any = {
      ACTIVE: {
        mainColor: theme.palette.success.main,
        darkColor: theme.palette.success.dark,
        lightColor: theme.palette.success.light,
      },
      PENDING: {
        mainColor: theme.palette.warning.main,
        darkColor: theme.palette.warning.dark,
        lightColor: theme.palette.warning.light,
      },
      APPROVED: {
        mainColor: theme.palette.info.main,
        darkColor: theme.palette.info.dark,
        lightColor: theme.palette.info.light,
      },
      REJECTED: {
        mainColor: theme.palette.error.main,
        darkColor: theme.palette.error.dark,
        lightColor: theme.palette.error.light,
      },
      EXPELLED: {
        mainColor: '#212121',
        darkColor: '#000000',
        lightColor: '#616161',
      },
      RESIGNED: {
        mainColor: theme.palette.secondary.main,
        darkColor: theme.palette.secondary.dark,
        lightColor: theme.palette.secondary.light,
      },
      INACTIVE: {
        mainColor: '#757575',
        darkColor: '#616161',
        lightColor: '#9e9e9e',
      },
    };
    return configs[status] || configs.ACTIVE;
  };

  const statusTheme = getStatusThemeConfig(statusFilter);

  // Üyelik durumuna göre export hücre renkleri (HTML/PDF ve Excel için)
  const STATUS_EXPORT_CELL: Record<string, { bg: string; text: string; bgRgb: string; textRgb: string }> = {
    ACTIVE:   { bg: '#e8f5e9', text: '#1b5e20', bgRgb: 'E8F5E9', textRgb: '1B5E20' },
    PENDING:  { bg: '#fff8e1', text: '#e65100', bgRgb: 'FFF8E1', textRgb: 'E65100' },
    APPROVED: { bg: '#e3f2fd', text: '#0d47a1', bgRgb: 'E3F2FD', textRgb: '0D47A1' },
    REJECTED: { bg: '#ffebee', text: '#b71c1c', bgRgb: 'FFEBEE', textRgb: 'B71C1C' },
    EXPELLED: { bg: '#212121', text: '#ffffff', bgRgb: '212121', textRgb: 'FFFFFF' },
    RESIGNED: { bg: '#f3e5f5', text: '#4a148c', bgRgb: 'F3E5F5', textRgb: '4A148C' },
    INACTIVE: { bg: '#f5f5f5', text: '#424242', bgRgb: 'F5F5F5', textRgb: '424242' },
  };

  const exportColumns: ExportColumn[] = [
    {
      field: 'status',
      headerName: 'Üyelik Durumu',
      valueGetter: (_value, row) => getStatusLabel(row.status),
      cellStyleGetter: (_value, row) => {
        const s = STATUS_EXPORT_CELL[row.status] ?? STATUS_EXPORT_CELL.INACTIVE;
        return `background-color:${s.bg};color:${s.text};font-weight:700;text-align:center;border-radius:4px;padding:3px 8px;`;
      },
      cellExcelStyleGetter: (_value, row) => {
        const s = STATUS_EXPORT_CELL[row.status] ?? STATUS_EXPORT_CELL.INACTIVE;
        return { bgRgb: s.bgRgb, textRgb: s.textRgb };
      },
    },
    {
      field: 'registrationNumber',
      headerName: 'Üye Kayıt No',
      valueGetter: (_value, row) => row.registrationNumber ?? '-',
    },
    {
      field: 'memberGroup',
      headerName: 'Üye Grubu',
      valueGetter: (_value, row) => getMemberGroupLabel(row as MemberListItem),
    },
    {
      field: 'fullName',
      headerName: 'Ad Soyadı',
      valueGetter: (_value, row) => `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
    },
    {
      field: 'nationalId',
      headerName: 'TC Kimlik Numarası',
      valueGetter: (_value, row) => row.nationalId ?? '-',
    },
    {
      field: 'institution',
      headerName: 'Çalıştığı Kurum',
      valueGetter: (_value, row) => row.institution?.name ?? '-',
    },
  ];

  // HTML/PDF export: satır arka plan rengi (tr style)
  const getStatusRowStyleForExport = (row: MemberListItem): string => {
    const status = row.status;
    const map: Record<string, string> = {
      ACTIVE: '#e8f5e9',
      PENDING: '#fff8e1',
      APPROVED: '#e3f2fd',
      RESIGNED: '#f3e5f5',
      INACTIVE: '#f5f5f5',
      REJECTED: '#ffebee',
      EXPELLED: '#212121',
    };
    const color = map[status] || '#ffffff';
    if (status === 'EXPELLED') {
      return `background-color: ${color}; color: #ffffff;`;
    }
    return `background-color: ${color};`;
  };

  // Excel export: satır arka plan rengi ({ bgRgb, textRgb } → # olmadan HEX)
  const getStatusRowStyleForExcel = (row: MemberListItem): { bgRgb: string; textRgb: string } => {
    const map: Record<string, { bgRgb: string; textRgb: string }> = {
      ACTIVE:   { bgRgb: 'E8F5E9', textRgb: '1B5E20' },
      PENDING:  { bgRgb: 'FFF8E1', textRgb: 'E65100' },
      APPROVED: { bgRgb: 'E3F2FD', textRgb: '0D47A1' },
      RESIGNED: { bgRgb: 'F3E5F5', textRgb: '4A148C' },
      INACTIVE: { bgRgb: 'F5F5F5', textRgb: '424242' },
      REJECTED: { bgRgb: 'FFEBEE', textRgb: 'B71C1C' },
      EXPELLED: { bgRgb: '212121', textRgb: 'FFFFFF' },
    };
    return map[row.status] ?? { bgRgb: 'FFFFFF', textRgb: '212121' };
  };

  const columns: GridColDef<MemberListItem>[] = [
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

        // Safely get the color from palette with fallback
        const getShadowColor = (color: string): string => {
          const palette = theme.palette as any;
          const colorObj = palette[color];
          if (colorObj && colorObj.main) {
            return colorObj.main;
          }
          // Fallback to grey if color not found
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
      field: 'registrationNumber',
      headerName: 'Üye Kayıt No',
      flex: 1,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberListItem) => row.registrationNumber ?? '-',
    },
    {
      field: 'memberGroup',
      headerName: 'Üye Grubu',
      flex: 1,
      minWidth: 160,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row: MemberListItem) => getMemberGroupLabel(row),
      renderCell: (params: GridRenderCellParams<MemberListItem>) => {
        const label = getMemberGroupLabel(params.row);
        const colors = getMemberGroupColors(params.row.memberGroup?.name);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Chip
              label={label}
              size="medium"
              sx={{
                backgroundColor: colors.chip,
                color: colors.chipText,
                fontWeight: 700,
                fontSize: '0.8rem',
                height: '28px',
                borderRadius: 1.5,
                px: 0.5,
                boxShadow: `0 1px 4px ${alpha(colors.chip, 0.35)}`,
              }}
            />
          </Box>
        );
      },
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
                background: `linear-gradient(135deg, ${alpha(statusTheme.mainColor, 0.1)} 0%, ${alpha(statusTheme.lightColor, 0.05)} 100%)`,
                border: `1px solid ${alpha(statusTheme.mainColor, 0.2)}`,
                color: statusTheme.mainColor,
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: `linear-gradient(135deg, ${statusTheme.mainColor} 0%, ${statusTheme.darkColor} 100%)`,
                  color: '#fff',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha(statusTheme.mainColor, 0.35)}`,
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
  const handleStatusChange = async (status: MemberStatus, reason?: string) => {
    if (!selectedMember) return;

    // İptal / ihraç edilen bir üyeyi ACTIVE yapmaya çalışınca:
    // Üye başvuru sayfasına yönlendir ve TC'yi otomatik doldur
    if (
      status === 'ACTIVE' &&
      (selectedMember.status === 'RESIGNED' || selectedMember.status === 'EXPELLED')
    ) {
      const nationalId = selectedMember.nationalId ?? '';
      setStatusDialogOpen(false);
      setSelectedMember(null);
      navigate(
        nationalId
          ? `/members/applications/new?nationalId=${encodeURIComponent(nationalId)}`
          : '/members/applications/new'
      );
      return;
    }

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
      // Listeyi yeniden yükle
      let data: MemberListItem[] = [];
      if (statusFilter === 'ALL') {
        // Tümü seçildiğinde tüm durumlardaki üyeleri paralel olarak çek
        const statuses: MemberStatus[] = ['ACTIVE', 'APPROVED', 'INACTIVE', 'RESIGNED', 'EXPELLED'];
        const results = await Promise.all(
          statuses.map(status => getMembers(status))
        );
        // Tüm sonuçları birleştir
        data = results.flat();
      } else {
        // Belirli bir durum seçildiğinde sadece o durumdaki üyeleri çek
        data = await getMembers(statusFilter);
      }
      setRows(sortMembersByRegistrationDesc(data));
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
      // Listeyi yeniden yükle
      let data: MemberListItem[] = [];
      if (statusFilter === 'ALL') {
        // Tümü seçildiğinde tüm durumlardaki üyeleri paralel olarak çek
        const statuses: MemberStatus[] = ['ACTIVE', 'APPROVED', 'INACTIVE', 'RESIGNED', 'EXPELLED'];
        const results = await Promise.all(
          statuses.map(status => getMembers(status))
        );
        // Tüm sonuçları birleştir
        data = results.flat();
      } else {
        // Belirli bir durum seçildiğinde sadece o durumdaki üyeleri çek
        data = await getMembers(statusFilter);
      }
      setRows(sortMembersByRegistrationDesc(data));
    } catch (error: unknown) {
      console.error('Üye silinirken hata:', error);
      toast.showError(getApiErrorMessage(error, 'Üye silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        setError(null);

        let data: MemberListItem[] = [];
        
        if (statusFilter === 'ALL') {
          // Tümü seçildiğinde tüm durumlardaki üyeleri paralel olarak çek
          const statuses: MemberStatus[] = ['ACTIVE', 'APPROVED', 'INACTIVE', 'RESIGNED', 'EXPELLED'];
          const results = await Promise.all(
            statuses.map(status => getMembers(status))
          );
          // Tüm sonuçları birleştir
          data = results.flat();
        } else {
          // Belirli bir durum seçildiğinde sadece o durumdaki üyeleri çek
          data = await getMembers(statusFilter);
        }

        setRows(sortMembersByRegistrationDesc(data));
      } catch (error: unknown) {
        console.error('Üyeler alınırken hata:', error);
        setError(getApiErrorMessage(error, 'Üyeler alınırken bir hata oluştu'));
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [statusFilter]);

  return (
    <PageLayout>
      {/* Modern Başlık Bölümü - Status'a göre dinamik renk */}
      <PageHeader
        icon={<GroupsIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Tüm Üyeler"
        description="Yetkili olduğunuz bölgedeki tüm üyeleri görüntüleyin ve yönetin"
        color={statusTheme.mainColor}
        darkColor={statusTheme.darkColor}
        lightColor={statusTheme.lightColor}
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
              background: `linear-gradient(135deg, ${statusTheme.mainColor} 0%, ${statusTheme.darkColor} 100%)`,
              boxShadow: `0 8px 24px ${alpha(statusTheme.mainColor, 0.35)}`,
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
                <InputLabel>Durum Filtresi</InputLabel>
                <Select
                  value={statusFilter}
                  label="Durum Filtresi"
                  onChange={(e) => setStatusFilter(e.target.value as MemberStatus | 'ALL')}
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
                  <MenuItem value="ALL">
                    <Typography sx={{ 
                      fontWeight: statusFilter === 'ALL' ? 700 : 400,
                      color: statusFilter === 'ALL' ? getStatusThemeConfig('ALL').mainColor : 'inherit',
                    }}>
                      Tümü
                    </Typography>
                  </MenuItem>
                  <MenuItem value="ACTIVE">
                    <Typography sx={{ 
                      fontWeight: statusFilter === 'ACTIVE' ? 700 : 400,
                      color: statusFilter === 'ACTIVE' ? getStatusThemeConfig('ACTIVE').mainColor : 'inherit',
                    }}>
                      Aktif
                    </Typography>
                  </MenuItem>
                  <MenuItem value="APPROVED">
                    <Typography sx={{ 
                      fontWeight: statusFilter === 'APPROVED' ? 700 : 400,
                      color: statusFilter === 'APPROVED' ? getStatusThemeConfig('APPROVED').mainColor : 'inherit',
                    }}>
                      Beklemede
                    </Typography>
                  </MenuItem>
                  <MenuItem value="INACTIVE">
                    <Typography sx={{ 
                      fontWeight: statusFilter === 'INACTIVE' ? 700 : 400,
                      color: statusFilter === 'INACTIVE' ? getStatusThemeConfig('INACTIVE').mainColor : 'inherit',
                    }}>
                      Pasif
                    </Typography>
                  </MenuItem>
                  <MenuItem value="RESIGNED">
                    <Typography sx={{ 
                      fontWeight: statusFilter === 'RESIGNED' ? 700 : 400,
                      color: statusFilter === 'RESIGNED' ? getStatusThemeConfig('RESIGNED').mainColor : 'inherit',
                    }}>
                      İstifa
                    </Typography>
                  </MenuItem>
                  <MenuItem value="EXPELLED">
                    <Typography sx={{ 
                      fontWeight: statusFilter === 'EXPELLED' ? 700 : 400,
                      color: statusFilter === 'EXPELLED' ? getStatusThemeConfig('EXPELLED').mainColor : 'inherit',
                    }}>
                      İhraç
                    </Typography>
                  </MenuItem>
                </Select>
              </FormControl>
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
                    label={`Durum: ${getStatusLabel(statusFilter)}`}
                    onDelete={() => setStatusFilter('ALL')}
                    deleteIcon={<CloseIcon />}
                    color={getStatusColor(statusFilter)}
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
                {branchFilter !== 'ALL' && (
                  <Chip
                    label={`Şube: ${branches.find(b => b.id === branchFilter)?.name || branchFilter}`}
                    onDelete={() => setBranchFilter('ALL')}
                    deleteIcon={<CloseIcon />}
                    color={getStatusColor(statusFilter)}
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
                      color={getStatusColor(statusFilter)}
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
                      color={getStatusColor(statusFilter)}
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
                      color={getStatusColor(statusFilter)}
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
                    color={getStatusColor(statusFilter)}
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
                <GroupsIcon fontSize="small" />
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
                  exportToExcel(filteredRows, exportColumns, 'uyeler', getStatusRowStyleForExcel);
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
                    await exportMembersToPdf(statusFilter);
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
                  exportToPDF(
                    filteredRows,
                    exportColumns,
                    'uyeler',
                    'Üyeler Listesi',
                    toast.showInfo,
                    getStatusRowStyleForExport,
                  );
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
                  boxShadow: `inset 4px 0 0 ${statusTheme.mainColor}`,
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
                  sortModel: [{ field: 'registrationNumber', sort: 'desc' }],
                },
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

export default MembersListPage;
