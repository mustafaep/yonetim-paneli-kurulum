// src/pages/roles/RoleCreateEditPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormControl,
  FormLabel,
  Alert,
  Chip,
  useTheme,
  alpha,
  Paper,
  Collapse,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import LocationOnIcon from '@mui/icons-material/LocationOn';

import type {
  CustomRole,
  CreateRoleDto,
  UpdateRoleDto,
  Permission,
} from '../../../types/role';
import {
  getRoleById,
  createRole,
  updateRole,
  updateRolePermissions,
} from '../services/rolesApi';
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission as PermissionType,
} from '../../../types/role';
import {
  getAllDependencies,
  getMissingDependencies,
  getRequiredBy,
} from '../../../shared/utils/permissionDependencies';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const RoleCreateEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(
    new Set(),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Yetki alanı state'i
  const [hasScopeRestriction, setHasScopeRestriction] = useState(false);

  const normalizePermission = (permission: string): PermissionType | null => {
    if (permission === 'ACCOUNTING_VIEW') return 'TEVKIFAT_VIEW';
    if (permission === 'ACCOUNTING_EXPORT') return 'TEVKIFAT_EXPORT';
    return permission in PERMISSION_LABELS ? (permission as PermissionType) : null;
  };

  useEffect(() => {
    if (isEditMode && id) {
      const fetchRole = async () => {
        try {
          const role = await getRoleById(id);
          if (role.name === 'ADMIN') {
            setError('ADMIN rolü düzenlenemez. Bu bir sistem rolüdür.');
            setTimeout(() => navigate('/roles'), 2000);
            return;
          }
          setName(role.name);
            setDescription(role.description || '');
          setIsActive(role.isActive);
          const normalizedPermissions = role.permissions
            .map((permission) => normalizePermission(permission))
            .filter((permission): permission is PermissionType => permission !== null);
          setSelectedPermissions(new Set(normalizedPermissions));
          
          // Yetki alanı bilgilerini yükle
          if (role.hasScopeRestriction) {
            setHasScopeRestriction(true);
          }
          
          // Tüm grupları başlangıçta aç
          setExpandedGroups(new Set(Object.keys(PERMISSION_GROUPS)));
        } catch (e) {
          console.error('Rol alınırken hata:', e);
          setError('Rol bilgileri alınamadı');
        } finally {
          setLoading(false);
        }
      };
      fetchRole();
    } else {
      // Yeni rol oluştururken tüm grupları aç
      setExpandedGroups(new Set(Object.keys(PERMISSION_GROUPS)));
    }
  }, [id, isEditMode, navigate]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const handlePermissionToggle = (permission: Permission) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permission)) {
        // İzin kaldırılıyor - bağımlı izinleri kontrol et
        newSet.delete(permission);
        
        // Bu izni gerektiren diğer izinleri kontrol et
        const requiredBy = getRequiredBy(permission);
        requiredBy.forEach((reqBy) => {
          if (newSet.has(reqBy)) {
            // Eğer bu izni gerektiren başka bir izin seçiliyse, uyarı ver ama kaldırma
            // (Kullanıcı manuel olarak kaldırmak isterse kaldırabilir)
          }
        });
      } else {
        // İzin ekleniyor - bağımlı izinleri otomatik ekle
        newSet.add(permission);
        
        // Tüm bağımlı izinleri al ve ekle
        const dependencies = getAllDependencies(permission);
        dependencies.forEach((dep) => {
          newSet.add(dep);
        });
      }
      return newSet;
    });
  };

  const handleGroupToggle = (permissions: Permission[], checked: boolean) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      // MEMBER_LIST_BY_PROVINCE iznini filtrele (checkbox'ta gösterilmiyor)
      const filteredPermissions = permissions.filter(p => p !== 'MEMBER_LIST_BY_PROVINCE');
      if (checked) {
        filteredPermissions.forEach((p) => newSet.add(p));
      } else {
        filteredPermissions.forEach((p) => newSet.delete(p));
      }
      return newSet;
    });
  };


  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Rol adı gereklidir');
      return;
    }

    if (name.trim().toUpperCase() === 'ADMIN') {
      setError('ADMIN rolü oluşturulamaz. Bu bir sistem rolüdür.');
      return;
    }

    if (selectedPermissions.size === 0) {
      setError('En az bir izin seçmelisiniz');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const permissionsArray = Array.from(selectedPermissions)
        .map((permission) => normalizePermission(permission))
        .filter((permission): permission is PermissionType => permission !== null);

      if (isEditMode && id) {
        const updateDto: UpdateRoleDto = {
          name: name.trim(),
          description: description.trim() || undefined,
          isActive,
          hasScopeRestriction: hasScopeRestriction || undefined,
          // Scope'ları göndermiyoruz, sadece flag'i gönderiyoruz
        };
        await updateRole(id, updateDto);
        await updateRolePermissions(id, { permissions: permissionsArray });
      } else {
        const createDto: CreateRoleDto = {
          name: name.trim(),
          description: description.trim() || undefined,
          permissions: permissionsArray,
          hasScopeRestriction: hasScopeRestriction || undefined,
          // Scope'ları göndermiyoruz, sadece flag'i gönderiyoruz
        };
        await createRole(createDto);
      }

      navigate('/roles');
    } catch (e: unknown) {
      console.error('Rol kaydedilirken hata:', e);
      setError(getApiErrorMessage(e, 'Rol kaydedilirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const groupLabels: Record<string, string> = {
    USER_MANAGEMENT: 'Kullanıcı Yönetimi',
    ROLE_MANAGEMENT: 'Rol Yönetimi',
    MEMBER_MANAGEMENT: 'Üye Yönetimi',
    REGION_MANAGEMENT: 'Bölge Yönetimi',
    CONTENT_MANAGEMENT: 'İçerik Yönetimi',
    DOCUMENT_MANAGEMENT: 'Doküman Yönetimi',
    REPORTS: 'Raporlar',
    NOTIFICATIONS: 'Bildirimler',
    SYSTEM: 'Sistem',
    INSTITUTION_MANAGEMENT: 'Kurum Yönetimi',
    PROFESSION_MANAGEMENT: 'Meslek Yönetimi',
    ACCOUNTING: 'Tevkifat',
    MEMBER_PAYMENTS: 'Üye Kesintileri',
    APPROVALS: 'Onay Süreçleri',
    PANEL_USER_APPLICATIONS: 'Panel Kullanıcı Başvuruları',
    ADVANCES: 'Avanslar',
    INVOICES: 'Faturalar',
  };

  return (
    <PageLayout>
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/roles')}
          sx={{
            mb: 2,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
            },
          }}
        >
          Rollere Geri Dön
        </Button>
      </Box>
      <PageHeader
        icon={
          isEditMode ? (
            <EditIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />
          ) : (
            <AddCircleIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />
          )
        }
        title={isEditMode ? 'Rol Düzenle' : 'Yeni Rol Oluştur'}
        description={isEditMode
          ? 'Rol bilgilerini ve izinlerini güncelleyin'
          : 'Yeni bir rol oluşturun ve izinlerini belirleyin'}
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
      />

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 2,
            boxShadow: `0 2px 8px ${alpha(theme.palette.error.main, 0.15)}`,
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Rol Bilgileri Kartı */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AdminPanelSettingsIcon sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Rol Bilgileri
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Rol Adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                },
              }}
            />
            <TextField
              label="Açıklama"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                },
              }}
            />
            {isEditMode && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      sx={{
                        '&.Mui-checked': {
                          color: theme.palette.success.main,
                        },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontWeight: 500 }}>
                      Rolü Aktif Tut
                    </Typography>
                  }
                />
              </Paper>
            )}
          </Box>
        </Box>
      </Card>

      {/* İzinler Kartı */}
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
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.info.main, 0.02),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SecurityIcon sx={{ color: theme.palette.info.main }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                İzinler
              </Typography>
            </Box>
            <Chip
              label={`${selectedPermissions.size} izin seçildi`}
              icon={<SecurityIcon />}
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>
        <Box sx={{ p: 3 }}>
          {/* Eksik Bağımlılık Uyarısı */}
          {(() => {
            const allPermissions = Object.values(PERMISSION_GROUPS).flat() as Permission[];
            const missingDeps = getMissingDependencies(
              Array.from(selectedPermissions),
              allPermissions,
            );
            
            if (missingDeps.length > 0) {
              return (
                <Alert
                  severity="warning"
                  icon={<WarningIcon />}
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.warning.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    '& .MuiAlert-icon': {
                      color: theme.palette.warning.main,
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Eksik Bağımlı İzinler
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', mb: 1.5 }}>
                    Seçtiğiniz izinler için aşağıdaki bağımlı izinler otomatik olarak eklenecektir:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {missingDeps.map((dep) => (
                      <Chip
                        key={dep}
                        label={PERMISSION_LABELS[dep]}
                        size="small"
                        color="warning"
                        icon={<CheckCircleIcon />}
                        sx={{ fontWeight: 500 }}
                      />
                    ))}
                  </Box>
                </Alert>
              );
            }
            return null;
          })()}
          
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {Object.entries(PERMISSION_GROUPS).map(([groupKey, permissions]) => {
              // MEMBER_LIST_BY_PROVINCE iznini filtrele (checkbox'ta gösterilmiyor)
              const filteredPermissions = permissions.filter(p => p !== 'MEMBER_LIST_BY_PROVINCE');
              const allSelected = filteredPermissions.length > 0 && filteredPermissions.every((p) =>
                selectedPermissions.has(p),
              );
              const someSelected = filteredPermissions.some((p) =>
                selectedPermissions.has(p),
              );
              const isExpanded = expandedGroups.has(groupKey);

              return (
                <Box
                  key={groupKey}
                  sx={{
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.08)}`,
                    },
                  }}
                >
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: someSelected
                      ? alpha(theme.palette.primary.main, 0.04)
                      : alpha(theme.palette.grey[500], 0.02),
                    borderBottom: isExpanded ? `1px solid ${alpha(theme.palette.divider, 0.08)}` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: someSelected
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.grey[500], 0.04),
                    },
                  }}
                  onClick={() => toggleGroup(groupKey)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleGroupToggle(filteredPermissions, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          color: someSelected ? theme.palette.primary.main : theme.palette.text.primary,
                        }}
                      >
                        {groupLabels[groupKey] ?? groupKey}
                      </Typography>
                      <Chip
                        label={`${filteredPermissions.filter((p) => selectedPermissions.has(p)).length}/${filteredPermissions.length}`}
                        size="small"
                        color={someSelected ? 'primary' : 'default'}
                        sx={{ fontWeight: 600, ml: 1 }}
                      />
                    </Box>
                    {isExpanded ? (
                      <ExpandLessIcon sx={{ color: theme.palette.text.secondary }} />
                    ) : (
                      <ExpandMoreIcon sx={{ color: theme.palette.text.secondary }} />
                    )}
                  </Box>
                </Box>
                <Collapse in={isExpanded}>
                  <FormGroup sx={{ p: 2, pt: 1.5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {filteredPermissions.map((permission) => (
                        <React.Fragment key={permission}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1,
                              borderRadius: 1.5,
                              backgroundColor: selectedPermissions.has(permission)
                                ? alpha(theme.palette.primary.main, 0.04)
                                : 'transparent',
                              border: `1px solid ${
                                selectedPermissions.has(permission)
                                  ? alpha(theme.palette.primary.main, 0.2)
                                  : 'transparent'
                              }`,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                              },
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={selectedPermissions.has(permission)}
                                  onChange={() => handlePermissionToggle(permission)}
                                  sx={{
                                    '&.Mui-checked': {
                                      color: theme.palette.primary.main,
                                    },
                                  }}
                                />
                              }
                              label={
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                                      {PERMISSION_LABELS[permission]}
                                    </Typography>
                                    {(() => {
                                      const deps = getAllDependencies(permission);
                                      if (deps.length > 0) {
                                        return (
                                          <Chip
                                            label={`${deps.length} bağımlı`}
                                            size="small"
                                            sx={{
                                              height: 18,
                                              fontSize: '0.65rem',
                                              backgroundColor: alpha(theme.palette.info.main, 0.1),
                                              color: theme.palette.info.main,
                                              fontWeight: 600,
                                            }}
                                          />
                                        );
                                      }
                                      return null;
                                    })()}
                                  </Box>
                                  {(() => {
                                    const deps = getAllDependencies(permission);
                                    if (deps.length > 0 && selectedPermissions.has(permission)) {
                                      return (
                                        <Box sx={{ mt: 0.5 }}>
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              display: 'block',
                                              color: theme.palette.info.main,
                                              fontSize: '0.7rem',
                                              fontWeight: 500,
                                              mb: 0.5,
                                            }}
                                          >
                                            Otomatik eklenen bağımlı izinler:
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {deps.map((dep) => (
                                              <Chip
                                                key={dep}
                                                label={PERMISSION_LABELS[dep]}
                                                size="small"
                                                sx={{
                                                  height: 20,
                                                  fontSize: '0.65rem',
                                                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                                                  color: theme.palette.success.main,
                                                  fontWeight: 500,
                                                }}
                                                icon={<CheckCircleIcon sx={{ fontSize: '0.75rem !important' }} />}
                                              />
                                            ))}
                                          </Box>
                                        </Box>
                                      );
                                    }
                                    return null;
                                  })()}
                                </Box>
                              }
                              sx={{ m: 0, width: '100%' }}
                            />
                          </Paper>
                        </React.Fragment>
                      ))}
                    </Box>
                  </FormGroup>
                </Collapse>
              </Box>
            );
          })}
          </Box>
        </Box>
      </Card>

      {/* Yetki Alanı Seçimi Kartı */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
          mt: 3,
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.info.main, 0.02),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocationOnIcon sx={{ color: theme.palette.info.main }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Yetki Alanı Ayarları
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={hasScopeRestriction}
                onChange={(e) => {
                  setHasScopeRestriction(e.target.checked);
                }}
                sx={{
                  '&.Mui-checked': {
                    color: theme.palette.info.main,
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                  Bu role il/ilçe bazlı yetki alanı eklenecek
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bu seçenek işaretlendiğinde, kullanıcılara bu rol atandığında (panel kullanıcı başvurusu oluşturulurken veya onaylanırken) 
                  yetki alanı (il/ilçe) seçimi zorunlu olacaktır. Rol seviyesinde scope tanımlanmaz, 
                  scope'lar her kullanıcıya rol atanırken belirlenir.
                </Typography>
              </Box>
            }
          />

        </Box>
      </Card>

      {/* Alt Butonlar */}
      <Box
        sx={{
          mt: 3,
          p: 3,
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          gap: 2,
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <Button
          onClick={() => navigate('/roles')}
          disabled={saving}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            minWidth: 120,
          }}
        >
          İptal
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSubmit}
          disabled={saving || !name.trim() || selectedPermissions.size === 0}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            minWidth: 120,
            boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
            },
            '&.Mui-disabled': {
              backgroundColor: alpha(theme.palette.primary.main, 0.3),
              color: '#fff',
            },
          }}
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </Box>
    </PageLayout>
  );
};

export default RoleCreateEditPage;