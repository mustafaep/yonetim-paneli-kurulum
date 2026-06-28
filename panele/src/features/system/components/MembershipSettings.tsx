// src/pages/system/components/MembershipSettings.tsx
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  useTheme,
  alpha,
  Divider,
  Alert,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Fade,
  CircularProgress,
  Collapse,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SystemSetting } from '../services/systemApi';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';
import MemberGroupsManagement from './MemberGroupsManagement';

interface MembershipSettingsProps {
  settings: SystemSetting[];
  onUpdate?: (key: string, value: string) => Promise<void>;
  loading?: boolean;
  canManage?: boolean;
}

const cardSx = (theme: ReturnType<typeof useTheme>) => ({
  borderRadius: 4,
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.6)} 100%)`,
  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.06)}`,
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    boxShadow: `0 12px 48px ${alpha(theme.palette.common.black, 0.1)}`,
    transform: 'translateY(-2px)',
  },
});

const sectionHeaderSx = (
  theme: ReturnType<typeof useTheme>,
  color: string,
  darkColor: string,
) => ({
  p: { xs: 2.5, sm: 3 },
  pb: 2.5,
  background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(darkColor, 0.04)} 100%)`,
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
});

const iconBoxSx = (
  theme: ReturnType<typeof useTheme>,
  color: string,
  darkColor: string,
) => ({
  width: { xs: 40, sm: 44 },
  height: { xs: 40, sm: 44 },
  borderRadius: 2,
  background: `linear-gradient(135deg, ${color} 0%, ${darkColor} 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: `0 4px 16px ${alpha(color, 0.35)}`,
  transition: 'all 0.25s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: `0 6px 20px ${alpha(color, 0.45)}`,
  },
});

const MembershipSettings: React.FC<MembershipSettingsProps> = ({
  settings,
  onUpdate,
  loading = false,
  canManage = false,
}) => {
  const theme = useTheme();
  const { refreshSettings } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    application: false,
    regNumber: false,
    approvalFlow: false,
    lifecycle: false,
    requiredFields: false,
    memberGroups: false,
  });

  const getSetting = (key: string): SystemSetting | undefined => {
    return settings.find((s) => s.key === key);
  };

  const getValue = (key: string): string => {
    return localSettings[key] !== undefined
      ? localSettings[key]
      : getSetting(key)?.value || '';
  };

  const handleChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    if (!onUpdate || !canManage) {
      return;
    }
    setSaving(key);
    try {
      await onUpdate(key, getValue(key));
      setLocalSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await refreshSettings();
    } catch (error) {
      console.error('Ayar güncellenirken hata:', error);
      // Hata mesajı SystemSettingsPage'de gösteriliyor
      throw error;
    } finally {
      setSaving(null);
    }
  };

  const handleSaveMultiple = async (keys: string[]) => {
    const keysToSave = keys.filter((key) => localSettings[key] !== undefined);
    for (const key of keysToSave) {
      await handleSave(key);
    }
  };

  const handleSaveAll = async () => {
    if (!onUpdate || !canManage) return;
    
    const keys = Object.keys(localSettings);
    if (keys.length === 0) return;
    
    setSaving('all');
    try {
      const results = await Promise.allSettled(
        keys.map((key) => onUpdate(key, localSettings[key]))
      );
      
      const successfulKeys = keys.filter((key, index) => 
        results[index].status === 'fulfilled'
      );
      
      if (successfulKeys.length > 0) {
        setLocalSettings((prev) => {
          const next = { ...prev };
          successfulKeys.forEach((key) => delete next[key]);
          return next;
        });
        await refreshSettings();
      }
      
      const failedResults = results.filter((r) => r.status === 'rejected');
      if (failedResults.length > 0) {
        throw new Error(`${failedResults.length} ayar güncellenemedi`);
      }
    } catch (error) {
      console.error('Ayarlar güncellenirken hata:', error);
      throw error;
    } finally {
      setSaving(null);
    }
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const hasUnsavedChanges = Object.keys(localSettings).length > 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Fade in timeout={500}>
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {!canManage && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Bu ayarları değiştirmek için sistem ayarları yönetim yetkisine sahip olmanız gerekmektedir.
            </Alert>
          </Grid>
        )}
        {hasUnsavedChanges && onUpdate && canManage && (
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={2}
              sx={{
                position: 'sticky',
                top: 16,
                zIndex: 10,
                p: 2,
                borderRadius: 2,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.light, 0.04)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Kaydedilmemiş değişiklikler var
              </Typography>
              <Button
                variant="contained"
                size="medium"
                startIcon={saving === 'all' ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveAll}
                disabled={saving === 'all'}
                sx={{ borderRadius: 2, minWidth: 160 }}
              >
                {saving === 'all' ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
              </Button>
            </Paper>
          </Grid>
        )}
        {/* Başvuru Ayarları */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('application')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.primary.main, theme.palette.primary.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={iconBoxSx(theme, theme.palette.primary.main, theme.palette.primary.dark)}>
                  <AssignmentIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                    Başvuru Ayarları
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Üye başvuru süreçleri ve onay akışları
                  </Typography>
                </Box>
              </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('application');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.primary.main,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.application ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.application} timeout="auto" unmountOnExit>
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box
                sx={{
                  mb: 3,
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                }}
              >
              </Box>
              <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Minimum üyelik yaşı"
                value={getValue('MEMBERSHIP_MIN_AGE') || '18'}
                onChange={(e) => handleChange('MEMBERSHIP_MIN_AGE', e.target.value)}
                disabled={!canManage || loading}
                inputProps={{ min: 0, max: 120 }}
                helperText="Bu yaşın altındaki başvurular kabul edilmez. 0 = kontrol yok"
              />
              {localSettings['MEMBERSHIP_MIN_AGE'] !== undefined && (
                <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ mt: 0.5 }} />
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                İzin Verilen Başvuru Kaynakları
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {[
                    { value: 'DIRECT', label: 'Panelden Direkt' },
                    { value: 'OTHER', label: 'Diğer' },
                  ].map(({ value: source, label }) => {
                    const currentValue = getValue('MEMBERSHIP_ALLOWED_SOURCES');
                    const allowedSources = currentValue
                      ? currentValue.split(',').map((s) => s.trim()).filter((s) => s !== '')
                      : [];
                    // Boş liste = tüm kaynaklar izinli
                    const isChecked = allowedSources.length === 0 || allowedSources.includes(source);

                    return (
                      <FormControlLabel
                        key={source}
                        control={
                          <Switch
                            checked={isChecked}
                            onChange={(e) => {
                              const currentSources = currentValue
                                ? currentValue.split(',').map((s) => s.trim()).filter((s) => s !== '')
                                : [];
                              let newSources: string[];
                              if (e.target.checked) {
                                // Ekle
                                newSources = currentSources.includes(source)
                                  ? currentSources
                                  : [...currentSources, source];
                              } else {
                                // Çıkar
                                newSources = currentSources.filter((s) => s !== source);
                              }
                              handleChange('MEMBERSHIP_ALLOWED_SOURCES', newSources.join(','));
                            }}
                            disabled={!canManage || loading}
                          />
                        }
                        label={label}
                      />
                    );
                  })}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Hiçbiri seçili değilse tüm kaynaklar izinlidir
              </Typography>
              {localSettings['MEMBERSHIP_ALLOWED_SOURCES'] !== undefined && (
                <Chip label="Kaydedilmemiş" size="small" color="warning" />
              )}
            </Grid>
              </Grid>
              </Box>
            </Collapse>
          </Card>
        </Grid>
        {/* Kayıt Numarası Ayarları */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('regNumber')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.info.main, theme.palette.info.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={iconBoxSx(theme, theme.palette.info.main, theme.palette.info.dark)}>
                  <PeopleIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                    Üye Kayıt Numarası Ayarları
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Kayıt numarası oluşturma ve formatlama
                  </Typography>
                </Box>
              </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('regNumber');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.info.main,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': { backgroundColor: alpha(theme.palette.info.main, 0.08) },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.regNumber ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.regNumber} timeout="auto" unmountOnExit>
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={getValue('MEMBERSHIP_AUTO_GENERATE_REG_NUMBER') === 'true'}
                    onChange={(e) =>
                      handleChange(
                        'MEMBERSHIP_AUTO_GENERATE_REG_NUMBER',
                        e.target.checked ? 'true' : 'false',
                      )
                    }
                    disabled={!canManage || loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Kayıt Numarasını Otomatik Oluştur
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Aktif olduğunda yeni üyeler için kayıt numarası otomatik oluşturulur
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, width: '100%' }}
              />
              {localSettings['MEMBERSHIP_AUTO_GENERATE_REG_NUMBER'] !== undefined && (
                <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ mt: 1, ml: 5 }} />
              )}
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                label="Kayıt Numarası Öneki"
                value={getValue('MEMBERSHIP_REG_NUMBER_PREFIX')}
                onChange={(e) => handleChange('MEMBERSHIP_REG_NUMBER_PREFIX', e.target.value)}
                fullWidth
                size="small"
                helperText="Örn: UYE-2024-"
                placeholder="UYE"
                disabled={!canManage || loading}
              />
              {localSettings['MEMBERSHIP_REG_NUMBER_PREFIX'] !== undefined && (
                <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ mt: 0.5 }} />
              )}
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <FormControl fullWidth size="small">
                <InputLabel>Kayıt Numarası Formatı</InputLabel>
                <Select
                  value={getValue('MEMBERSHIP_REG_NUMBER_FORMAT') || 'SEQUENTIAL'}
                  label="Kayıt Numarası Formatı"
                  onChange={(e) => handleChange('MEMBERSHIP_REG_NUMBER_FORMAT', e.target.value)}
                  disabled={!canManage || loading}
                >
                  <MenuItem value="SEQUENTIAL">Sıralı Numaralandırma (1, 2, 3...)</MenuItem>
                  <MenuItem value="YEAR_SEQUENTIAL">Yıl + Sıralı (2024-001, 2024-002...)</MenuItem>
                  <MenuItem value="PREFIX_SEQUENTIAL">Önek + Sıralı (UYE-001, UYE-002...)</MenuItem>
                  <MenuItem value="PREFIX_YEAR_SEQUENTIAL">
                    Önek + Yıl + Sıralı (UYE-2024-001...)
                  </MenuItem>
                </Select>
              </FormControl>
              {localSettings['MEMBERSHIP_REG_NUMBER_FORMAT'] !== undefined && (
                <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ mt: 0.5 }} />
              )}
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <TextField
                label="Başlangıç Numarası"
                type="number"
                value={getValue('MEMBERSHIP_REG_NUMBER_START') || '1'}
                onChange={(e) => handleChange('MEMBERSHIP_REG_NUMBER_START', e.target.value)}
                fullWidth
                size="small"
                helperText="Sıralı numaralandırmanın başlangıç değeri"
                disabled={!canManage || loading}
              />
              {localSettings['MEMBERSHIP_REG_NUMBER_START'] !== undefined && (
                <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ mt: 0.5 }} />
              )}
            </Grid>
              </Grid>
              </Box>
            </Collapse>
          </Card>
        </Grid>
        {/* Onay Akışı Ayarları */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('approvalFlow')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.success.main, theme.palette.success.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={iconBoxSx(theme, theme.palette.success.main, theme.palette.success.dark)}>
                  <AccountTreeIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                    Onay Akışı Ayarları
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Üyelik onay süreçleri ve gereksinimleri
                  </Typography>
                </Box>
              </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('approvalFlow');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.success.main,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.08) },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.approvalFlow ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.approvalFlow} timeout="auto" unmountOnExit>
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Stack spacing={2.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={getValue('MEMBERSHIP_REQUIRE_APPROVAL') === 'true'}
                  onChange={(e) =>
                    handleChange('MEMBERSHIP_REQUIRE_APPROVAL', e.target.checked ? 'true' : 'false')
                  }
                  disabled={!canManage || loading}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Üyelik Onayı Zorunlu
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Aktif olduğunda tüm üyelikler onay gerektirir
                  </Typography>
                </Box>
              }
              sx={{ m: 0, width: '100%' }}
            />
            {localSettings['MEMBERSHIP_REQUIRE_APPROVAL'] !== undefined && (
              <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
            )}

            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={getValue('MEMBERSHIP_REQUIRE_BOARD_DECISION') === 'true'}
                  onChange={(e) =>
                    handleChange(
                      'MEMBERSHIP_REQUIRE_BOARD_DECISION',
                      e.target.checked ? 'true' : 'false',
                    )
                  }
                  disabled={!canManage || loading}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Yönetim Kurulu Kararı Zorunlu
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Onay için yönetim kurulu kararı bilgileri gerekir
                  </Typography>
                </Box>
              }
              sx={{ m: 0, width: '100%' }}
            />
            {localSettings['MEMBERSHIP_REQUIRE_BOARD_DECISION'] !== undefined && (
              <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
            )}

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Onay akışı aktif olduğunda, üye başvuruları onaylanana kadar PENDING durumunda kalır.
            </Alert>
              </Stack>
              </Box>
            </Collapse>
          </Card>
        </Grid>
        {/* Üyelik Yaşam Döngüsü */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('lifecycle')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.warning.main, theme.palette.warning.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={iconBoxSx(theme, theme.palette.warning.main, theme.palette.warning.dark)}>
                  <DescriptionIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                    Üyelik Yaşam Döngüsü Ayarları
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Üyelik iptali ve yeniden kayıt ayarları
                  </Typography>
                </Box>
              </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('lifecycle');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.warning.dark,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': { backgroundColor: alpha(theme.palette.warning.main, 0.08) },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.lifecycle ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.lifecycle} timeout="auto" unmountOnExit>
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Stack spacing={2.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={getValue('MEMBERSHIP_ALLOW_CANCELLATION') === 'true'}
                  onChange={(e) =>
                    handleChange('MEMBERSHIP_ALLOW_CANCELLATION', e.target.checked ? 'true' : 'false')
                  }
                  disabled={!canManage || loading}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Üyelik İptaline İzin Ver
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Aktif olduğunda üyelik iptali yapılabilir
                  </Typography>
                </Box>
              }
              sx={{ m: 0, width: '100%' }}
            />
            {localSettings['MEMBERSHIP_ALLOW_CANCELLATION'] !== undefined && (
              <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
            )}

            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={getValue('MEMBERSHIP_ALLOW_RE_REGISTRATION') === 'true'}
                  onChange={(e) =>
                    handleChange('MEMBERSHIP_ALLOW_RE_REGISTRATION', e.target.checked ? 'true' : 'false')
                  }
                  disabled={!canManage || loading}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Yeniden Kayıt Olmaya İzin Ver
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Daha önce iptal edilmiş üyelerin yeniden kayıt olmasına izin ver
                  </Typography>
                </Box>
              }
              sx={{ m: 0, width: '100%' }}
            />
            {localSettings['MEMBERSHIP_ALLOW_RE_REGISTRATION'] !== undefined && (
              <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
            )}

            <Divider />

            <TextField
              label="Varsayılan İptal Sebepleri (Virgülle Ayırın)"
              value={getValue('MEMBERSHIP_DEFAULT_CANCELLATION_REASONS')}
              onChange={(e) =>
                handleChange('MEMBERSHIP_DEFAULT_CANCELLATION_REASONS', e.target.value)
              }
              fullWidth
              size="small"
              multiline
              rows={3}
              helperText="Örn: İstifa, Vefat, İhraç, Diğer"
              placeholder="İstifa, Vefat, İhraç, Diğer"
              disabled={!canManage || loading}
            />
            {localSettings['MEMBERSHIP_DEFAULT_CANCELLATION_REASONS'] !== undefined && (
              <Chip label="Kaydedilmemiş" size="small" color="warning" />
            )}
              </Stack>
              </Box>
            </Collapse>
          </Card>
        </Grid>
        {/* Zorunlu Alanlar */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('requiredFields')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.secondary.main, theme.palette.secondary.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={iconBoxSx(theme, theme.palette.secondary.main, theme.palette.secondary.dark)}>
                  <AssignmentIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                    Başvuru Zorunlu Alanları
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Üye başvurusunda hangi alanların zorunlu olduğunu belirleyin
                  </Typography>
                </Box>
              </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('requiredFields');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.secondary.main,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': { backgroundColor: alpha(theme.palette.secondary.main, 0.08) },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.requiredFields ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.requiredFields} timeout="auto" unmountOnExit>
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Aşağıdaki alanlar üye başvurusu için her zaman zorunludur: TC Kimlik No, Ad, Soyad,
            Çalıştığı İl, Çalıştığı İlçe, Kurum, Kadro Ünvanı, Bağlı Olduğu Şube
          </Alert>

          <Grid container spacing={2.5}>
              {[
                { key: 'MEMBERSHIP_REQUIRE_MOTHER_NAME', label: 'Anne Adı' },
                { key: 'MEMBERSHIP_REQUIRE_FATHER_NAME', label: 'Baba Adı' },
                { key: 'MEMBERSHIP_REQUIRE_BIRTHPLACE', label: 'Doğum Yeri' },
                { key: 'MEMBERSHIP_REQUIRE_GENDER', label: 'Cinsiyet' },
                { key: 'MEMBERSHIP_REQUIRE_EDUCATION', label: 'Öğrenim Durumu' },
                { key: 'MEMBERSHIP_REQUIRE_PHONE', label: 'Telefon' },
                { key: 'MEMBERSHIP_REQUIRE_EMAIL', label: 'E-posta' },
                { key: 'MEMBERSHIP_REQUIRE_PROVINCE_DISTRICT', label: 'İkamet İl/İlçe' },
                { key: 'MEMBERSHIP_REQUIRE_INSTITUTION_REG_NO', label: 'Kurum Sicil No' },
                { key: 'MEMBERSHIP_REQUIRE_WORK_UNIT', label: 'Görev Birimi' },
            ].map((field) => (
              <Grid
                key={field.key}
                size={{
                  xs: 12,
                  sm: 6,
                  md: 4
                }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={getValue(field.key) === 'true'}
                      onChange={(e) => handleChange(field.key, e.target.checked ? 'true' : 'false')}
                      disabled={!canManage || loading}
                    />
                  }
                  label={field.label}
                />
                {localSettings[field.key] !== undefined && (
                  <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 4, mt: 0.5 }} />
                )}
              </Grid>
            ))}
              </Grid>
              </Box>
            </Collapse>
          </Card>
        </Grid>
        {/* Üye Grupları Yönetimi */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('memberGroups')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.primary.main, theme.palette.primary.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={iconBoxSx(theme, theme.palette.primary.main, theme.palette.primary.dark)}>
                    <PeopleIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                      Üye Grupları Yönetimi
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      Üye gruplarını listeleyin, düzenleyin ve yönetin
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('memberGroups');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.primary.main,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.memberGroups ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.memberGroups} timeout="auto" unmountOnExit>
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                <MemberGroupsManagement canManage={canManage} />
              </Box>
            </Collapse>
          </Card>
        </Grid>
      </Grid>
    </Fade>
  );
};

export default MembershipSettings;