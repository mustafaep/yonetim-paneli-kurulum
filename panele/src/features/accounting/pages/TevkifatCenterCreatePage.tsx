// src/pages/accounting/TevkifatCenterCreatePage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import {
  createTevkifatCenter,
  updateTevkifatCenter,
  getTevkifatCenterById,
  type CreateTevkifatCenterDto,
  type UpdateTevkifatCenterDto,
  type TevkifatCenter,
} from '../services/accountingApi';
import { getProvinces, getDistricts, type Province, type District } from '../../regions/services/regionsApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const TevkifatCenterCreatePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<TevkifatCenter | null>(null);
  const [form, setForm] = useState<CreateTevkifatCenterDto>({
    name: '',
    provinceId: undefined,
    districtId: undefined,
  });
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const canCreate = hasPermission('TEVKIFAT_CENTER_CREATE');
  const canUpdate = hasPermission('TEVKIFAT_CENTER_UPDATE');
  const canManage = isEditMode ? canUpdate : canCreate;

  useEffect(() => {
    if (canManage) {
      loadProvinces();
      if (isEditMode && id) {
        loadCenter(id);
      }
    }
  }, [canManage, isEditMode, id]);

  const loadProvinces = async () => {
    try {
      const data = await getProvinces();
      setProvinces(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('İller alınırken hata:', e);
      setProvinces([]);
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
    } catch (e) {
      console.error('İlçeler alınırken hata:', e);
      setDistricts([]);
    }
  };

  const loadCenter = async (centerId: string) => {
    setLoading(true);
    try {
      const data = await getTevkifatCenterById(centerId);
      setCenter(data);
      // Düzenleme modunda tüm alanlar set edilir
      setForm({
        name: data.name,
        provinceId: data.provinceId || undefined,
        districtId: data.districtId || undefined,
      });
      
      // İl seçilmişse ilçeleri yükle
      if (data.provinceId) {
        await loadDistrictsForProvince(data.provinceId);
      }
    } catch (e: unknown) {
      console.error('Tevkifat merkezi yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Tevkifat merkezi yüklenirken bir hata oluştu'));
      navigate('/accounting/tevkifat-centers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Tevkifat merkezi adı gereklidir');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditMode && id) {
        // Düzenleme modunda tüm alanlar gönderilir
        const payload: UpdateTevkifatCenterDto = {
          name: form.name.trim(),
          provinceId: form.provinceId || null,
          districtId: form.districtId || null,
        };
        await updateTevkifatCenter(id, payload);
        toast.showSuccess('Tevkifat merkezi başarıyla güncellendi');
        navigate(`/accounting/tevkifat-centers/${id}`);
      } else {
        // Oluşturma modunda tüm alanlar gönderilir
        const payload: CreateTevkifatCenterDto = {
          name: form.name.trim(),
          provinceId: form.provinceId,
          districtId: form.districtId,
        };
        const created = await createTevkifatCenter(payload);
        toast.showSuccess('Tevkifat merkezi başarıyla oluşturuldu');
        navigate(`/accounting/tevkifat-centers/${created.id}`);
      }
    } catch (e: unknown) {
      console.error('Tevkifat merkezi kaydedilirken hata:', e);
      setError(getApiErrorMessage(e, 'Tevkifat merkezi kaydedilirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  const handleProvinceChange = (provinceId: string) => {
    setForm((prev) => ({
      ...prev,
      provinceId: provinceId || undefined,
      districtId: undefined, // İl değiştiğinde ilçe sıfırlanır
    }));
    loadDistrictsForProvince(provinceId);
  };

  const handleDistrictChange = (districtId: string) => {
    setForm((prev) => ({
      ...prev,
      districtId: districtId || undefined,
    }));
  };

  if (!canManage) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            borderRadius: 3,
            boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.15)}`,
          }}
        >
          <BusinessIcon sx={{ fontSize: 64, color: theme.palette.error.main, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            Yetkisiz İşlem
          </Typography>
          <Typography color="text.secondary">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </Typography>
        </Paper>
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

  return (
    <PageLayout>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/accounting/tevkifat-centers')}
          sx={{ 
            mb: 3,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 2,
          }}
        >
          Geri Dön
        </Button>

        <PageHeader
          icon={<BusinessIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title={isEditMode ? 'Tevkifat Merkezi Düzenle' : 'Yeni Tevkifat Merkezi Oluştur'}
          description={isEditMode
            ? 'Tevkifat merkezi bilgilerini güncelleyin'
            : 'Yeni bir tevkifat merkezi kaydı oluşturun'}
          color={theme.palette.primary.main}
          darkColor={theme.palette.primary.dark}
          lightColor={theme.palette.primary.light}
        />
      </Box>
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
        <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2.5,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.15)}`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }} 
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid size={12}>
                <TextField
                  label="Tevkifat Merkezi Adı"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  fullWidth
                  required
                  helperText="Tevkifat merkezinin resmi adını girin"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      transition: 'all 0.3s ease',
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                      },
                    },
                  }}
                />
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <FormControl fullWidth>
                  <InputLabel id="province-label">İl (Opsiyonel)</InputLabel>
                  <Select
                    labelId="province-label"
                    label="İl (Opsiyonel)"
                    value={form.provinceId || ''}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    sx={{ 
                      borderRadius: 2.5,
                      transition: 'all 0.3s ease',
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Seçiniz</em>
                    </MenuItem>
                    {provinces.map((province) => (
                      <MenuItem key={province.id} value={province.id}>
                        {province.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Tevkifat merkezini bir ile bağlayabilirsiniz</FormHelperText>
                </FormControl>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <FormControl fullWidth disabled={!form.provinceId}>
                  <InputLabel id="district-label">İlçe (Opsiyonel)</InputLabel>
                  <Select
                    labelId="district-label"
                    label="İlçe (Opsiyonel)"
                    value={form.districtId || ''}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    sx={{ 
                      borderRadius: 2.5,
                      transition: 'all 0.3s ease',
                      '&.Mui-focused': {
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Seçiniz</em>
                    </MenuItem>
                    {districts.map((district) => (
                      <MenuItem key={district.id} value={district.id}>
                        {district.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {form.provinceId 
                      ? 'Tevkifat merkezini bir ilçeye bağlayabilirsiniz' 
                      : 'İlçe seçmek için önce bir il seçmelisiniz'}
                  </FormHelperText>
                </FormControl>
              </Grid>

              <Grid size={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/accounting/tevkifat-centers')}
                    disabled={saving}
                    sx={{
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                      py: 1.25,
                      borderWidth: 1.5,
                      '&:hover': {
                        borderWidth: 1.5,
                      },
                    }}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} /> : isEditMode ? <SaveIcon /> : <AddIcon />}
                    disabled={saving}
                    sx={{ 
                      borderRadius: 2, 
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                      py: 1.25,
                      minWidth: 140,
                      boxShadow: 'none',
                      '&:hover': {
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                      },
                    }}
                  >
                    {saving ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Oluştur'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Card>
    </PageLayout>
  );
};

export default TevkifatCenterCreatePage;

