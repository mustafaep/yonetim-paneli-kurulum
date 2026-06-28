// src/pages/regions/InstitutionsPage.tsx
import React, { useEffect, useRef, useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  alpha,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Divider,
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WorkIcon from '@mui/icons-material/Work';
import EditIcon from '@mui/icons-material/Edit';
import RestoreIcon from '@mui/icons-material/Restore';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import type { Province, District, Institution, UserScope } from '../../../types/region';
import {
  getProvinces,
  getDistricts,
  getInstitutions,
  getUserScopes,
  createInstitution,
  approveInstitution,
  deleteInstitution,
  type DeleteInstitutionDto,
} from '../services/regionsApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import {
  getProfessions,
  getAllProfessions,
  createProfession,
  updateProfession,
  deleteProfession,
  type Profession,
} from '../../professions/services/professionsApi';

const InstitutionsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [rows, setRows] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState<DeleteInstitutionDto['memberActionType']>('REMOVE_INSTITUTION');
  const [deleteTargetInstitutionId, setDeleteTargetInstitutionId] = useState<string>('');
  const [availableInstitutions, setAvailableInstitutions] = useState<Institution[]>([]);
  const [form, setForm] = useState<{
    name: string;
    provinceId: string;
    districtId: string;
  }>({
    name: '',
    provinceId: '',
    districtId: '',
  });

  // Meslek/Unvanlar state
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loadingProfessions, setLoadingProfessions] = useState(false);
  const [showInactiveProfessions, setShowInactiveProfessions] = useState(false);
  const [professionDialogOpen, setProfessionDialogOpen] = useState(false);
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null);
  const [professionForm, setProfessionForm] = useState<{ name: string; isActive: boolean }>({ name: '', isActive: true });
  const [savingProfession, setSavingProfession] = useState(false);
  const [deleteProfessionDialogOpen, setDeleteProfessionDialogOpen] = useState(false);
  const [deletingProfession, setDeletingProfession] = useState<Profession | null>(null);

  const { hasPermission, hasRole, user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const canManageInstitution = hasPermission('INSTITUTION_CREATE') || hasPermission('INSTITUTION_UPDATE');
  const canListInstitution = hasPermission('INSTITUTION_LIST');
  const canApproveInstitution = hasPermission('INSTITUTION_APPROVE');
  const canDeleteInstitution = hasPermission('INSTITUTION_UPDATE');
  const canViewInstitution = hasPermission('INSTITUTION_LIST');
  const canViewProfession = hasPermission('PROFESSION_VIEW');
  const canCreateProfession = hasPermission('PROFESSION_CREATE');
  const canUpdateProfession = hasPermission('PROFESSION_UPDATE');
  const canDeleteProfession = hasPermission('PROFESSION_DELETE');
  const canShowProfessionActions = canUpdateProfession || canDeleteProfession;
  const hasScopedRegionAccess = hasPermission('MEMBER_LIST_BY_PROVINCE');
  const isAdmin = hasRole('ADMIN');
  const [userScopes, setUserScopes] = useState<UserScope[]>([]);
  const shouldRestrictByScope = hasScopedRegionAccess && !isAdmin && userScopes.length > 0;

  const allowedProvinceIds = React.useMemo(() => {
    if (!shouldRestrictByScope) return null;
    return new Set(
      userScopes
        .map((scope) => scope.province?.id)
        .filter((id): id is string => Boolean(id)),
    );
  }, [shouldRestrictByScope, userScopes]);

  const districtScopeByProvince = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!shouldRestrictByScope) return map;
    userScopes.forEach((scope) => {
      const provinceId = scope.province?.id;
      if (!provinceId) return;
      if (!map.has(provinceId)) map.set(provinceId, new Set<string>());
      if (scope.district?.id) {
        map.get(provinceId)?.add(scope.district.id);
      }
    });
    return map;
  }, [shouldRestrictByScope, userScopes]);

  const provinceHasFullAccess = React.useMemo(() => {
    const set = new Set<string>();
    if (!shouldRestrictByScope) return set;
    userScopes.forEach((scope) => {
      const provinceId = scope.province?.id;
      if (provinceId && !scope.district?.id) set.add(provinceId);
    });
    return set;
  }, [shouldRestrictByScope, userScopes]);

  const filterInstitutionsByScope = React.useCallback(
    (data: Institution[]) => {
      if (!shouldRestrictByScope || !allowedProvinceIds) return data;
      return data.filter((inst) => {
        const provinceId = inst.provinceId ?? inst.province?.id ?? '';
        if (!provinceId || !allowedProvinceIds.has(provinceId)) return false;
        if (provinceHasFullAccess.has(provinceId)) return true;
        const allowedDistricts = districtScopeByProvince.get(provinceId);
        if (!allowedDistricts || allowedDistricts.size === 0) return false;
        const districtId = inst.districtId ?? inst.district?.id ?? '';
        return Boolean(districtId && allowedDistricts.has(districtId));
      });
    },
    [shouldRestrictByScope, allowedProvinceIds, provinceHasFullAccess, districtScopeByProvince],
  );

  const filterDistrictsByScope = React.useCallback(
    (provinceId: string, data: District[]) => {
      if (!shouldRestrictByScope) return data;
      if (provinceHasFullAccess.has(provinceId)) return data;
      const allowedDistricts = districtScopeByProvince.get(provinceId);
      if (!allowedDistricts) return [];
      return data.filter((district) => allowedDistricts.has(district.id));
    },
    [shouldRestrictByScope, provinceHasFullAccess, districtScopeByProvince],
  );

  const loadProvinces = async () => {
    try {
      const data = await getProvinces();
      const list = Array.isArray(data) ? data : [];
      const scopedList =
        shouldRestrictByScope && allowedProvinceIds
          ? list.filter((province) => allowedProvinceIds.has(province.id))
          : list;
      setProvinces(scopedList);
    } catch (e: unknown) {
      console.error('İller alınırken hata:', e);
      setProvinces([]);
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
      const list = Array.isArray(data) ? data : [];
      setDistricts(filterDistrictsByScope(provinceId, list));
    } catch (e: unknown) {
      console.error('İlçeler alınırken hata:', e);
      setDistricts([]);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'İlçeler alınırken bir hata oluştu.');
    }
  };

  const loadInstitutions = async (provinceId?: string, districtId?: string, isActive?: boolean) => {
    if (!canListInstitution) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getInstitutions({ provinceId, districtId, isActive });
      const list = Array.isArray(data) ? data : [];
      setRows(filterInstitutionsByScope(list));
    } catch (e: unknown) {
      console.error('Kurumlar alınırken hata:', e);
      setRows([]);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'Kurumlar alınırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasScopedRegionAccess || isAdmin || !user?.id) {
      setUserScopes([]);
      return;
    }

    const loadScopes = async () => {
      try {
        const scopes = await getUserScopes(user.id);
        setUserScopes(Array.isArray(scopes) ? scopes : []);
      } catch (e: unknown) {
        console.error('Kullanıcı scope bilgisi alınırken hata:', e);
        setUserScopes([]);
        toastRef.current.showError(getApiErrorMessage(e, 'Kullanıcı kapsam bilgileri alınamadı.'));
      }
    };

    loadScopes();
  }, [hasScopedRegionAccess, isAdmin, user?.id]);

  useEffect(() => {
    loadProvinces();
    loadInstitutions();
    loadProfessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactiveProfessions, shouldRestrictByScope, allowedProvinceIds, userScopes.length]);

  const handleOpenNew = () => {
    if (!hasPermission('INSTITUTION_CREATE')) {
      toast.showError('Kurum oluşturmak için yetkiniz yok.');
      return;
    }
    setForm({
      name: '',
      provinceId: '',
      districtId: '',
    });
    setDistricts([]);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'provinceId'
        ? {
            districtId: '',
          }
        : {}),
    }));
    if (field === 'provinceId') {
      loadDistrictsForProvince(value);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.showWarning('Kurum adı zorunludur.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        provinceId: form.provinceId || undefined,
        districtId: form.districtId || undefined,
      };

      if (!hasPermission('INSTITUTION_CREATE')) {
        toast.showError('Kurum oluşturmak için yetkiniz yok.');
        setSaving(false);
        return;
      }
      const newInstitution = await createInstitution(payload);
      
      // Eğer kullanıcının onaylama yetkisi varsa, kurumu otomatik olarak onayla
      if (canApproveInstitution && newInstitution.id) {
        try {
          await approveInstitution(newInstitution.id);
          toast.showSuccess('Kurum başarıyla oluşturuldu ve onaylandı.');
        } catch (approveError) {
          console.error('Kurum onaylanırken hata:', approveError);
          toast.showSuccess('Kurum başarıyla oluşturuldu, ancak onaylanırken bir hata oluştu.');
        }
      } else {
        toast.showSuccess('Kurum başarıyla oluşturuldu. Onay bekliyor.');
      }

      await loadInstitutions();
      setDialogOpen(false);
    } catch (e) {
      console.error('Kurum kaydedilirken hata:', e);
      toast.showError('Kurum kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!canApproveInstitution) {
      toast.showError('Kurum onaylamak için yetkiniz yok.');
      return;
    }
    try {
      await approveInstitution(id);
      toast.showSuccess('Kurum başarıyla onaylandı.');
      await loadInstitutions();
    } catch (e) {
      console.error('Kurum onaylanırken hata:', e);
      toast.showError('Kurum onaylanırken bir hata oluştu.');
    }
  };

  const handleDeleteClick = async (inst: Institution) => {
    if (!canDeleteInstitution) {
      toast.showError('Kurum kaldırmak için yetkiniz yok.');
      return;
    }
    setDeletingInstitution(inst);
    setDeleteActionType('REMOVE_INSTITUTION');
    setDeleteTargetInstitutionId('');
    // Mevcut kurumu listeden çıkararak hedef kurum listesini hazırla
    const allInstitutions = await getInstitutions();
    const filtered = filterInstitutionsByScope(allInstitutions).filter(i => i.id !== inst.id && i.isActive);
    setAvailableInstitutions(filtered);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingInstitution) return;

    // Transfer seçenekleri için hedef kurum kontrolü
    if (
      (deleteActionType === 'TRANSFER_TO_INSTITUTION' ||
        deleteActionType === 'TRANSFER_AND_DEACTIVATE' ||
        deleteActionType === 'TRANSFER_AND_CANCEL') &&
      !deleteTargetInstitutionId
    ) {
      toast.showError('Lütfen hedef kurum seçin');
      return;
    }

    setDeleting(true);
    try {
      const dto: DeleteInstitutionDto = {
        memberActionType: deleteActionType,
        ...(deleteTargetInstitutionId && { targetInstitutionId: deleteTargetInstitutionId }),
      };
      await deleteInstitution(deletingInstitution.id, dto);
      toast.showSuccess('Kurum başarıyla kaldırıldı.');
      setDeleteDialogOpen(false);
      setDeletingInstitution(null);
      await loadInstitutions();
    } catch (e: unknown) {
      console.error('Kurum kaldırılırken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kurum kaldırılırken bir hata oluştu.'));
    } finally {
      setDeleting(false);
    }
  };

  // Meslek/Unvanlar handler'ları
  const loadProfessions = async () => {
    if (!canViewProfession) {
      setProfessions([]);
      setLoadingProfessions(false);
      return;
    }
    setLoadingProfessions(true);
    try {
      const data = showInactiveProfessions ? await getAllProfessions() : await getProfessions();
      setProfessions(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error('Meslek/Unvanlar alınırken hata:', e);
      setProfessions([]);
      toast.showError(getApiErrorMessage(e, 'Meslek/Unvanlar yüklenirken bir hata oluştu.'));
    } finally {
      setLoadingProfessions(false);
    }
  };

  const handleOpenProfessionDialog = (profession?: Profession) => {
    if (profession && !canUpdateProfession) return;
    if (!profession && !canCreateProfession) return;
    if (profession) {
      setEditingProfession(profession);
      setProfessionForm({ name: profession.name, isActive: profession.isActive });
    } else {
      setEditingProfession(null);
      setProfessionForm({ name: '', isActive: true });
    }
    setProfessionDialogOpen(true);
  };

  const handleCloseProfessionDialog = () => {
    setProfessionDialogOpen(false);
    setEditingProfession(null);
    setProfessionForm({ name: '', isActive: true });
  };

  const handleSaveProfession = async () => {
    if (!professionForm.name.trim()) {
      toast.showError('Meslek/Unvan adı gereklidir');
      return;
    }

    setSavingProfession(true);
    try {
      const payload = {
        name: professionForm.name.trim(),
        ...(editingProfession ? { isActive: professionForm.isActive } : {}),
      };

      if (editingProfession) {
        if (!canUpdateProfession) {
          toast.showError('Meslek/Unvan güncelleme yetkiniz yok');
          return;
        }
        await updateProfession(editingProfession.id, payload);
        toast.showSuccess('Meslek/Unvan başarıyla güncellendi');
      } else {
        if (!canCreateProfession) {
          toast.showError('Meslek/Unvan oluşturma yetkiniz yok');
          return;
        }
        await createProfession({ name: payload.name });
        toast.showSuccess('Meslek/Unvan başarıyla oluşturuldu');
      }
      handleCloseProfessionDialog();
      loadProfessions();
    } catch (e: unknown) {
      console.error('Meslek/Unvan kaydedilirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Meslek/Unvan kaydedilirken bir hata oluştu'));
    } finally {
      setSavingProfession(false);
    }
  };

  const handleDeleteProfession = async () => {
    if (!canDeleteProfession) {
      toast.showError('Meslek/Unvan silme yetkiniz yok');
      return;
    }
    if (!deletingProfession) return;

    setDeleting(true);
    try {
      await deleteProfession(deletingProfession.id);
      toast.showSuccess('Meslek/Unvan silindi');
      setDeleteProfessionDialogOpen(false);
      setDeletingProfession(null);
      loadProfessions();
    } catch (e: unknown) {
      console.error('Meslek/Unvan silinirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Meslek/Unvan silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const handleActivateProfession = async (profession: Profession) => {
    if (!canUpdateProfession) {
      toast.showError('Meslek/Unvan güncelleme yetkiniz yok');
      return;
    }
    setDeleting(true);
    try {
      await updateProfession(profession.id, { isActive: true });
      toast.showSuccess('Meslek/Unvan aktifleştirildi');
      loadProfessions();
    } catch (e: unknown) {
      console.error('Meslek/Unvan aktifleştirilirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Meslek/Unvan aktifleştirilirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<Institution>[] = [
    {
      field: 'name',
      headerName: 'Kurum Adı',
      flex: 1.4,
      minWidth: 180,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
          <BusinessIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
          <Typography sx={{ fontWeight: 500 }}>{params.row.name}</Typography>
        </Box>
      ),
    },
    {
      field: 'memberCount',
      headerName: 'Üye Sayısı',
      flex: 0.7,
      minWidth: 100,
      align: 'left',
      headerAlign: 'left',
      valueGetter: (_value: unknown, row: Institution) => row?.memberCount ?? 0,
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      flex: 1,
      minWidth: 150,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
          {!params.row.isActive && canApproveInstitution && (
            <IconButton
              size="small"
              color="success"
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(params.row.id);
              }}
            >
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          )}
          {canViewInstitution && (
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/institutions/${params.row.id}`);
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}
          {canDeleteInstitution && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(params.row);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const filteredRows = rows.filter((row) =>
    row.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (!canListInstitution) {
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
            <Typography>Kurum listesini görüntülemek için gerekli izne sahip değilsiniz.</Typography>
          </Alert>
        </Box>
      </Card>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<BusinessIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Kurumlar"
        description="Kurumları görüntüleyin ve yönetin"
        color={theme.palette.success.main}
        darkColor={theme.palette.success.dark}
        lightColor={theme.palette.success.light}
        rightContent={
          hasPermission('INSTITUTION_CREATE') && activeTab === 0 ? (
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
                color: theme.palette.success.main,
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.9),
                  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                },
              }}
            >
              Yeni Kurum
            </Button>
          ) : canCreateProfession && activeTab === 1 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenProfessionDialog()}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                backgroundColor: 'white',
                    color: theme.palette.success.main,
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
      {/* Tabs */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          mb: 3,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.02)} 0%, ${alpha(theme.palette.success.light, 0.01)} 100%)`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 64,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.success.main, 0.05),
              },
              '&.Mui-selected': {
                color: theme.palette.success.main,
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab 
            icon={<BusinessIcon />} 
            iconPosition="start"
            label="Kurumlar" 
          />
          <Tab 
            icon={<WorkIcon />} 
            iconPosition="start"
            label="Meslek/Unvanlar" 
          />
        </Tabs>
      </Card>
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
        {activeTab === 0 ? (
          <>
            {/* İçerik Bölümü */}
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {/* Filtrele ve Ara */}
              <Box
                sx={{
                  mb: 3,
                  p: { xs: 2.5, sm: 3 },
                  background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.02)} 0%, ${alpha(theme.palette.success.light, 0.01)} 100%)`,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
                    }}
                  >
                    <SearchIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Filtrele ve Ara
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      Kurumları hızlıca bulun ve filtreleyin
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                  <TextField
                    placeholder="Ara (kurum adı)..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    size="medium"
                    sx={{
                      flexGrow: 1,
                      minWidth: { xs: '100%', sm: 300 },
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                        borderRadius: 2.5,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.12)}`,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: theme.palette.success.main,
                            borderWidth: '2px',
                          },
                        },
                        '&.Mui-focused': {
                          boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.2)}`,
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.4rem' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>

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
                    <BusinessIcon fontSize="small" />
                        {filteredRows.length} kurum listeleniyor
                        {filteredRows.length !== rows.length && ` (Toplam ${rows.length} kurumdan)`}
                  </Typography>
                </Paper>
              )}

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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
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
                    cursor: canManageInstitution ? 'pointer' : 'default',
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
                  rows={filteredRows}
                  columns={columns}
                  getRowId={(row) => row.id}
                  loading={loading}
                  onRowDoubleClick={(params) => {
                    if (canViewInstitution) {
                      navigate(`/institutions/${params.id}`);
                    }
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
          </>
        ) : activeTab === 1 ? (
          /* Meslek/Unvanlar Tab */
          (<Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {/* Filtre: Pasif olanları göster */}
            {canManageInstitution && (
              <Box
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={showInactiveProfessions}
                      onChange={(e) => setShowInactiveProfessions(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Pasif olanları göster"
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            )}
            {loadingProfessions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                }}
              >
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow 
                        sx={{ 
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                        }}
                      >
                        <TableCell align="left" sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>Meslek/Unvan Adı</TableCell>
                        <TableCell align="left" sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>Durum</TableCell>
                        {canShowProfessionActions && (
                          <TableCell align="left" sx={{ fontWeight: 700, fontSize: '0.9rem', py: 2 }}>İşlemler</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {professions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canShowProfessionActions ? 3 : 2} align="center" sx={{ py: 6 }}>
                            <WorkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
                            <Typography variant="body2" color="text.secondary">
                              Henüz meslek/unvan eklenmemiş
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        professions.map((profession, index) => (
                          <TableRow 
                            key={profession.id}
                            sx={{
                              transition: 'all 0.2s ease',
                              backgroundColor: index % 2 === 0 ? 'transparent' : alpha(theme.palette.grey[50], 0.3),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                                boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
                              },
                            }}
                          >
                            <TableCell align="left">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
                                <WorkIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>{profession.name}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="left">
                              <Chip
                                label={profession.isActive ? 'Aktif' : 'Pasif'}
                                color={profession.isActive ? 'success' : 'default'}
                                size="small"
                                icon={profession.isActive ? <CheckCircleIcon /> : <CancelIcon />}
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            {canShowProfessionActions && (
                              <TableCell align="left">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1 }}>
                                  {canUpdateProfession && (
                                    <Tooltip title="Düzenle" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleOpenProfessionDialog(profession)}
                                        sx={{ 
                                          color: theme.palette.primary.main,
                                          '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                          },
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {profession.isActive ? (
                                    <>
                                      {canDeleteProfession && (
                                        <Tooltip title="Sil" arrow>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              setDeletingProfession(profession);
                                              setDeleteProfessionDialogOpen(true);
                                            }}
                                            sx={{ 
                                              color: theme.palette.error.main,
                                              '&:hover': {
                                                backgroundColor: alpha(theme.palette.error.main, 0.1),
                                              },
                                            }}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </>
                                  ) : (
                                    canUpdateProfession && (
                                      <Tooltip title="Aktifleştir" arrow>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleActivateProfession(profession)}
                                          disabled={deleting}
                                          sx={{ 
                                            color: theme.palette.success.main,
                                            '&:hover': {
                                              backgroundColor: alpha(theme.palette.success.main, 0.1),
                                            },
                                          }}
                                        >
                                          <RestoreIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )
                                  )}
                                </Box>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>)
        ) : null}
      </Card>
      {/* Kurum Kaldır Dialog */}
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
            Kurumu Sil
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                "{deletingInstitution?.name}" adlı kurumu silmek istediğinize emin misiniz?
              </Typography>
              <Typography variant="body2">
                Bu kuruma bağlı {deletingInstitution?.memberCount || 0} üye bulunmaktadır. 
                Kurumu silmeden önce üyelere ne yapılacağını seçmeniz gerekmektedir.
              </Typography>
            </Alert>

            <Box>
              <FormLabel sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.95rem', display: 'block' }}>
                Üyelere Ne Yapılacak?
              </FormLabel>
              <RadioGroup
                value={deleteActionType}
                onChange={(e) => {
                  setDeleteActionType(e.target.value as DeleteInstitutionDto['memberActionType']);
                  setDeleteTargetInstitutionId('');
                }}
                sx={{ gap: 1 }}
              >
                <FormControlLabel
                  value="REMOVE_INSTITUTION"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Kurum Bilgisini Kaldır
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler kurumsuz kalacak, durumları değişmeyecek
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
                  value="TRANSFER_TO_INSTITUTION"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Başka Bir Kuruma Taşı
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler seçilen kuruma taşınacak, durumları değişmeyecek
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
                  value="REMOVE_AND_DEACTIVATE"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Kurum Bilgisini Kaldır ve Pasif Et
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler kurumsuz kalacak ve pasif duruma getirilecek
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
                  value="TRANSFER_AND_DEACTIVATE"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Başka Bir Kuruma Taşı ve Pasif Et
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler seçilen kuruma taşınacak ve pasif duruma getirilecek
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
                        Başka Bir Kuruma Taşı ve İptal Et
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Üyeler seçilen kuruma taşınacak ve üyelikleri iptal edilecek (İstifa)
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

            {(deleteActionType === 'TRANSFER_TO_INSTITUTION' ||
              deleteActionType === 'TRANSFER_AND_DEACTIVATE' ||
              deleteActionType === 'TRANSFER_AND_CANCEL') && (
              <>
                <Divider />
                <FormControl fullWidth required>
                  <InputLabel>Hedef Kurum</InputLabel>
                  <Select
                    value={deleteTargetInstitutionId}
                    onChange={(e) => setDeleteTargetInstitutionId(e.target.value as string)}
                    label="Hedef Kurum"
                    disabled={deleting}
                    sx={{
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(theme.palette.divider, 0.2),
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Hedef kurum seçin</em>
                    </MenuItem>
                    {availableInstitutions.map((inst) => (
                      <MenuItem key={inst.id} value={inst.id}>
                        {inst.name}
                        {inst.memberCount !== undefined && ` (${inst.memberCount} üye)`}
                      </MenuItem>
                    ))}
                  </Select>
                  <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
                    Üyeler bu kuruma taşınacaktır
                  </Alert>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1.5 }}>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeletingInstitution(null);
              setDeleteActionType('REMOVE_INSTITUTION');
              setDeleteTargetInstitutionId('');
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
            disabled={deleting || ((deleteActionType === 'TRANSFER_TO_INSTITUTION' ||
              deleteActionType === 'TRANSFER_AND_DEACTIVATE' ||
              deleteActionType === 'TRANSFER_AND_CANCEL') && !deleteTargetInstitutionId)}
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
            {deleting ? 'Siliniyor...' : 'Kurumu Sil'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Kurum Ekle Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '1.25rem',
            pb: 1,
          }}
        >
          Yeni Kurum
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            mt: 1,
          }}
        >
          <FormControl
            fullWidth
            size="small"
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          >
            <InputLabel>İl *</InputLabel>
            <Select
              label="İl *"
              value={form.provinceId}
              onChange={(e) => handleFormChange('provinceId', e.target.value as string)}
            >
              <MenuItem value="">
                <em>Seçiniz</em>
              </MenuItem>
              {provinces.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} {p.code ? `(${p.code})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            fullWidth
            size="small"
            disabled={!form.provinceId}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          >
            <InputLabel>İlçe</InputLabel>
            <Select
              label="İlçe"
              value={form.districtId}
              onChange={(e) => handleFormChange('districtId', e.target.value as string)}
            >
              <MenuItem value="">
                <em>Seçilmedi</em>
              </MenuItem>
              {districts.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Kurum Adı"
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
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
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
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Meslek/Unvanlar Dialog'ları */}
      {/* Meslek/Unvan Ekle/Düzenle Dialog */}
      <Dialog 
        open={professionDialogOpen} 
        onClose={handleCloseProfessionDialog} 
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
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <WorkIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {editingProfession ? 'Meslek/Unvan Düzenle' : 'Yeni Meslek/Unvan Ekle'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Meslek/Unvan Adı"
            value={professionForm.name}
            onChange={(e) => setProfessionForm({ ...professionForm, name: e.target.value })}
            fullWidth
            required
            autoFocus
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          {editingProfession && (
            <FormControlLabel
              control={
                <Switch
                  checked={professionForm.isActive}
                  onChange={(e) => setProfessionForm({ ...professionForm, isActive: e.target.checked })}
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
            onClick={handleCloseProfessionDialog} 
            disabled={savingProfession}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleSaveProfession}
            variant="contained"
            disabled={savingProfession}
            startIcon={savingProfession ? <CircularProgress size={16} /> : <AddIcon />}
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
            {savingProfession ? 'Kaydediliyor...' : editingProfession ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Meslek/Unvan Sil Dialog */}
      <Dialog 
        open={deleteProfessionDialogOpen} 
        onClose={() => setDeleteProfessionDialogOpen(false)}
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
          background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
          color: 'white',
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <DeleteIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Meslek/Unvanı Sil</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ mb: 1 }}>
            "{deletingProfession?.name}" adlı meslek/unvanı kalıcı olarak silmek istediğinize emin misiniz?
          </Typography>
          <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Bu işlem geri alınamaz. Meslek/Unvan veritabanından tamamen silinecektir.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, background: alpha(theme.palette.error.main, 0.04) }}>
          <Button 
            onClick={() => setDeleteProfessionDialogOpen(false)} 
            disabled={deleting}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleDeleteProfession}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 160,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
              }
            }}
          >
            {deleting ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default InstitutionsPage;


