import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  useTheme,
  alpha,
  Fade,
  TextField,
  Alert,
  InputAdornment,
  Collapse,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SecurityIcon from '@mui/icons-material/Security';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import BadgeIcon from '@mui/icons-material/Badge';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useParams, useNavigate } from 'react-router-dom';

import type { UserDetail } from '../../../types/user';
import {
  getUserById,
  updateUserAccount,
  demoteUserToMember,
} from '../services/usersApi';
import { getRoles } from '../../roles/services/rolesApi';
import type { CustomRole } from '../../../types/role';
import type {
  UserScope,
  Province,
  District,
} from '../../../types/region';
import {
  getUserScopes,
  getProvinces,
  getDistricts,
  createUserScope,
  updateUserScope,
  deleteUserScope,
} from '../../regions/services/regionsApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { canManageBranches } from '../../../shared/utils/permissions';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';

// src/pages/users/UserDetailPage.tsx (senin path’ine göre)
import UserRolesDialog from '../components/UserRolesDialog';
import { updateUserRoles } from '../services/usersApi';

import UserPermissionsSection from '../components/UserPermissionsSection';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const navigate = useNavigate();

  // 🔹 Kullanıcı ve scope state'leri
  const [user, setUser] = useState<UserDetail | null>(null);
  const [scopes, setScopes] = useState<UserScope[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingScopes, setLoadingScopes] = useState(true);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [editableRoles, setEditableRoles] = useState<CustomRole[]>([]);

  // 🔹 Mevcut user (login olan) & branch manage kontrolü
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const isBranchManager = canManageBranches(currentUser);

  // 🔹 Scope ekleme/düzenleme dialog state'leri
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeProvinces, setScopeProvinces] = useState<Province[]>([]);
  const [scopeDistricts, setScopeDistricts] = useState<District[]>([]);
  const [editingScope, setEditingScope] = useState<UserScope | null>(null);

  const [scopeForm, setScopeForm] = useState<{
    provinceId: string;
    districtId: string;
  }>({
    provinceId: '',
    districtId: '',
  });

  const { hasPermission } = useAuth();
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [headerEditOpen, setHeaderEditOpen] = useState(false);
  const [headerEditSaving, setHeaderEditSaving] = useState(false);
  const [headerEditRoleId, setHeaderEditRoleId] = useState('');
  const [headerEditEmail, setHeaderEditEmail] = useState('');
  const [headerEditPassword, setHeaderEditPassword] = useState('');
  const [headerEditPasswordConfirm, setHeaderEditPasswordConfirm] = useState('');
  const [headerEditScopes, setHeaderEditScopes] = useState<
    Array<{ provinceId?: string; districtId?: string }>
  >([]);
  const [headerEditDistrictsMap, setHeaderEditDistrictsMap] = useState<
    Record<string, District[]>
  >({});
  const [showHeaderEditPassword, setShowHeaderEditPassword] = useState(false);
  const [showHeaderEditPasswordConfirm, setShowHeaderEditPasswordConfirm] =
    useState(false);
  const [roleSectionOpen, setRoleSectionOpen] = useState(true);
  const [demoteDialogOpen, setDemoteDialogOpen] = useState(false);
  const [demoteSubmitting, setDemoteSubmitting] = useState(false);
  const canAssignRole = hasPermission('USER_ASSIGN_ROLE');
  const canHeaderEditPanelUser = hasPermission('PANEL_USER_APPLICATION_APPROVE');
  const canDemoteToMember =
    hasPermission('USER_SOFT_DELETE') ||
    hasPermission('PANEL_USER_APPLICATION_APPROVE');

  const handleSaveRoles = async (customRoleIds: string[]) => {
    if (!user) return;
    try {
      const updated = await updateUserRoles(user.id, customRoleIds);
      setUser(updated);
    } catch (e) {
      console.error('Kullanıcı rolleri güncellenirken hata:', e);
      throw e; // Dialog içinde hata için alert gösteriyoruz
    }
  };
  
  
  // 🔹 Kullanıcı & ilk scope load
  useEffect(() => {
    if (!id) return;

    const fetchUser = async () => {
      setLoadingUser(true);
      try {
        const data = await getUserById(id);
        setUser(data);
        
        // Rolleri detaylı olarak çek
        try {
          const allRoles = await getRoles();
          const customRoles = allRoles
            .filter((r): r is CustomRole => 'id' in r)
            .map((r) => r as CustomRole);
          const userRoleDetails = customRoles.filter((r) =>
            data.roles.some(
              (roleName) => typeof roleName === 'string' && r.name === roleName,
            ),
          );
          setRoles(userRoleDetails);
          setEditableRoles(
            customRoles.filter(
              (r) => r.isActive && r.name.toUpperCase() !== 'ADMIN',
            ),
          );
        } catch (e) {
          console.error('Roller alınırken hata:', e);
        }
      } catch (e) {
        console.error('Kullanıcı detay alınırken hata:', e);
      } finally {
        setLoadingUser(false);
      }
    };

    const fetchScopes = async () => {
      setLoadingScopes(true);
      try {
        const data = await getUserScopes(id);
        // 🔹 Gelen veriyi mutlaka diziye çevir
        const safe = Array.isArray(data) ? data : [];
        setScopes(safe);
      } catch (e) {
        console.error('User scope alınırken hata:', e);
        // Hata durumunda boş dizi döndür
        setScopes([]);
      } finally {
        setLoadingScopes(false);
      }
    };
    

    fetchUser();
    fetchScopes();
  }, [id]);

  // 🔹 Scope'ları yeniden yükleme (save sonrası)
  const reloadScopes = async () => {
    if (!id) return;
    setLoadingScopes(true);
    try {
      const data = await getUserScopes(id);
      const safe = Array.isArray(data) ? data : [];
      setScopes(safe);
    } catch (e) {
      console.error('User scope yeniden alınırken hata:', e);
      setScopes([]);
    } finally {
      setLoadingScopes(false);
    }
  };
  
  // 🔹 Scope form değişimi
  const handleScopeFormChange = (field: keyof typeof scopeForm, value: string) => {
    setScopeForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'provinceId' ? { districtId: '' } : {}),
    }));
  };

  // 🔹 Scope dialog açıldığında & il değiştiğinde alt verileri yükle
  useEffect(() => {
    const loadForProvince = async () => {
      const provinceId = scopeForm.provinceId;
      if (!provinceId) {
        setScopeDistricts([]);
        return;
      }

      try {
        const districts = await getDistricts(provinceId);
        setScopeDistricts(districts);
      } catch (e) {
        console.error('Scope province change load error:', e);
      }
    };

    if (scopeDialogOpen) {
      loadForProvince();
    }
  }, [scopeForm.provinceId, scopeDialogOpen]);


  // 🔹 Scope dialog aç/kapat
  const openScopeDialog = async (scope?: UserScope) => {
    setEditingScope(scope || null);
    setScopeDialogOpen(true);
    setScopeSaving(false);
    
    if (scope) {
      // Düzenleme modu
      setScopeForm({
        provinceId: scope.province?.id || '',
        districtId: scope.district?.id || '',
      });
    } else {
      // Yeni ekleme modu
      setScopeForm({
        provinceId: '',
        districtId: '',
      });
    }

    try {
      const provinces = await getProvinces();
      setScopeProvinces(provinces);
      
      // Düzenleme modunda ve il seçiliyse ilçeleri yükle
      if (scope?.province?.id) {
        try {
          const districts = await getDistricts(scope.province.id);
          setScopeDistricts(districts);
        } catch (e) {
          console.error('Districts load error (scope dialog):', e);
          setScopeDistricts([]);
        }
      } else {
        setScopeDistricts([]);
      }
    } catch (e) {
      console.error('Provinces load error (scope dialog):', e);
    }
  };

  const closeScopeDialog = () => {
    if (scopeSaving) return;
    setScopeDialogOpen(false);
    setEditingScope(null);
    setScopeForm({
      provinceId: '',
      districtId: '',
    });
  };

  // 🔹 Scope save (ekleme veya güncelleme)
  const handleScopeSave = async () => {
    if (!id) return;
    const { provinceId, districtId } = scopeForm;

    if (!provinceId && !districtId) {
      toast.showWarning('En az bir yetki alanı (il veya ilçe) seçmelisiniz.');
      return;
    }

    setScopeSaving(true);
    try {
      // Boş string'leri undefined'a çevir
      const payload: {
        provinceId?: string;
        districtId?: string;
      } = {};

      if (provinceId && provinceId.trim() !== '') {
        payload.provinceId = provinceId;
      }

      if (districtId && districtId.trim() !== '') {
        payload.districtId = districtId;
      }

      if (editingScope) {
        // Güncelleme modu
        await updateUserScope(editingScope.id, payload);
        toast.showSuccess('Yetki alanı başarıyla güncellendi.');
      } else {
        // Yeni ekleme modu
        await createUserScope({
          userId: id,
          ...payload,
        });
        toast.showSuccess('Yetki alanı başarıyla eklendi.');
      }

      await reloadScopes();
      closeScopeDialog();
    } catch (e: unknown) {
      console.error('Scope kaydedilirken hata:', e);
      toast.showError(getApiErrorMessage(e, editingScope ? 'Yetki alanı güncellenirken bir hata oluştu.' : 'Yetki alanı eklenirken bir hata oluştu.'));
    } finally {
      setScopeSaving(false);
    }
  };

  // 🔹 Scope silme
  const handleDeleteScope = async (scopeId: string) => {
    if (!window.confirm('Bu yetki alanını silmek istediğinize emin misiniz?')) return;

    try {
      await deleteUserScope(scopeId);
      await reloadScopes();
      toast.showSuccess('Yetki alanı başarıyla silindi.');
    } catch (e) {
      console.error('Scope silinirken hata:', e);
      toast.showError('Yetki alanı silinirken bir hata oluştu.');
    }
  };

  const ensureHeaderEditDistrictsLoaded = async (provinceId?: string) => {
    if (!provinceId || headerEditDistrictsMap[provinceId]) return;
    try {
      const districts = await getDistricts(provinceId);
      setHeaderEditDistrictsMap((prev) => ({ ...prev, [provinceId]: districts }));
    } catch {
      // ignore
    }
  };

  const openHeaderEditDialog = async () => {
    if (!user) return;
    const selectedRole =
      editableRoles.find((r) => user.roles.includes(r.name)) ?? editableRoles[0];
    setHeaderEditRoleId(selectedRole?.id ?? '');
    setHeaderEditEmail(user.email ?? '');
    setHeaderEditPassword('');
    setHeaderEditPasswordConfirm('');

    if (scopeProvinces.length === 0) {
      try {
        const provinces = await getProvinces();
        setScopeProvinces(provinces);
      } catch {
        // ignore
      }
    }

    const initialScopes =
      scopes.length > 0
        ? scopes.map((s) => ({
            provinceId: s.province?.id,
            districtId: s.district?.id,
          }))
        : [{ provinceId: undefined, districtId: undefined }];
    setHeaderEditScopes(initialScopes);

    for (const scope of initialScopes) {
      if (scope.provinceId) {
        await ensureHeaderEditDistrictsLoaded(scope.provinceId);
      }
    }
    setHeaderEditOpen(true);
  };

  const handleHeaderEditSave = async () => {
    if (!user) return;
    const selectedRole = editableRoles.find((r) => r.id === headerEditRoleId);
    if (!selectedRole) {
      toast.showError('Rol seçimi zorunludur');
      return;
    }

    const email = headerEditEmail.trim();
    if (!email) {
      toast.showError('Email zorunludur');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.showError('Geçerli bir email adresi girin');
      return;
    }

    if (headerEditPassword) {
      if (headerEditPassword.length < 8) {
        toast.showError('Şifre en az 8 karakter olmalıdır');
        return;
      }
      if (headerEditPassword !== headerEditPasswordConfirm) {
        toast.showError('Şifreler eşleşmiyor');
        return;
      }
    }

    const cleanedScopes = headerEditScopes.filter(
      (s) => s.provinceId || s.districtId,
    );
    if (selectedRole.hasScopeRestriction && cleanedScopes.length === 0) {
      toast.showError('Bu rol için en az bir yetki alanı seçmelisiniz');
      return;
    }

    setHeaderEditSaving(true);
    try {
      await updateUserRoles(user.id, [selectedRole.id]);

      const existingScopeKeys = new Map(
        scopes.map((s) => [
          `${s.province?.id ?? ''}:${s.district?.id ?? ''}`,
          s.id,
        ]),
      );
      const targetScopeKeys = new Set(
        selectedRole.hasScopeRestriction
          ? cleanedScopes.map(
              (s) => `${s.provinceId ?? ''}:${s.districtId ?? ''}`,
            )
          : [],
      );

      for (const scope of scopes) {
        const key = `${scope.province?.id ?? ''}:${scope.district?.id ?? ''}`;
        if (!targetScopeKeys.has(key)) {
          await deleteUserScope(scope.id);
        }
      }

      if (selectedRole.hasScopeRestriction) {
        for (const scope of cleanedScopes) {
          const key = `${scope.provinceId ?? ''}:${scope.districtId ?? ''}`;
          if (!existingScopeKeys.has(key)) {
            await createUserScope({
              userId: user.id,
              provinceId: scope.provinceId,
              districtId: scope.districtId,
            });
          }
        }
      }

      const updatedUser = await updateUserAccount(user.id, {
        email,
        password: headerEditPassword || undefined,
      });
      setUser(updatedUser);
      await reloadScopes();
      toast.showSuccess('Panel kullanıcı bilgileri güncellendi');
      setHeaderEditOpen(false);
    } catch (e) {
      toast.showError(getApiErrorMessage(e, 'Güncelleme sırasında hata oluştu'));
    } finally {
      setHeaderEditSaving(false);
    }
  };

  const handleConfirmDemoteToMember = async () => {
    if (!user) return;
    setDemoteSubmitting(true);
    try {
      await demoteUserToMember(user.id);
      toast.showSuccess(
        `${user.firstName} ${user.lastName} artık yalnızca üye; panel hesabı kapatıldı.`,
      );
      setDemoteDialogOpen(false);
      navigate(`/members/${user.member?.id ?? ''}`);
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'İşlem sırasında bir hata oluştu.'));
    } finally {
      setDemoteSubmitting(false);
    }
  };

  // 🔹 Render kısmı – hook'lardan SONRA koşullu return
  if (loadingUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Typography>Kullanıcı bulunamadı.</Typography>;
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  const formatScopeRow = (scope: UserScope) => {
    if (scope.district) {
      return {
        type: 'İlçe',
        description: `${scope.province?.name ?? ''} / ${scope.district.name}`,
      };
    }
    if (scope.province) {
      return {
        type: 'İl',
        description: `${scope.province.name}`,
      };
    }
    return {
      type: '-',
      description: '-',
    };
  };

  const hasScopes = Array.isArray(scopes) && scopes.length > 0;

  return (
    <Fade in timeout={300}>
      <PageLayout>
        <PageHeader
          icon={<PersonIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title={fullName}
          description={user.email}
          color={theme.palette.primary.main}
          darkColor={theme.palette.primary.dark}
          lightColor={theme.palette.primary.light}
          rightContent={
            <Stack direction="row" spacing={1}>
              {canHeaderEditPanelUser && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={openHeaderEditDialog}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                >
                  Düzenle
                </Button>
              )}
              {canDemoteToMember &&
                user.member?.id &&
                user.id !== currentUser?.id && (
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => setDemoteDialogOpen(true)}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                  >
                    Üyeliğe Düşür
                  </Button>
                )}
            </Stack>
          }
        />

        {/* Kullanıcı Bilgileri Kartı */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <PersonIcon sx={{ fontSize: '1.5rem', color: theme.palette.primary.main, mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                Kullanıcı Bilgileri
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: 2,
                  background: alpha(theme.palette.primary.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>
                  Ad Soyad
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {fullName}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2.5,
                  borderRadius: 2,
                  background: alpha(theme.palette.primary.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
              >
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>
                  E-posta Adresi
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {user.email}
                </Typography>
              </Paper>
            </Box>

          </CardContent>
        </Card>

        {/* Rol Bilgileri (Açılır/Kapanır) */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setRoleSectionOpen((prev) => !prev)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SecurityIcon
                  sx={{ fontSize: '1.5rem', color: theme.palette.primary.main, mr: 1 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  Rol
                </Typography>
              </Box>
              <IconButton size="small">
                {roleSectionOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>
            </Box>

            <Collapse in={roleSectionOpen} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2 }}>
                {user?.roles && user.roles.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {user.roles.map((roleName) => {
                      const roleDetail = roles.find((r) => r.name === roleName);
                      return (
                        <Box
                          key={roleName}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          <Chip
                            label={roleName}
                            sx={{
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                              height: 32,
                            }}
                          />
                          {roleDetail?.districtId && roleDetail?.district ? (
                            <Chip
                              icon={<LocationOnIcon />}
                              label={`${roleDetail.district.name} (İlçe)`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{
                                fontSize: '0.7rem',
                                '& .MuiChip-icon': { fontSize: '0.9rem' },
                              }}
                            />
                          ) : roleDetail?.provinceId && roleDetail?.province ? (
                            <Chip
                              icon={<LocationOnIcon />}
                              label={`${roleDetail.province.name} (İl)`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{
                                fontSize: '0.7rem',
                                '& .MuiChip-icon': { fontSize: '0.9rem' },
                              }}
                            />
                          ) : null}
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: alpha(theme.palette.grey[500], 0.05),
                      border: `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}
                    >
                      Bu kullanıcıya henüz rol atanmamış.
                    </Typography>
                  </Paper>
                )}

                <Divider sx={{ my: 3 }} />

                {/* İzinler Bölümü */}
                <UserPermissionsSection permissions={user?.permissions} />
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* Üye Bilgileri - Eğer kullanıcının bir üye ilişkisi varsa */}
        {user.member && (
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              boxShadow: `0 4px 20px ${alpha(theme.palette.success.main, 0.08)}`,
              overflow: 'hidden',
              mb: 3,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BadgeIcon sx={{ fontSize: '1.5rem', color: theme.palette.success.main, mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                    Üye Bilgileri
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate(`/members/${user.member!.id}`)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: theme.palette.success.main,
                    color: theme.palette.success.main,
                    '&:hover': {
                      borderColor: theme.palette.success.dark,
                      backgroundColor: alpha(theme.palette.success.main, 0.08),
                    },
                  }}
                >
                  Üye Detayına Git
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 2.5,
                    borderRadius: 2,
                    background: alpha(theme.palette.success.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  }}
                >
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>
                    Ad Soyad
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    {user.member.firstName} {user.member.lastName}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 2.5,
                    borderRadius: 2,
                    background: alpha(theme.palette.success.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  }}
                >
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>
                    TC Kimlik No
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    {user.member.nationalId}
                  </Typography>
                </Paper>

                {user.member.registrationNumber && (
                  <Paper
                    elevation={0}
                    sx={{
                      flex: 1,
                      p: 2.5,
                      borderRadius: 2,
                      background: alpha(theme.palette.success.main, 0.04),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>
                      Üye Kayıt No
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      {user.member.registrationNumber}
                    </Typography>
                  </Paper>
                )}
              </Box>

              {(user.member.phone || user.member.email) && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    {user.member.phone && (
                      <Paper
                        elevation={0}
                        sx={{
                          flex: 1,
                          p: 2.5,
                          borderRadius: 2,
                          background: alpha(theme.palette.success.main, 0.04),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>
                          Telefon
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                          {user.member.phone}
                        </Typography>
                      </Paper>
                    )}

                    {user.member.email && (
                      <Paper
                        elevation={0}
                        sx={{
                          flex: 1,
                          p: 2.5,
                          borderRadius: 2,
                          background: alpha(theme.palette.success.main, 0.04),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>
                          E-posta (Üye)
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                          {user.member.email}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </>
              )}

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Üye Durumu:
                </Typography>
                <Chip
                  label={user.member.status === 'ACTIVE' ? 'Aktif Üye' : user.member.status === 'PENDING' ? 'Beklemede' : user.member.status === 'INACTIVE' ? 'Pasif' : user.member.status === 'RESIGNED' ? 'İstifa' : user.member.status === 'EXPELLED' ? 'İhraç' : 'Reddedildi'}
                  color={user.member.status === 'ACTIVE' ? 'success' : user.member.status === 'PENDING' ? 'warning' : 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Kullanıcı Scope'ları */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.info.main, 0.08)}`,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOnIcon sx={{ fontSize: '1.5rem', color: theme.palette.info.main, mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                    Yetki Alanları (Scope)
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Bu kullanıcı, aşağıdaki il / ilçe / işyeri / anlaşmalı kurumlar üzerinde yetkilidir.
                </Typography>
              </Box>

            </Box>

            {loadingScopes ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress size={40} />
              </Box>
            ) : !hasScopes ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 2,
                  background: alpha(theme.palette.grey[500], 0.05),
                  border: `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
                  textAlign: 'center',
                }}
              >
                <LocationOnIcon sx={{ fontSize: 48, color: alpha(theme.palette.grey[500], 0.3), mb: 2 }} />
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                  Bu kullanıcıya atanmış bir scope bulunmuyor.
                </Typography>
              </Paper>
            ) : (
              <Paper 
                elevation={0}
                sx={{ 
                  width: '100%', 
                  overflowX: 'auto',
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                      <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}>Tür</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: theme.palette.text.primary }}>Tanım</TableCell>
                      {isBranchManager && (
                        <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                          İşlemler
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scopes.map((s) => {
                      const formatted = formatScopeRow(s);
                      return (
                        <TableRow 
                          key={s.id}
                          sx={{
                            '&:hover': { 
                              bgcolor: alpha(theme.palette.info.main, 0.03),
                            },
                            transition: 'all 0.2s',
                          }}
                        >
                          <TableCell>
                            <Chip
                              label={formatted.type}
                              size="small"
                              sx={{
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.main,
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationOnIcon sx={{ fontSize: '1rem', color: theme.palette.text.secondary }} />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatted.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          {isBranchManager && (
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Düzenle" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => openScopeDialog(s)}
                                    sx={{
                                      color: theme.palette.primary.main,
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        transform: 'scale(1.1)',
                                      },
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Sil" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteScope(s.id)}
                                    sx={{
                                      color: theme.palette.error.main,
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                        transform: 'scale(1.1)',
                                      },
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </CardContent>
        </Card>

        {/* Scope Ekle Dialog */}
        <Dialog
          open={scopeDialogOpen}
          onClose={closeScopeDialog}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
            }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddLocationIcon sx={{ color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {editingScope ? 'Scope Düzenle' : 'Yeni Scope Ekle'}
              </Typography>
            </Box>
          </DialogTitle>
          <Divider />
          <DialogContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                background: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                En az bir alan (il veya ilçe) seçmelisiniz. Daha spesifik yetki
                vermek için il → ilçe şeklinde daraltabilirsiniz.
              </Typography>
            </Paper>

            <FormControl fullWidth>
              <InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOnIcon fontSize="small" />
                  İl
                </Box>
              </InputLabel>
              <Select
                label="İl"
                value={scopeForm.provinceId}
                onChange={(e) =>
                  handleScopeFormChange('provinceId', e.target.value as string)
                }
                sx={{
                  borderRadius: 2,
                  '&.Mui-focused': {
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                  },
                }}
              >
                <MenuItem value="">
                  <em>Seçilmedi</em>
                </MenuItem>
                {scopeProvinces.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!scopeForm.provinceId}>
              <InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOnIcon fontSize="small" />
                  İlçe
                </Box>
              </InputLabel>
              <Select
                label="İlçe"
                value={scopeForm.districtId}
                onChange={(e) =>
                  handleScopeFormChange('districtId', e.target.value as string)
                }
                sx={{
                  borderRadius: 2,
                  '&.Mui-focused': {
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                  },
                }}
              >
                <MenuItem value="">
                  <em>Seçilmedi</em>
                </MenuItem>
                {scopeDistricts.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button 
              onClick={closeScopeDialog} 
              disabled={scopeSaving}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleScopeSave}
              disabled={scopeSaving}
              variant="contained"
              startIcon={scopeSaving ? <CircularProgress size={16} /> : null}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                minWidth: 100,
              }}
            >
              {scopeSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogActions>
        </Dialog>

        <UserRolesDialog
          open={rolesDialogOpen}
          user={user}
          onClose={() => setRolesDialogOpen(false)}
          onSave={handleSaveRoles}
        />

        <Dialog
          open={headerEditOpen}
          onClose={() => !headerEditSaving && setHeaderEditOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Panel Kullanıcıyı Düzenle</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Rol, yetki alanı, email ve şifre bilgilerini bu pencereden güncelleyebilirsiniz.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select
                label="Rol"
                value={headerEditRoleId}
                onChange={(e) => setHeaderEditRoleId(e.target.value)}
              >
                {editableRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {editableRoles.find((r) => r.id === headerEditRoleId)?.hasScopeRestriction && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Yetki Alanları
                </Typography>
                <Stack spacing={1}>
                  {headerEditScopes.map((scope, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>İl</InputLabel>
                        <Select
                          label="İl"
                          value={scope.provinceId ?? ''}
                          onChange={async (e) => {
                            const provinceId = e.target.value || undefined;
                            const next = [...headerEditScopes];
                            next[index] = { provinceId, districtId: undefined };
                            setHeaderEditScopes(next);
                            await ensureHeaderEditDistrictsLoaded(provinceId);
                          }}
                        >
                          <MenuItem value="">
                            <em>İl Seçin</em>
                          </MenuItem>
                          {scopeProvinces.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small" disabled={!scope.provinceId}>
                        <InputLabel>İlçe</InputLabel>
                        <Select
                          label="İlçe"
                          value={scope.districtId ?? ''}
                          onChange={(e) => {
                            const next = [...headerEditScopes];
                            next[index] = {
                              ...next[index],
                              districtId: e.target.value || undefined,
                            };
                            setHeaderEditScopes(next);
                          }}
                        >
                          <MenuItem value="">
                            <em>Tüm İlçeler</em>
                          </MenuItem>
                          {(scope.provinceId
                            ? headerEditDistrictsMap[scope.provinceId] ?? []
                            : []
                          ).map((d) => (
                            <MenuItem key={d.id} value={d.id}>
                              {d.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {headerEditScopes.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() =>
                            setHeaderEditScopes((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Stack>
                <Button
                  size="small"
                  startIcon={<AddLocationIcon />}
                  sx={{ mt: 1, textTransform: 'none' }}
                  onClick={() =>
                    setHeaderEditScopes((prev) => [
                      ...prev,
                      { provinceId: undefined, districtId: undefined },
                    ])
                  }
                >
                  Yetki Alanı Ekle
                </Button>
              </Box>
            )}

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={headerEditEmail}
              onChange={(e) => setHeaderEditEmail(e.target.value)}
            />
            <TextField
              fullWidth
              label="Yeni Şifre (opsiyonel)"
              type={showHeaderEditPassword ? 'text' : 'password'}
              value={headerEditPassword}
              onChange={(e) => setHeaderEditPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowHeaderEditPassword((v) => !v)}
                      edge="end"
                      size="small"
                    >
                      {showHeaderEditPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Yeni Şifre Tekrar"
              type={showHeaderEditPasswordConfirm ? 'text' : 'password'}
              value={headerEditPasswordConfirm}
              onChange={(e) => setHeaderEditPasswordConfirm(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowHeaderEditPasswordConfirm((v) => !v)
                      }
                      edge="end"
                      size="small"
                    >
                      {showHeaderEditPasswordConfirm ? (
                        <VisibilityOff />
                      ) : (
                        <Visibility />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHeaderEditOpen(false)} disabled={headerEditSaving}>
              İptal
            </Button>
            <Button
              variant="contained"
              onClick={handleHeaderEditSave}
              disabled={headerEditSaving}
            >
              {headerEditSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={demoteDialogOpen}
          onClose={() => !demoteSubmitting && setDemoteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Panel erişimini kaldır</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              <strong>
                {user.firstName} {user.lastName}
              </strong>{' '}
              kullanıcısının panel hesabı kapatılacak; kişi yalnızca üye olarak kalacak.
              Devam edilsin mi?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDemoteDialogOpen(false)} disabled={demoteSubmitting}>
              Vazgeç
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => void handleConfirmDemoteToMember()}
              disabled={demoteSubmitting}
            >
              {demoteSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Evet, üyeliğe düşür'}
            </Button>
          </DialogActions>
        </Dialog>
      </PageLayout>
    </Fade>
  );
};

export default UserDetailPage;
