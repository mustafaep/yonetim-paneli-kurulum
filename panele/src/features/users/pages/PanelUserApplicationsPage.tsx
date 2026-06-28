import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  CircularProgress,
  Alert,
  Fade,
  Autocomplete,
  Paper,
  IconButton,
  Divider,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import BadgeIcon from '@mui/icons-material/Badge';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EmailIcon from '@mui/icons-material/Email';
import { useNavigate } from 'react-router-dom';

import { getMembers } from '../../members/services/membersApi';
import type { MemberListItem } from '../../../types/member';
import { getRoles } from '../../roles/services/rolesApi';
import { getProvinces, getDistricts } from '../../regions/services/regionsApi';
import type { Province, District } from '../../../types/region';
import type { CustomRole, RoleListItem } from '../../../types/role';
import {
  directPromoteMemberToPanelUser,
  type DirectPromotePanelUserDto,
  type RoleScopeDto,
} from '../services/panelUserApplicationsApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const removeTurkishChars = (text: string): string => {
  const map: Record<string, string> = {
    ö: 'o', Ö: 'O', ş: 's', Ş: 'S',
    İ: 'I', ı: 'i', ü: 'u', Ü: 'U',
    ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G',
  };
  return text.replace(/[öÖşŞİıüÜçÇğĞ]/g, (ch) => map[ch] || ch);
};

const isCustomRole = (role: RoleListItem): role is CustomRole =>
  !('isSystemRole' in role);

interface FormState {
  email: string;
  password: string;
  passwordConfirm: string;
  note: string;
  scopes: RoleScopeDto[];
}

const STEPS = ['Üye Seç', 'Rol Seç', 'Giriş Bilgileri', 'Onay'];

const PanelUserApplicationsPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  // Üye arama
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberListItem | null>(null);

  // Roller
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Scope (yetki alanı)
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districtsMap, setDistrictsMap] = useState<Record<string, District[]>>({});
  const [provincesLoading, setProvincesLoading] = useState(false);

  // Form
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    passwordConfirm: '',
    note: '',
    scopes: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  // Scope hazır mı?
  const scopeReady =
    !selectedRole?.hasScopeRestriction ||
    (form.scopes.length > 0 && form.scopes.some((s) => s.provinceId || s.districtId));

  // Adım takibi
  const activeStep = !selectedMember ? 0 : !selectedRole || !scopeReady ? 1 : !form.email || !form.password ? 2 : 3;

  // Şifre eşleşme kontrolü
  const passwordsMatch =
    form.password.length === 0 ||
    form.passwordConfirm.length === 0 ||
    form.password === form.passwordConfirm;
  const passwordConfirmError =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm;

  // Aktif üyeleri yükle
  useEffect(() => {
    setMembersLoading(true);
    getMembers('ACTIVE')
      .then((list) => setMembers(list))
      .catch(() => toast.showError('Üyeler yüklenirken hata oluştu'))
      .finally(() => setMembersLoading(false));
  }, []);

  // Rolleri yükle
  useEffect(() => {
    getRoles()
      .then((all) => {
        const custom = all
          .filter(isCustomRole)
          .filter((r) => r.isActive && r.name.toUpperCase() !== 'ADMIN');
        setRoles(custom);
      })
      .catch(() => toast.showError('Roller yüklenirken hata oluştu'))
      .finally(() => setRolesLoading(false));
  }, []);

  // İlleri yükle (yalnızca scope gerektiren rol seçilince)
  useEffect(() => {
    if (!selectedRole?.hasScopeRestriction) return;
    if (provinces.length > 0) return;
    setProvincesLoading(true);
    getProvinces()
      .then(setProvinces)
      .catch(() => toast.showError('İller yüklenirken hata oluştu'))
      .finally(() => setProvincesLoading(false));
  }, [selectedRole]);

  const handleMemberSelect = useCallback(
    (_: React.SyntheticEvent, member: MemberListItem | null) => {
      setSelectedMember(member);
      setSelectedRole(null);
      const autoEmail = member?.email ? removeTurkishChars(member.email) : '';
      setForm({ email: autoEmail, password: '', passwordConfirm: '', note: '', scopes: [] });
      setSuccessResult(null);
    },
    [],
  );

  const handleRoleChange = useCallback((role: CustomRole | null) => {
    setSelectedRole(role);
    setForm((prev) => ({
      ...prev,
      scopes: role?.hasScopeRestriction
        ? [{ provinceId: undefined, districtId: undefined }]
        : [],
    }));
  }, []);

  const handleProvinceChange = async (index: number, provinceId: string) => {
    const newScopes = [...form.scopes];
    newScopes[index] = { provinceId, districtId: undefined };
    setForm((prev) => ({ ...prev, scopes: newScopes }));
    if (provinceId && !districtsMap[provinceId]) {
      try {
        const districts = await getDistricts(provinceId);
        setDistrictsMap((prev) => ({ ...prev, [provinceId]: districts }));
      } catch {
        // ignore
      }
    }
  };

  // Validasyon yap, hata yoksa onay popup'ını aç
  const handleSubmit = () => {
    if (!selectedMember || !selectedRole) return;

    if (!form.email.trim()) { toast.showError('Email adresi zorunludur'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) { toast.showError('Geçerli bir email adresi girin'); return; }
    if (!form.password) { toast.showError('Şifre zorunludur'); return; }
    if (form.password.length < 8) { toast.showError('Şifre en az 8 karakter olmalıdır'); return; }
    if (form.password !== form.passwordConfirm) { toast.showError('Şifreler eşleşmiyor'); return; }

    if (selectedRole.hasScopeRestriction) {
      if (!form.scopes || form.scopes.length === 0) {
        toast.showError('Bu rol için en az bir yetki alanı seçmelisiniz'); return;
      }
      for (const scope of form.scopes) {
        if (!scope.provinceId && !scope.districtId) {
          toast.showError('Her yetki alanı için en az bir il veya ilçe seçmelisiniz'); return;
        }
        if (scope.districtId && !scope.provinceId) {
          toast.showError('İlçe seçmek için önce il seçmelisiniz'); return;
        }
      }
    }

    setConfirmOpen(true);
  };

  // Onay popup'ında "Evet, Oluştur" basılınca gerçek API çağrısı
  const handleConfirmedSubmit = async () => {
    if (!selectedMember || !selectedRole) return;
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const dto: DirectPromotePanelUserDto = {
        requestedRoleId: selectedRole.id,
        email: form.email.trim(),
        password: form.password,
        note: form.note.trim() || undefined,
        scopes: selectedRole.hasScopeRestriction
          ? form.scopes.filter((s) => s.provinceId || s.districtId)
          : undefined,
      };
      const result = await directPromoteMemberToPanelUser(selectedMember.id, dto);
      toast.showSuccess('Panel kullanıcısı başarıyla oluşturuldu');
      setSuccessResult(result);
      navigate(`/users/panel/${result.userId}`);
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Kullanıcı oluşturulurken hata oluştu'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedMember(null);
    setSelectedRole(null);
    setForm({ email: '', password: '', passwordConfirm: '', note: '', scopes: [] });
    setSuccessResult(null);
    setConfirmOpen(false);
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`,
      },
    },
  };

  const sectionDisabledSx = (disabled: boolean) => ({
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    transition: 'opacity 0.25s',
  });

  return (
    <>
      <Fade in timeout={300}>
        <PageLayout>
        <PageHeader
          icon={<PersonAddIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="Panel Kullanıcı Ekle"
          description="Aktif bir üyeyi seçerek panel kullanıcısı olarak tanımlayın"
          color={theme.palette.primary.main}
          darkColor={theme.palette.primary.dark}
          lightColor={theme.palette.primary.light}
        />

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
            overflow: 'hidden',
            background: '#fff',
            maxWidth: 760,
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
            {successResult ? (
              /* ── Başarı Ekranı ── */
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                    boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.35)}`,
                  }}
                >
                  <CheckCircleIcon sx={{ color: '#fff', fontSize: '2.5rem' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Panel Kullanıcısı Oluşturuldu
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>
                    {successResult.firstName} {successResult.lastName}
                  </strong>{' '}
                  başarıyla panel kullanıcısı olarak tanımlandı.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Giriş emaili: <strong>{successResult.email}</strong>
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                  <Button
                    variant="contained"
                    onClick={handleReset}
                    startIcon={<PersonAddIcon />}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Yeni Kullanıcı Ekle
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/users')}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Kullanıcı Listesine Git
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Stack spacing={0}>
                {/* Adım göstergesi */}
                <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
                  {STEPS.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                {/* ── ADIM 1: Üye Seç ── */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24, height: 24, borderRadius: '50%',
                        bgcolor: theme.palette.primary.main,
                        color: '#fff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      1
                    </Box>
                    Üye Seç
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, ml: 4 }}>
                    Ad-soyad veya TC kimlik numarası ile arama yapın.
                  </Typography>

                  <Autocomplete
                    options={members}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(o) =>
                      `${o.firstName} ${o.lastName}${o.nationalId ? ` (${o.nationalId})` : ''}`
                    }
                    filterOptions={(options, { inputValue }) => {
                      const q = inputValue.toLowerCase().trim();
                      if (!q) return options;
                      return options.filter(
                        (o) =>
                          o.firstName.toLowerCase().includes(q) ||
                          o.lastName.toLowerCase().includes(q) ||
                          `${o.firstName} ${o.lastName}`.toLowerCase().includes(q) ||
                          (o.nationalId && o.nationalId.includes(q)) ||
                          (o.registrationNumber && o.registrationNumber.toLowerCase().includes(q)),
                      );
                    }}
                    loading={membersLoading}
                    value={selectedMember}
                    onChange={handleMemberSelect}
                    noOptionsText="Üye bulunamadı"
                    loadingText="Üyeler yükleniyor..."
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={membersLoading ? 'Yükleniyor...' : 'Ad, soyad veya TC numarası ile ara...'}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                {membersLoading
                                  ? <CircularProgress size={18} />
                                  : <SearchIcon sx={{ color: theme.palette.primary.main }} />
                                }
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                        sx={inputSx}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: React.Key };
                      return (
                        <Box component="li" key={key} {...rest}>
                          <Box sx={{ py: 0.5 }}>
                            <Typography variant="body1" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                              {option.firstName} {option.lastName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
                              {option.nationalId && (
                                <Typography variant="caption" color="text.secondary">
                                  TC: {option.nationalId}
                                </Typography>
                              )}
                              {option.registrationNumber && (
                                <Typography variant="caption" color="text.secondary">
                                  Üye No: {option.registrationNumber}
                                </Typography>
                              )}
                              {option.memberGroup?.name && (
                                <Typography variant="caption" color="text.secondary">
                                  {option.memberGroup.name}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    }}
                  />

                  {selectedMember && (
                    <Alert
                      severity="success"
                      sx={{ mt: 1.5, borderRadius: 2 }}
                      action={
                        <Button
                          size="small"
                          color="inherit"
                          onClick={handleReset}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Değiştir
                        </Button>
                      }
                    >
                      <strong>
                        {selectedMember.firstName} {selectedMember.lastName}
                      </strong>{' '}
                      seçildi.
                    </Alert>
                  )}
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* ── ADIM 2: Rol Seç ── */}
                <Box sx={{ my: 3, ...sectionDisabledSx(!selectedMember) }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24, height: 24, borderRadius: '50%',
                        bgcolor: selectedMember ? theme.palette.primary.main : theme.palette.grey[400],
                        color: '#fff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      2
                    </Box>
                    Rol Seç
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, ml: 4 }}>
                    Kullanıcıya atanacak rolü seçin.
                  </Typography>

                  <FormControl fullWidth disabled={rolesLoading || !selectedMember}>
                    <InputLabel>
                      {rolesLoading ? 'Roller yükleniyor...' : 'Rol seçin *'}
                    </InputLabel>
                    <Select
                      value={selectedRole?.id || ''}
                      label={rolesLoading ? 'Roller yükleniyor...' : 'Rol seçin *'}
                      onChange={(e) => {
                        handleRoleChange(roles.find((r) => r.id === e.target.value) || null);
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      {roles.map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {role.name}
                              </Typography>
                              {role.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {role.description}
                                </Typography>
                              )}
                            </Box>
                            {role.hasScopeRestriction && (
                              <Chip
                                label="Yetki Alanı Gerektirir"
                                size="small"
                                color="warning"
                                sx={{ ml: 'auto', height: 20, fontSize: '0.65rem' }}
                              />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* ── Yetki Alanı Seçimi (rolün hemen altında) ── */}
                {selectedRole?.hasScopeRestriction && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                      bgcolor: alpha(theme.palette.warning.main, 0.04),
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700, mb: 1.5,
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        color: theme.palette.warning.dark,
                      }}
                    >
                      <LocationOnIcon fontSize="small" />
                      Yetki Alanları
                      <Chip label="Zorunlu" size="small" color="warning" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
                    </Typography>

                    <Stack spacing={1.5}>
                      {form.scopes.map((scope, index) => (
                        <Paper
                          key={index}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                            borderRadius: 2,
                            bgcolor: '#fff',
                          }}
                        >
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <FormControl fullWidth size="small">
                                <InputLabel>İl *</InputLabel>
                                <Select
                                  value={scope.provinceId || ''}
                                  label="İl *"
                                  onChange={(e) => handleProvinceChange(index, e.target.value)}
                                  disabled={provincesLoading}
                                >
                                  <MenuItem value=""><em>{provincesLoading ? 'Yükleniyor...' : 'İl Seçin'}</em></MenuItem>
                                  {provinces.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              {scope.provinceId && (
                                <FormControl fullWidth size="small">
                                  <InputLabel>İlçe (İsteğe Bağlı)</InputLabel>
                                  <Select
                                    value={scope.districtId || ''}
                                    label="İlçe (İsteğe Bağlı)"
                                    onChange={(e) => {
                                      const newScopes = [...form.scopes];
                                      newScopes[index] = { ...newScopes[index], districtId: e.target.value || undefined };
                                      setForm((prev) => ({ ...prev, scopes: newScopes }));
                                    }}
                                    disabled={!districtsMap[scope.provinceId!]}
                                  >
                                    <MenuItem value=""><em>Tüm İlçeler</em></MenuItem>
                                    {districtsMap[scope.provinceId!]?.map((d) => (
                                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            </Box>

                            {form.scopes.length > 1 && (
                              <IconButton
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    scopes: prev.scopes.filter((_, i) => i !== index),
                                  }))
                                }
                                color="error"
                                size="small"
                                sx={{ mt: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Stack>

                    <Button
                      variant="outlined"
                      size="small"
                      color="warning"
                      startIcon={<AddCircleIcon />}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          scopes: [...prev.scopes, { provinceId: undefined, districtId: undefined }],
                        }))
                      }
                      sx={{ mt: 1.5, textTransform: 'none' }}
                    >
                      Yetki Alanı Ekle
                    </Button>
                  </Box>
                )}

                <Divider sx={{ my: 1 }} />

                {/* ── ADIM 3: Giriş Bilgileri ── */}
                <Box sx={{ my: 3, ...sectionDisabledSx(!selectedMember || !selectedRole || !scopeReady) }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24, height: 24, borderRadius: '50%',
                        bgcolor: selectedMember && selectedRole && scopeReady ? theme.palette.primary.main : theme.palette.grey[400],
                        color: '#fff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      3
                    </Box>
                    Giriş Bilgileri
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, ml: 4 }}>
                    Kullanıcının panele giriş yapacağı email ve şifre.
                  </Typography>

                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Email *"
                      type="email"
                      value={form.email}
                      disabled={!selectedMember || !selectedRole || !scopeReady}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          email: removeTurkishChars(e.target.value),
                        }))
                      }
                      placeholder="ornek@email.com"
                      helperText={
                        selectedMember?.email
                          ? 'Üyenin kayıtlı emailinden otomatik dolduruldu — değiştirebilirsiniz'
                          : 'Türkçe karakterler (ö, ş, İ, ı, ü, ç, ğ) otomatik olarak dönüştürülür'
                      }
                      sx={inputSx}
                    />

                    <TextField
                      fullWidth
                      label="Şifre *"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      disabled={!selectedMember || !selectedRole || !scopeReady}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="En az 8 karakter"
                      helperText="Şifre en az 8 karakter olmalıdır"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small" tabIndex={-1}>
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={inputSx}
                    />

                    <TextField
                      fullWidth
                      label="Şifre Tekrar *"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      value={form.passwordConfirm}
                      disabled={!selectedMember || !selectedRole || !scopeReady}
                      onChange={(e) => setForm((prev) => ({ ...prev, passwordConfirm: e.target.value }))}
                      placeholder="Şifreyi tekrar girin"
                      error={passwordConfirmError}
                      helperText={
                        passwordConfirmError
                          ? 'Şifreler eşleşmiyor'
                          : form.passwordConfirm.length > 0 && passwordsMatch
                          ? '✓ Şifreler eşleşiyor'
                          : ' '
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPasswordConfirm((v) => !v)} edge="end" size="small" tabIndex={-1}>
                              {showPasswordConfirm ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        ...inputSx,
                        '& .MuiFormHelperText-root': {
                          color: passwordConfirmError
                            ? theme.palette.error.main
                            : form.passwordConfirm.length > 0 && passwordsMatch
                            ? theme.palette.success.main
                            : undefined,
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="İşlem Notu (İsteğe Bağlı)"
                      value={form.note}
                      disabled={!selectedMember || !selectedRole || !scopeReady}
                      onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Bu işlem hakkında ek bilgi..."
                      sx={inputSx}
                    />
                  </Stack>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* ── Gönder butonu ── */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={
                      submitting ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <BadgeIcon />
                      )
                    }
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      !selectedMember ||
                      !selectedRole ||
                      !form.email ||
                      !form.password ||
                      !form.passwordConfirm ||
                      passwordConfirmError
                    }
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 4,
                      py: 1.5,
                      borderRadius: 2.5,
                      fontSize: '1rem',
                      boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                      '&:hover': {
                        boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}`,
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {submitting ? 'Oluşturuluyor...' : 'Panel Kullanıcısı Oluştur'}
                  </Button>
                </Box>
              </Stack>
            )}
          </CardContent>
        </Card>
        </PageLayout>
      </Fade>

      {/* Onay Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            pb: 1,
            borderBottom: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            bgcolor: alpha(theme.palette.warning.main, 0.06),
          }}
        >
          <WarningAmberIcon sx={{ color: theme.palette.warning.main, fontSize: '1.8rem' }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Panel Kullanıcısı Oluşturulsun mu?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Aşağıdaki bilgileri kontrol edip onaylayın
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Stack spacing={2}>
            {/* Üye Bilgileri */}
            {selectedMember && (
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, borderColor: alpha(theme.palette.primary.main, 0.25) }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: '1.1rem' }} />
                  <Typography variant="subtitle2" color="primary" fontWeight={700}>
                    Üye Bilgileri
                  </Typography>
                </Box>
                <List dense disablePadding>
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={700} sx={{ fontSize: '1rem' }}>
                          {selectedMember.firstName} {selectedMember.lastName}
                        </Typography>
                      }
                    />
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                          {selectedMember.registrationNumber && (
                            <Chip
                              size="small"
                              label={`Üye No: ${selectedMember.registrationNumber}`}
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                          {selectedMember.nationalId && (
                            <Chip
                              size="small"
                              label={`TC: ${selectedMember.nationalId}`}
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                          {selectedMember.memberGroup?.name && (
                            <Chip
                              size="small"
                              label={`Grup: ${selectedMember.memberGroup.name}`}
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </List>
              </Paper>
            )}

            {/* Rol Bilgisi */}
            {selectedRole && (
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, borderColor: alpha(theme.palette.secondary.main, 0.25) }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AdminPanelSettingsIcon sx={{ color: theme.palette.secondary.main, fontSize: '1.1rem' }} />
                  <Typography variant="subtitle2" color="secondary" fontWeight={700}>
                    Rol
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={600}>
                  {selectedRole.name}
                </Typography>
              </Paper>
            )}

            {/* Yetki Alanları */}
            {selectedRole?.hasScopeRestriction && form.scopes.length > 0 && (
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, borderColor: alpha(theme.palette.info.main, 0.25) }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOnIcon sx={{ color: theme.palette.info.main, fontSize: '1.1rem' }} />
                  <Typography variant="subtitle2" color="info.main" fontWeight={700}>
                    Yetki Alanları
                  </Typography>
                </Box>
                <Stack spacing={0.5}>
                  {form.scopes.map((scope, idx) => {
                    const province = provinces.find((p) => p.id === scope.provinceId);
                    const districts = scope.provinceId ? (districtsMap[scope.provinceId] ?? []) : [];
                    const district = districts.find((d) => d.id === scope.districtId);
                    return (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 16 }}>
                          {idx + 1}.
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {province?.name ?? '—'}
                          {district ? ` / ${district.name}` : ''}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            )}

            {/* Email */}
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 2, borderColor: alpha(theme.palette.success.main, 0.25) }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <EmailIcon sx={{ color: theme.palette.success.main, fontSize: '1.1rem' }} />
                <Typography variant="subtitle2" color="success.main" fontWeight={700}>
                  Giriş Emaili
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={600}>
                {form.email.trim()}
              </Typography>
            </Paper>

            {/* Not */}
            {form.note.trim() && (
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.grey[500], 0.04) }}
              >
                <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={0.5}>
                  Not
                </Typography>
                <Typography variant="body2">
                  {form.note.trim()}
                </Typography>
              </Paper>
            )}

            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Bu işlem geri alınamaz. Üye belirtilen rol ve yetkilerle panel kullanıcısı olarak
              sisteme eklenecektir.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setConfirmOpen(false)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3 }}
          >
            İptal
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmedSubmit}
            startIcon={<CheckCircleIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
            }}
          >
            Evet, Oluştur
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PanelUserApplicationsPage;
