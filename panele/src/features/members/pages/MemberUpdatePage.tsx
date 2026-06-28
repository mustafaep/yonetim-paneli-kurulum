// src/pages/members/MemberUpdatePage.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Autocomplete,
  useTheme,
  alpha,
  InputAdornment,
  Paper,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useParams, useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import PlaceIcon from '@mui/icons-material/Place';
import SaveIcon from '@mui/icons-material/Save';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WorkIcon from '@mui/icons-material/Work';

import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { getMemberById, updateMember } from '../services/membersApi';
import type { MemberDetail } from '../../../types/member';
import type {
  Province,
  District,
} from '../../../types/region';
import {
  getProvinces,
  getDistricts,
} from '../../regions/services/regionsApi';
import { getInstitutions } from '../../regions/services/institutionsApi';
import type { Institution } from '../../regions/services/institutionsApi';
import { getBranches } from '../../regions/services/branchesApi';
import type { Branch } from '../../regions/services/branchesApi';
import { getProfessions } from '../../professions/services/professionsApi';
import type { Profession } from '../../professions/services/professionsApi';
import { getTevkifatCenters, getTevkifatTitles } from '../../accounting/services/accountingApi';
import type { TevkifatCenter, TevkifatTitle } from '../../accounting/services/accountingApi';
import { getMemberGroups } from '../../system/services/memberGroupsApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const MemberUpdatePage: React.FC = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const canUpdateMember = hasPermission('MEMBER_UPDATE');

  const [loadingMember, setLoadingMember] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<MemberDetail | null>(null);

  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    memberGroupId: string;
    registrationNumber: string;
    boardDecisionDate: string;
    boardDecisionBookNo: string;
    motherName: string;
    fatherName: string;
    birthDate: string;
    birthplace: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | '';
    educationStatus: 'PRIMARY' | 'HIGH_SCHOOL' | 'COLLEGE' | '';
    provinceId: string;
    districtId: string;
    institutionId: string;
    branchId: string;
    tevkifatCenterId: string;
    tevkifatTitleId: string;
    // Kurum Detay Bilgileri
    dutyUnit: string;
    institutionAddress: string;
    institutionProvinceId: string;
    institutionDistrictId: string;
    professionId: string;
    institutionRegNo: string;
    staffTitleCode: string;
  }>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    memberGroupId: '',
    registrationNumber: '',
    boardDecisionDate: '',
    boardDecisionBookNo: '',
    motherName: '',
    fatherName: '',
    birthDate: '',
    birthplace: '',
    gender: '',
    educationStatus: '',
    provinceId: '',
    districtId: '',
    institutionId: '',
    branchId: '',
    tevkifatCenterId: '',
    tevkifatTitleId: '',
    dutyUnit: '',
    institutionAddress: '',
    institutionProvinceId: '',
    institutionDistrictId: '',
    professionId: '',
    institutionRegNo: '',
    staffTitleCode: '',
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [institutionProvinces, setInstitutionProvinces] = useState<Province[]>([]);
  const [institutionDistricts, setInstitutionDistricts] = useState<District[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [tevkifatCenters, setTevkifatCenters] = useState<TevkifatCenter[]>([]);
  const [tevkifatTitles, setTevkifatTitles] = useState<TevkifatTitle[]>([]);
  const [memberGroups, setMemberGroups] = useState<Array<{ id: string; name: string }>>([]);

  const genderOptions: Array<{
    value: 'MALE' | 'FEMALE' | 'OTHER';
    label: string;
  }> = [
    { value: 'MALE', label: 'Erkek' },
    { value: 'FEMALE', label: 'Kadın' },
    { value: 'OTHER', label: 'Diğer' },
  ];

  const educationOptions: Array<{
    value: 'PRIMARY' | 'HIGH_SCHOOL' | 'COLLEGE';
    label: string;
  }> = [
    { value: 'PRIMARY', label: 'İlkokul' },
    { value: 'HIGH_SCHOOL', label: 'Lise' },
    { value: 'COLLEGE', label: 'Yüksekokul/Üniversite' },
  ];

  // Dropdown'da: sadece aktif merkezler + üyenin mevcut merkezi (kaldırılmışsa " (Kaldırılmış)" ile)
  const tevkifatCentersForSelect = useMemo(() => {
    const list = [...tevkifatCenters];
    const current = (member as any)?.tevkifatCenter;
    if (current?.id && !list.some((c) => c.id === current.id)) {
      list.push({
        ...current,
        id: current.id,
        name: `${current.name} (Kaldırılmış)`,
        isActive: false,
      } as TevkifatCenter);
    }
    return list;
  }, [tevkifatCenters, member]);

  // Member verisini yükle
  useEffect(() => {
    if (!id) return;

    const loadMember = async () => {
      setLoadingMember(true);
      try {
        const data = await getMemberById(id);
        setMember(data);
        
        // Form'u mevcut verilerle doldur
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          email: data.email || '',
          memberGroupId: data.memberGroup?.id || '',
          registrationNumber: data.registrationNumber || '',
          boardDecisionDate: data.boardDecisionDate 
            ? new Date(data.boardDecisionDate).toISOString().split('T')[0]
            : '',
          boardDecisionBookNo: data.boardDecisionBookNo || '',
          motherName: data.motherName || '',
          fatherName: data.fatherName || '',
          birthDate: data.birthDate 
            ? new Date(data.birthDate).toISOString().split('T')[0]
            : '',
          birthplace: data.birthplace || '',
          gender: (data.gender as any) || '',
          educationStatus: (data.educationStatus as any) || '',
          provinceId: data.province?.id || '',
          districtId: data.district?.id || '',
          institutionId: data.institution?.id || '',
          branchId: data.branch?.id || '',
          tevkifatCenterId: (data as any).tevkifatCenter?.id || '',
          tevkifatTitleId: (data as any).tevkifatTitle?.id || '',
          dutyUnit: (data as any).dutyUnit || '',
          institutionAddress: (data as any).institutionAddress || '',
          institutionProvinceId: (data as any).institutionProvince?.id || '',
          institutionDistrictId: (data as any).institutionDistrict?.id || '',
          professionId: (data as any).profession?.id || '',
          institutionRegNo: (data as any).institutionRegNo || '',
          staffTitleCode: (data as any).staffTitleCode || '',
        });

        // İl seçildiyse ilçeleri yükle
        if (data.province?.id) {
          const dists = await getDistricts(data.province.id);
          setDistricts(dists);
        }

        // Kurum ili seçildiyse ilçeleri yükle
        if ((data as any).institutionProvince?.id) {
          const dists = await getDistricts((data as any).institutionProvince.id);
          setInstitutionDistricts(dists);
        }
      } catch (error: unknown) {
        console.error('Üye detayı alınırken hata:', error);
        setError(getApiErrorMessage(error, 'Üye bilgileri yüklenirken bir hata oluştu'));
      } finally {
        setLoadingMember(false);
      }
    };

    loadMember();
  }, [id]);

  // İlleri yükle (Kayıtlı Olduğu Yer)
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const data = await getProvinces();
        setProvinces(data);
      } catch (e) {
        console.error('İller alınırken hata:', e);
      }
    };
    loadProvinces();
  }, []);

  // İl değiştiğinde ilçeleri yükle (Kayıtlı Olduğu Yer)
  useEffect(() => {
    const loadForProvince = async () => {
      const provinceId = form.provinceId;
      if (!provinceId) {
        setDistricts([]);
        return;
      }

      try {
        const dists = await getDistricts(provinceId);
        setDistricts(dists);
      } catch (e) {
        console.error('İl değişince ilçe verisi alınırken hata:', e);
      }
    };

    loadForProvince();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.provinceId]);

  // Kurumları yükle
  const loadInstitutions = useCallback(async () => {
    try {
      const data = await getInstitutions();
      setInstitutions(data);
    } catch (e) {
      console.error('Kurumlar alınırken hata:', e);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  // Şubeleri yükle
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await getBranches({ isActive: true });
        setBranches(data);
      } catch (e) {
        console.error('Şubeler alınırken hata:', e);
      }
    };
    loadBranches();
  }, []);

  // Meslek/Unvanları yükle
  useEffect(() => {
    const loadProfessions = async () => {
      try {
        const data = await getProfessions();
        setProfessions(data);
      } catch (e) {
        console.error('Meslek/Unvanlar yüklenirken hata:', e);
      }
    };
    loadProfessions();
  }, []);

  // Tevkifat merkezlerini yükle (sadece aktif olanlar; kaldırılmış merkezler listede görünmez)
  useEffect(() => {
    const loadTevkifatCenters = async () => {
      try {
        const data = await getTevkifatCenters({ activeOnly: true });
        setTevkifatCenters(data);
      } catch (e) {
        console.error('Tevkifat merkezleri yüklenirken hata:', e);
      }
    };
    loadTevkifatCenters();
  }, []);

  // Tevkifat ünvanlarını yükle
  useEffect(() => {
    const loadTevkifatTitles = async () => {
      try {
        const data = await getTevkifatTitles();
        setTevkifatTitles(data);
      } catch (e) {
        console.error('Tevkifat ünvanları yüklenirken hata:', e);
      }
    };
    loadTevkifatTitles();
  }, []);

  // Üye gruplarını yükle
  useEffect(() => {
    const loadMemberGroups = async () => {
      try {
        const data = await getMemberGroups();
        setMemberGroups(data || []);
      } catch (e) {
        console.error('Üye grupları yüklenirken hata:', e);
      }
    };
    loadMemberGroups();
  }, []);

  // Kurum İli için illeri yükle
  useEffect(() => {
    const loadInstitutionProvinces = async () => {
      try {
        const data = await getProvinces();
        setInstitutionProvinces(data);
      } catch (e) {
        console.error('Kurum illeri yüklenirken hata:', e);
      }
    };
    loadInstitutionProvinces();
  }, []);

  // Kurum İli değiştiğinde ilçeleri yükle
  useEffect(() => {
    const loadForInstitutionProvince = async () => {
      const provinceId = form.institutionProvinceId;
      if (!provinceId) {
        setInstitutionDistricts([]);
        return;
      }

      try {
        const dists = await getDistricts(provinceId);
        setInstitutionDistricts(dists);
      } catch (e) {
        console.error('Kurum ili değişince ilçe verisi alınırken hata:', e);
      }
    };

    loadForInstitutionProvince();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.institutionProvinceId]);

  // Bölge Bilgileri'ndeki İl/İlçe değiştiğinde Kurum İli/İlçesi'ni otomatik eşitle
  useEffect(() => {
    setForm((prev) => {
      if (
        prev.institutionProvinceId === prev.provinceId &&
        prev.institutionDistrictId === prev.districtId
      ) {
        return prev;
      }
      return {
        ...prev,
        institutionProvinceId: prev.provinceId,
        institutionDistrictId: prev.districtId,
      };
    });
  }, [form.provinceId, form.districtId]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validate = () => {
    if (!form.firstName.trim()) {
      setError('Ad alanı zorunludur.');
      return false;
    }
    if (!form.lastName.trim()) {
      setError('Soyad alanı zorunludur.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canUpdateMember) {
      setError('Bu işlem için yetkiniz yok.');
      return;
    }

    if (!id) {
      setError('Üye ID bulunamadı.');
      return;
    }

    if (!validate()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Sadece değiştirilmiş alanları gönder
      const updateData: any = {};

      if (form.firstName !== member?.firstName) updateData.firstName = form.firstName;
      if (form.lastName !== member?.lastName) updateData.lastName = form.lastName;
      if (form.phone !== (member?.phone || '')) updateData.phone = form.phone || undefined;
      if (form.email !== (member?.email || '')) updateData.email = form.email || undefined;
      if (form.memberGroupId !== (member?.memberGroup?.id || '')) updateData.memberGroupId = form.memberGroupId || undefined;
      if (form.registrationNumber !== (member?.registrationNumber || '')) updateData.registrationNumber = form.registrationNumber || undefined;
        if (form.boardDecisionDate !== (member?.boardDecisionDate ? new Date(member.boardDecisionDate).toISOString().split('T')[0] : '')) {
        updateData.boardDecisionDate = form.boardDecisionDate || undefined;
      }
      if (form.boardDecisionBookNo !== (member?.boardDecisionBookNo || '')) updateData.boardDecisionBookNo = form.boardDecisionBookNo || undefined;
      if (form.motherName !== (member?.motherName || '')) updateData.motherName = form.motherName || undefined;
      if (form.fatherName !== (member?.fatherName || '')) updateData.fatherName = form.fatherName || undefined;
      if (form.birthDate !== (member?.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '')) {
        updateData.birthDate = form.birthDate || undefined;
      }
      if (form.birthplace !== (member?.birthplace || '')) updateData.birthplace = form.birthplace || undefined;
      if (form.gender !== (member?.gender || '')) updateData.gender = form.gender || undefined;
      if (form.educationStatus !== (member?.educationStatus || '')) updateData.educationStatus = form.educationStatus || undefined;
      if (form.provinceId !== (member?.province?.id || '')) updateData.provinceId = form.provinceId || undefined;
      if (form.districtId !== (member?.district?.id || '')) updateData.districtId = form.districtId || undefined;
      if (form.institutionId !== (member?.institution?.id || '')) updateData.institutionId = form.institutionId || undefined;
      if (form.branchId !== (member?.branch?.id || '')) updateData.branchId = form.branchId || undefined;
      if (form.tevkifatCenterId !== ((member as any)?.tevkifatCenter?.id || '')) updateData.tevkifatCenterId = form.tevkifatCenterId || undefined;
      if (form.tevkifatTitleId !== ((member as any)?.tevkifatTitle?.id || '')) updateData.tevkifatTitleId = form.tevkifatTitleId || undefined;
      // Kurum Detay Bilgileri
      if (form.dutyUnit !== ((member as any)?.dutyUnit || '')) updateData.dutyUnit = form.dutyUnit || undefined;
      if (form.institutionAddress !== ((member as any)?.institutionAddress || '')) updateData.institutionAddress = form.institutionAddress || undefined;
      if (form.institutionProvinceId !== ((member as any)?.institutionProvince?.id || '')) updateData.institutionProvinceId = form.institutionProvinceId || undefined;
      if (form.institutionDistrictId !== ((member as any)?.institutionDistrict?.id || '')) updateData.institutionDistrictId = form.institutionDistrictId || undefined;
      if (form.professionId !== ((member as any)?.profession?.id || '')) updateData.professionId = form.professionId || undefined;
      if (form.institutionRegNo !== ((member as any)?.institutionRegNo || '')) updateData.institutionRegNo = form.institutionRegNo || undefined;
      if (form.staffTitleCode !== ((member as any)?.staffTitleCode || '')) updateData.staffTitleCode = form.staffTitleCode || undefined;

      await updateMember(id, updateData);
      
      toast.success('Üye bilgileri başarıyla güncellendi');
      navigate(`/members/${id}`);
    } catch (error: unknown) {
      console.error('Üye güncellenirken hata:', error);
      setError(getApiErrorMessage(error, 'Üye güncellenirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  if (!canUpdateMember) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            borderRadius: 2,
          }}
        >
          <EditIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Yetkisiz İşlem
          </Typography>
          <Typography color="text.secondary">
            Üye bilgilerini güncellemek için gerekli izne sahip değilsiniz.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (loadingMember) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!member) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Üye bulunamadı
      </Alert>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<EditIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Üye Bilgilerini Güncelle"
        description={`${member.firstName} ${member.lastName} - ${member.registrationNumber || 'Kayıt No Yok'}`}
        color={theme.palette.info.main}
        darkColor={theme.palette.info.dark}
        lightColor={theme.palette.info.light}
      />
      {/* Hata Mesajı */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4,
            borderRadius: 4,
            boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.2)}`,
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            backgroundColor: alpha(theme.palette.error.main, 0.05),
            '& .MuiAlert-icon': {
              fontSize: '1.5rem',
            },
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {/* Ana Kart */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 5,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: `0 8px 40px ${alpha(theme.palette.common.black, 0.08)}`,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <Box sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
          {/* Kişisel Bilgiler Bölümü */}
          <Box 
            sx={{ 
              mb: 4,
              pb: 3,
              borderBottom: `3px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              position: 'relative',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
                }}
              >
                <PersonIcon sx={{ fontSize: '1.5rem', color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 0.5 }}>
                  Kişisel Bilgiler
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  Üyenin temel bilgilerini güncelleyin
                </Typography>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Ad *"
                value={form.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Soyad *"
                value={form.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Telefon"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: theme.palette.primary.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="E-posta"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                fullWidth
                type="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: theme.palette.primary.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={genderOptions}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                value={genderOptions.find((option) => option.value === form.gender) ?? null}
                onChange={(_, value) => handleChange('gender', value?.value ?? '')}
                renderInput={(params) => <TextField {...params} label="Cinsiyet" placeholder="Seçiniz" />}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Anne Adı"
                value={form.motherName}
                onChange={(e) => handleChange('motherName', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Baba Adı"
                value={form.fatherName}
                onChange={(e) => handleChange('fatherName', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Doğum Tarihi"
                type="date"
                value={form.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Doğum Yeri"
                value={form.birthplace}
                onChange={(e) => handleChange('birthplace', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlaceIcon sx={{ color: theme.palette.primary.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={educationOptions}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                value={educationOptions.find((option) => option.value === form.educationStatus) ?? null}
                onChange={(_, value) => handleChange('educationStatus', value?.value ?? '')}
                renderInput={(params) => (
                  <TextField {...params} label="Öğrenim Durumu" placeholder="Seçiniz" />
                )}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={provinces}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={provinces.find((province) => province.id === form.provinceId) ?? null}
                onChange={(_, value) => handleChange('provinceId', value?.id ?? '')}
                renderInput={(params) => (
                  <TextField {...params} label="Bölge İl" placeholder="Seçiniz" />
                )}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={districts}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={districts.find((district) => district.id === form.districtId) ?? null}
                onChange={(_, value) => handleChange('districtId', value?.id ?? '')}
                disabled={!form.provinceId}
                renderInput={(params) => (
                  <TextField {...params} label="Bölge İlçe" placeholder="Seçiniz" />
                )}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 5, borderWidth: 1, opacity: 0.1 }} />

          {/* Üyelik & Yönetim Kurulu Bilgileri */}
          <Box 
            sx={{ 
              mb: 4,
              pb: 3,
              borderBottom: `3px solid ${alpha(theme.palette.success.main, 0.08)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.35)}`,
                }}
              >
                <AccountBalanceWalletIcon sx={{ fontSize: '1.5rem', color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 0.5 }}>
                  Üyelik & Yönetim Kurulu Bilgileri
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  Üyelik kaydı ve yönetim kurulu bilgilerini güncelleyin
                </Typography>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Üye Kayıt No"
                value={form.registrationNumber}
                onChange={(e) => handleChange('registrationNumber', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: theme.palette.success.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.success.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.success.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={memberGroups}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={memberGroups.find((group) => group.id === form.memberGroupId) ?? null}
                onChange={(_, value) => handleChange('memberGroupId', value?.id ?? '')}
                renderInput={(params) => <TextField {...params} label="Üye Grubu" placeholder="Seçiniz" />}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.success.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.success.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={branches}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={branches.find((branch) => branch.id === form.branchId) ?? null}
                onChange={(_, value) => handleChange('branchId', value?.id ?? '')}
                renderInput={(params) => <TextField {...params} label="Şube" placeholder="Seçiniz" />}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.success.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.success.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Yönetim Kurulu Karar Tarihi"
                type="date"
                value={form.boardDecisionDate}
                onChange={(e) => handleChange('boardDecisionDate', e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.success.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.success.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Yönetim Kurulu Karar Defter No"
                value={form.boardDecisionBookNo}
                onChange={(e) => handleChange('boardDecisionBookNo', e.target.value)}
                fullWidth
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.success.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.success.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 5, borderWidth: 1, opacity: 0.1 }} />

          {/* İş Bilgileri */}
          <Box 
            sx={{ 
              mb: 4,
              pb: 3,
              borderBottom: `3px solid ${alpha(theme.palette.warning.main, 0.08)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.warning.main, 0.35)}`,
                }}
              >
                <WorkIcon sx={{ fontSize: '1.5rem', color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 0.5 }}>
                  İş Bilgileri
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  Üyenin çalıştığı kurum ve görev bilgilerini güncelleyin
                </Typography>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={institutions}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={institutions.find((institution) => institution.id === form.institutionId) ?? null}
                onChange={(_, value) => handleChange('institutionId', value?.id ?? '')}
                onOpen={() => {
                  void loadInstitutions();
                }}
                renderInput={(params) => <TextField {...params} label="Kurum" placeholder="Seçiniz" />}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            {/* Görev Birimi */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Görev Birimi"
                value={form.dutyUnit}
                onChange={(e) => handleChange('dutyUnit', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <WorkIcon sx={{ color: theme.palette.warning.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            {/* Meslek(Unvan) */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={professions}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={professions.find((profession) => profession.id === form.professionId) ?? null}
                onChange={(_, value) => handleChange('professionId', value?.id ?? '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Meslek(Unvan)"
                    placeholder="Meslek/Unvan Seçin"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <BadgeIcon
                              sx={{ color: theme.palette.warning.main, fontSize: '1.3rem', ml: 1 }}
                            />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            {/* Kurum Adresi */}
            <Grid size={12}>
              <TextField
                label="Kurum Adresi"
                value={form.institutionAddress}
                onChange={(e) => handleChange('institutionAddress', e.target.value)}
                multiline
                rows={3}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlaceIcon sx={{ color: theme.palette.warning.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  maxWidth: '1240px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            {/* Kurum İli - Kurum İlçesi */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={institutionProvinces}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={
                  institutionProvinces.find((province) => province.id === form.institutionProvinceId) ??
                  null
                }
                onChange={(_, value) => handleChange('institutionProvinceId', value?.id ?? '')}
                disabled
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kurum İli"
                    placeholder="İl Seçin"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PlaceIcon
                              sx={{ color: theme.palette.warning.main, fontSize: '1.3rem', ml: 1 }}
                            />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={institutionDistricts}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={
                  institutionDistricts.find(
                    (district) => district.id === form.institutionDistrictId,
                  ) ?? null
                }
                onChange={(_, value) => handleChange('institutionDistrictId', value?.id ?? '')}
                disabled
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kurum İlçesi"
                    placeholder="İlçe Seçin"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PlaceIcon
                              sx={{ color: theme.palette.warning.main, fontSize: '1.3rem', ml: 1 }}
                            />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            {/* Kurum Sicil No - Kadro Unvan Kodu */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Kurum Sicil No"
                value={form.institutionRegNo}
                onChange={(e) => handleChange('institutionRegNo', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: theme.palette.warning.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <TextField
                label="Kadro Unvan Kodu"
                value={form.staffTitleCode}
                onChange={(e) => handleChange('staffTitleCode', e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: theme.palette.warning.main, fontSize: '1.3rem' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.warning.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 5, borderWidth: 1, opacity: 0.1 }} />

          {/* Tevkifat Bilgileri */}
          <Box 
            sx={{ 
              mb: 4,
              pb: 3,
              borderBottom: `3px solid ${alpha(theme.palette.info.main, 0.08)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.info.main, 0.35)}`,
                }}
              >
                <AccountBalanceWalletIcon sx={{ fontSize: '1.5rem', color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 0.5 }}>
                  Tevkifat Bilgileri
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  Üyenin tevkifat merkezi ve ünvan bilgilerini güncelleyin
                </Typography>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={tevkifatCentersForSelect}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={
                  tevkifatCentersForSelect.find((center) => center.id === form.tevkifatCenterId) ??
                  null
                }
                onChange={(_, value) => handleChange('tevkifatCenterId', value?.id ?? '')}
                renderInput={(params) => (
                  <TextField {...params} label="Tevkifat Kurumu" placeholder="Seçiniz" />
                )}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.info.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.info.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.info.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4
              }}>
              <Autocomplete
                options={tevkifatTitles}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={tevkifatTitles.find((title) => title.id === form.tevkifatTitleId) ?? null}
                onChange={(_, value) => handleChange('tevkifatTitleId', value?.id ?? '')}
                renderInput={(params) => (
                  <TextField {...params} label="Tevkifat Ünvanı" placeholder="Seçiniz" />
                )}
                sx={{
                  width: '100%',
                  minWidth: '250px',
                  maxWidth: '400px',
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.info.main, 0.02),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.info.main, 0.04),
                      boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.1)}`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                      boxShadow: `0 4px 16px ${alpha(theme.palette.info.main, 0.2)}`,
                    },
                  },
                }}
              />
            </Grid>
          </Grid>

          {/* Kaydet Butonu */}
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'flex-end', 
              gap: 3, 
              mt: 6,
              pt: 5,
              borderTop: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => navigate(`/members/${id}`)}
              disabled={saving}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                borderWidth: 2,
                minWidth: { xs: '100%', sm: '160px' },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 20px ${alpha(theme.palette.text.primary, 0.12)}`,
                },
              }}
            >
              İptal
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 700,
                px: 5,
                py: 1.5,
                fontSize: '1rem',
                minWidth: { xs: '100%', sm: '180px' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.5)}`,
                  transform: 'translateY(-3px)',
                },
                '&:active': {
                  transform: 'translateY(-1px)',
                },
                '&.Mui-disabled': {
                  background: alpha(theme.palette.primary.main, 0.3),
                },
              }}
            >
              {saving ? 'Güncelleniyor...' : 'Güncelle'}
            </Button>
          </Box>
        </Box>
      </Card>
    </PageLayout>
  );
};

export default MemberUpdatePage;
