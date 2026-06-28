// src/pages/regions/InstitutionDetailPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleIcon from '@mui/icons-material/People';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import {
  getInstitutionById, 
  updateInstitution,
  deleteInstitution,
  getInstitutions,
  type Institution,
  type DeleteInstitutionDto
} from '../services/regionsApi';
import { getProvinces, getDistricts, type Province, type District } from '../services/regionsApi';
import { getMembers } from '../../members/services/membersApi';
import type { MemberListItem, MemberStatus } from '../../../types/member';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const InstitutionDetailPage: React.FC = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Statistics calculations (Beklemedeki = PENDING + APPROVED)
  const statistics = useMemo(() => {
    const activeCount = members.filter(m => m.status === 'ACTIVE').length;
    const resignedCount = members.filter(m => m.status === 'RESIGNED').length;
    const pendingCount = members.filter(m => m.status === 'PENDING' || m.status === 'APPROVED').length;
    const inactiveCount = members.filter(m => m.status === 'INACTIVE').length;
    const expelledCount = members.filter(m => m.status === 'EXPELLED').length;

    return {
      activeCount,
      resignedCount,
      pendingCount,
      inactiveCount,
      expelledCount,
      totalCount: members.length,
    };
  }, [members]);

  // Chart data - showing last 6 months trend (mock data for now, can be connected to API later)
  const chartData = useMemo(() => {
    // Generate mock data for the last 6 months
    const months = ['Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return months.map((month, index) => ({
      month,
      aktif: Math.max(0, statistics.activeCount - (5 - index) * 2),
      istifa: Math.min(statistics.resignedCount, index + 1),
      beklemede: Math.max(0, statistics.pendingCount - Math.floor((5 - index) / 2)),
    }));
  }, [statistics]);

  // Form state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState<DeleteInstitutionDto['memberActionType']>('REMOVE_INSTITUTION');
  const [deleteTargetInstitutionId, setDeleteTargetInstitutionId] = useState<string>('');
  const [availableInstitutions, setAvailableInstitutions] = useState<Institution[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [form, setForm] = useState<{
    name: string;
    provinceId: string;
    districtId: string;
  }>({
    name: '',
    provinceId: '',
    districtId: '',
  });

  const canView = hasPermission('INSTITUTION_LIST');
  const canUpdate = hasPermission('INSTITUTION_UPDATE');
  const canDelete = hasPermission('INSTITUTION_UPDATE');

  useEffect(() => {
    if (id && canView) {
      loadInstitution();
      loadMembers();
      loadProvinces();
      loadAvailableInstitutions();
    }
  }, [id, canView]);

  const loadAvailableInstitutions = async () => {
    try {
      const data = await getInstitutions();
      // Mevcut kurumu listeden çıkar
      const filtered = data.filter(inst => inst.id !== id && inst.isActive);
      setAvailableInstitutions(filtered);
    } catch (e: unknown) {
      console.error('Kurumlar yüklenirken hata:', e);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'Kurumlar alınırken bir hata oluştu.');
    }
  };

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

  const loadInstitution = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getInstitutionById(id);
      setInstitution(data);
      setForm({
        name: data.name,
        provinceId: data.provinceId ?? data.province?.id ?? '',
        districtId: data.districtId ?? data.district?.id ?? '',
      });
    } catch (e: unknown) {
      console.error('Kurum detayı alınırken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kurum detayı alınamadı'));
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!id) return;
    setLoadingMembers(true);
    try {
      const statuses: MemberStatus[] = ['ACTIVE', 'APPROVED', 'PENDING', 'INACTIVE', 'RESIGNED', 'EXPELLED', 'REJECTED'];
      const results = await Promise.all(statuses.map((status) => getMembers(status)));
      const allFetched = results.flat();
      const institutionMembers = allFetched
        .filter((member) => member.institution?.id === id)
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      setMembers(institutionMembers);
    } catch (e: unknown) {
      console.error('Üyeler yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Üyeler yüklenirken bir hata oluştu.'));
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenEdit = async () => {
    if (!institution) return;
    const provinceId = institution.provinceId ?? institution.province?.id ?? '';
    setForm({
      name: institution.name,
      provinceId,
      districtId: institution.districtId ?? institution.district?.id ?? '',
    });
    await loadDistrictsForProvince(provinceId);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    if (saving) return;
    setEditDialogOpen(false);
  };

  const handleFormChange = (field: keyof typeof form, value: string) => {
    if (field === 'provinceId') {
      loadDistrictsForProvince(value);
      setForm((prev) => ({
        ...prev,
        provinceId: value,
        districtId: '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSave = async () => {
    if (!id || !form.name.trim()) {
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

      await updateInstitution(id, payload);
      toast.showSuccess('Kurum başarıyla güncellendi.');

      await loadInstitution();
      setEditDialogOpen(false);
    } catch (e) {
      console.error('Kurum güncellenirken hata:', e);
      toast.showError('Kurum güncellenirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    if (!canDelete) {
      toast.showError('Kurum kaldırmak için yetkiniz yok.');
      return;
    }
    setDeleteActionType('REMOVE_INSTITUTION');
    setDeleteTargetInstitutionId('');
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!id) return;

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
      await deleteInstitution(id, dto);
      toast.showSuccess('Kurum başarıyla kaldırıldı.');
      setDeleteDialogOpen(false);
      navigate('/institutions');
    } catch (e: unknown) {
      console.error('Kurum kaldırılırken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kurum kaldırılırken bir hata oluştu.'));
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getStatusLabel = (status: MemberStatus): string => {
    const map: Record<MemberStatus, string> = {
      PENDING: 'Onay Bekliyor',
      APPROVED: 'Beklemede',
      ACTIVE: 'Aktif',
      INACTIVE: 'Pasif',
      RESIGNED: 'İstifa',
      EXPELLED: 'İhraç',
      REJECTED: 'Reddedilmiş',
    };
    return map[status] ?? status;
  };

  const getStatusColor = (status: MemberStatus): 'success' | 'warning' | 'error' | 'default' | 'info' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PENDING': case 'APPROVED': return 'warning';
      case 'RESIGNED': case 'INACTIVE': return 'default';
      case 'EXPELLED': case 'REJECTED': return 'error';
      default: return 'info';
    }
  };

  if (!canView) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">Bu sayfaya erişim yetkiniz bulunmamaktadır.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!institution) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Kurum bulunamadı</Alert>
      </Box>
    );
  }

  return (
    <PageLayout>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/institutions')}
          sx={{ 
            mb: 3,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 2,
          }}
        >
          Kurum Listesine Dön
        </Button>

        <PageHeader
          icon={<BusinessIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title={institution.name}
          description="Kurum Detay Bilgileri ve İstatistikler"
          color={theme.palette.success.main}
          darkColor={theme.palette.success.dark}
          lightColor={theme.palette.success.light}
          rightContent={
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={institution.isActive ? 'Aktif' : 'Pasif'}
                color={institution.isActive ? 'success' : 'default'}
                sx={{
                  height: 36,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  backgroundColor: 'white',
                  color: institution.isActive ? theme.palette.success.main : theme.palette.text.secondary,
                }}
              />
              {canUpdate && (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleOpenEdit}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: 'white',
                    color: theme.palette.success.main,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.9),
                      boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    },
                  }}
                >
                  Düzenle
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteClick}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: 'white',
                    borderColor: 'white',
                    color: theme.palette.error.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                      borderColor: 'white',
                    },
                  }}
                >
                  Kaldır
                </Button>
              )}
            </Box>
          }
        />
        </Box>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Genel Bilgiler */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              p: { xs: 2, md: 3 },
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.success.main, 0.15)}`,
                transform: 'translateY(-4px)',
                borderColor: 'success.main',
              }
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon sx={{ color: theme.palette.success.main }} />
              Genel Bilgiler
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {institution.province && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <LocationOnIcon sx={{ color: theme.palette.primary.main, mt: 0.5, fontSize: '1.25rem' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Konum
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {institution.province.name}
                      {institution.district && ` / ${institution.district.name}`}
                    </Typography>
                  </Box>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CalendarTodayIcon sx={{ color: theme.palette.primary.main, fontSize: '1.25rem' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Oluşturulma Tarihi
                  </Typography>
                  <Typography variant="body1">{formatDate(institution.createdAt)}</Typography>
                </Box>
              </Box>
              {institution.approvedAt && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CalendarTodayIcon sx={{ color: theme.palette.success.main, fontSize: '1.25rem' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Onaylanma Tarihi
                    </Typography>
                    <Typography variant="body1">{formatDate(institution.approvedAt)}</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* İstatistikler */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              p: { xs: 2, md: 3 },
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.info.main, 0.15)}`,
                transform: 'translateY(-4px)',
                borderColor: 'info.main',
              }
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon sx={{ color: theme.palette.info.main }} />
              İstatistikler
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.2)} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PeopleIcon sx={{ color: theme.palette.primary.main }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Üye Sayısı
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {members.length}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.2)} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PeopleIcon sx={{ color: theme.palette.success.main }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aktif Üye Sayısı
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    {members.filter(m => m.status === 'ACTIVE').length}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Kuruma Özel Genel İstatistikler */}
        <Grid size={{ xs: 12 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              p: { xs: 2, md: 3 },
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.15)}`,
                transform: 'translateY(-4px)',
                borderColor: 'primary.main',
              }
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon sx={{ color: theme.palette.primary.main }} />
              Kuruma Özel Genel İstatistikler
            </Typography>

            {/* İstatistik Kartları */}
            <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.12)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 20px ${alpha(theme.palette.success.main, 0.25)}`,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.4)}`,
                      }}
                    >
                      <PersonAddIcon />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Aktif Üye
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.success.main }}>
                        {statistics.activeCount}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.08)} 0%, ${alpha(theme.palette.error.main, 0.12)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 20px ${alpha(theme.palette.error.main, 0.25)}`,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.4)}`,
                      }}
                    >
                      <PersonRemoveIcon />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        İstifa Üye
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.error.main }}>
                        {statistics.resignedCount}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${alpha(theme.palette.warning.main, 0.12)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 20px ${alpha(theme.palette.warning.main, 0.25)}`,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.4)}`,
                      }}
                    >
                      <HourglassEmptyIcon />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Beklemedeki Üye
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.warning.main }}>
                        {statistics.pendingCount}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.12)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 20px ${alpha(theme.palette.info.main, 0.25)}`,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.4)}`,
                      }}
                    >
                      <PeopleIcon />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Toplam
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.info.main }}>
                        {statistics.totalCount}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Çizgi Grafiği */}
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 2.5,
                background: alpha(theme.palette.background.paper, 0.5),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon sx={{ color: theme.palette.primary.main }} />
                Üyelik Durumu Trend Grafiği
              </Typography>
              <Box sx={{ height: { xs: 280, md: 360 }, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        borderRadius: 8,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: '20px',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="aktif"
                      name="Aktif Üye"
                      stroke={theme.palette.success.main}
                      strokeWidth={3}
                      dot={{ r: 5, fill: theme.palette.success.main }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="istifa"
                      name="İstifa Üye"
                      stroke={theme.palette.error.main}
                      strokeWidth={3}
                      dot={{ r: 5, fill: theme.palette.error.main }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="beklemede"
                      name="Beklemedeki Üye"
                      stroke={theme.palette.warning.main}
                      strokeWidth={3}
                      dot={{ r: 5, fill: theme.palette.warning.main }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Üyeler */}
        <Grid size={{ xs: 12 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              p: { xs: 2, md: 3 },
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.15)}`,
                transform: 'translateY(-4px)',
                borderColor: 'primary.main',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  <PeopleIcon />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Kuruma Ait Üyeler
                </Typography>
              </Box>
              {members.length > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => navigate(`/members?institutionId=${id}`)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                    }
                  }}
                >
                  Tümünü Gör
                </Button>
              )}
            </Box>
            {loadingMembers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : members.length === 0 ? (
              <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
                <Typography variant="body2" color="text.secondary">
                  Bu kuruma kayıtlı üye bulunmamaktadır
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Kayıt No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ad Soyad</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Şube</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow 
                        key={member.id} 
                        hover
                        sx={{
                          transition: 'all 0.2s',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.06),
                          }
                        }}
                      >
                        <TableCell>{member.registrationNumber || '-'}</TableCell>
                        <TableCell>
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell>{member.branch?.name || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(member.status)}
                            color={getStatusColor(member.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/members/${member.id}`)}
                            sx={{ color: theme.palette.primary.main }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Kurum Düzenle Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.2)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
            color: 'white',
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <BusinessIcon />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Kurum Düzenle
          </Typography>
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            pt: 3,
          }}
        >
          <TextField
            label="Kurum Adı"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            required
            helperText="Kurum adını güncelleyin"
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>İl</InputLabel>
            <Select
              label="İl"
              value={form.provinceId}
              onChange={(e) => handleFormChange('provinceId', e.target.value)}
              sx={{ '& .MuiOutlinedInput-notchedOutline': { borderRadius: 2 } }}
            >
              <MenuItem value="">
                <em>Seçiniz</em>
              </MenuItem>
              {provinces.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>İlçe</InputLabel>
            <Select
              label="İlçe"
              value={form.districtId}
              onChange={(e) => handleFormChange('districtId', e.target.value)}
              disabled={!form.provinceId}
              sx={{ '& .MuiOutlinedInput-notchedOutline': { borderRadius: 2 } }}
            >
              <MenuItem value="">
                <em>Seçiniz</em>
              </MenuItem>
              {districts.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, background: alpha(theme.palette.success.main, 0.04) }}>
          <Button
            onClick={handleCloseEditDialog}
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
            color="success"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 100,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
              }
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

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
                "{institution?.name}" adlı kurumu silmek istediğinize emin misiniz?
              </Typography>
              <Typography variant="body2">
                Bu kuruma bağlı {members.length} üye bulunmaktadır. 
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
    </PageLayout>
  );
};

export default InstitutionDetailPage;


