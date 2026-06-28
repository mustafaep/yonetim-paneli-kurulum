// src/features/system/components/MaintenanceSettings.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  useTheme,
  alpha,
  Divider,
  Button,
  Stack,
  Alert,
  MenuItem,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import BugReportIcon from '@mui/icons-material/BugReport';
import StorageIcon from '@mui/icons-material/Storage';
import InfoIcon from '@mui/icons-material/Info';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SystemSetting } from '../services/systemApi';

interface MaintenanceSettingsProps {
  settings?: SystemSetting[];
  onUpdate?: (key: string, value: string) => Promise<void>;
  loading?: boolean;
}

const MaintenanceSettings: React.FC<MaintenanceSettingsProps> = ({
  settings = [],
  onUpdate,
  loading = false,
}) => {
  const theme = useTheme();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    systemInfo: false,
    uploadLimits: false,
    developer: false,
    info: false,
  });

  const getSetting = (key: string): SystemSetting | undefined =>
    settings.find((s) => s.key === key);

  const getDefaultValue = (key: string): string => {
    const defaults: Record<string, string> = {
      MAINTENANCE_DEBUG_MODE: 'false',
      MAINTENANCE_LOG_LEVEL: 'warn',
      MAINTENANCE_MAX_UPLOAD_SIZE_MB: '10',
    };
    return defaults[key] ?? '';
  };

  const getValue = (key: string): string => {
    if (localSettings[key] !== undefined) return localSettings[key];
    return getSetting(key)?.value ?? getDefaultValue(key);
  };

  const handleChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    if (!onUpdate) return;
    setSaving(key);
    try {
      await onUpdate(key, getValue(key));
      setLocalSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    if (!onUpdate) return;
    const keys = Object.keys(localSettings);
    if (keys.length === 0) return;
    setSaving('all');
    try {
      const results = await Promise.allSettled(
        keys.map((key) => onUpdate(key, localSettings[key])),
      );
      const successfulKeys = keys.filter((_, i) => results[i].status === 'fulfilled');
      if (successfulKeys.length > 0) {
        setLocalSettings((prev) => {
          const next = { ...prev };
          successfulKeys.forEach((key) => delete next[key]);
          return next;
        });
      }
    } finally {
      setSaving(null);
    }
  };

  const hasUnsavedChanges = Object.keys(localSettings).length > 0;
  const isDisabled = !onUpdate || loading;
  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const cardHeaderSx = {
    p: 2.5,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  };

  const iconBoxSx = (color: string, darkColor: string) => ({
    width: 36,
    height: 36,
    borderRadius: 1.5,
    background: `linear-gradient(135deg, ${color} 0%, ${darkColor} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  });

  const systemVersion = getSetting('SYSTEM_VERSION')?.value ?? '—';
  const environment = getSetting('ENVIRONMENT')?.value ?? '—';
  const siteName = getSetting('SITE_NAME')?.value ?? '—';

  return (
    <Stack spacing={3}>
      {hasUnsavedChanges && onUpdate && (
        <Alert
          severity="info"
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={
                saving === 'all' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
              }
              onClick={handleSaveAll}
              disabled={saving === 'all'}
            >
              {saving === 'all' ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
            </Button>
          }
        >
          Kaydedilmemiş değişiklikler var
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Sistem Bilgileri */}
        <Grid size={12}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box
              onClick={() => toggleSection('systemInfo')}
              sx={{
                ...cardHeaderSx,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.03)} 0%, ${alpha(theme.palette.info.light, 0.02)} 100%)`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={iconBoxSx(theme.palette.info.main, theme.palette.info.dark)}>
                    <InfoIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      Sistem Bilgileri
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mevcut sistem durumu ve sürüm bilgisi
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('systemInfo');
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.systemInfo ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.systemInfo} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>
              <Grid container spacing={2}>
                {[
                  { label: 'Sistem Adı', value: siteName },
                  { label: 'Sürüm', value: systemVersion },
                  {
                    label: 'Ortam',
                    value: environment,
                    chip: environment === 'production'
                      ? { label: 'Canlı', color: 'success' as const }
                      : environment === 'development'
                      ? { label: 'Geliştirme', color: 'warning' as const }
                      : environment === 'staging'
                      ? { label: 'Test', color: 'info' as const }
                      : null,
                  },
                ].map((item) => (
                  <Grid size={{ xs: 12, sm: 4 }} key={item.label}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 1.5,
                        backgroundColor: alpha(theme.palette.action.hover, 0.04),
                        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {item.label}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.value}
                        </Typography>
                        {item.chip && (
                          <Chip label={item.chip.label} color={item.chip.color} size="small" />
                        )}
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              </Box>
            </Collapse>
          </Card>
        </Grid>

        {/* Dosya Yükleme Limiti */}
        <Grid size={{ xs: 12, md: 12 }}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
              overflow: 'hidden',
              height: '100%',
            }}
          >
            <Box
              onClick={() => toggleSection('uploadLimits')}
              sx={{
                ...cardHeaderSx,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={iconBoxSx(theme.palette.primary.main, theme.palette.primary.dark)}>
                    <StorageIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      Dosya Yükleme Limitleri
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sisteme yüklenebilecek dosya boyutu sınırı
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('uploadLimits');
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.uploadLimits ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.uploadLimits} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <TextField
                  label="Maksimum Dosya Yükleme Boyutu"
                  type="number"
                  value={getValue('MAINTENANCE_MAX_UPLOAD_SIZE_MB')}
                  onChange={(e) => handleChange('MAINTENANCE_MAX_UPLOAD_SIZE_MB', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={isDisabled}
                  helperText={
                    getSetting('MAINTENANCE_MAX_UPLOAD_SIZE_MB')?.description ||
                    'Logo, antetli kağıt ve belge yüklemelerinde uygulanır'
                  }
                  InputProps={{
                    endAdornment: <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem', pr: 1 }}>MB</Box>,
                  }}
                  inputProps={{ min: 1, max: 500 }}
                />
                {localSettings['MAINTENANCE_MAX_UPLOAD_SIZE_MB'] !== undefined && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      saving === 'MAINTENANCE_MAX_UPLOAD_SIZE_MB' ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    onClick={() => handleSave('MAINTENANCE_MAX_UPLOAD_SIZE_MB')}
                    disabled={saving === 'MAINTENANCE_MAX_UPLOAD_SIZE_MB'}
                    sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
                  >
                    {saving === 'MAINTENANCE_MAX_UPLOAD_SIZE_MB' ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                )}
              </Stack>
              </Box>
            </Collapse>
          </Card>
        </Grid>

        {/* Geliştirici Ayarları */}
        <Grid size={{ xs: 12, md: 12 }}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
              overflow: 'hidden',
              height: '100%',
            }}
          >
            <Box
              onClick={() => toggleSection('developer')}
              sx={{
                ...cardHeaderSx,
                background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.light, 0.02)} 100%)`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={iconBoxSx(theme.palette.secondary.main, theme.palette.secondary.dark)}>
                    <BugReportIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      Geliştirici Ayarları
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Debug modu ve log seviyesi
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('developer');
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.developer ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.developer} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={getValue('MAINTENANCE_DEBUG_MODE') === 'true'}
                      onChange={(e) =>
                        handleChange(
                          'MAINTENANCE_DEBUG_MODE',
                          e.target.checked ? 'true' : 'false',
                        )
                      }
                      disabled={isDisabled}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Debug Modu
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getSetting('MAINTENANCE_DEBUG_MODE')?.description ||
                          'Ayrıntılı hata ve debug bilgilerini göster'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
                {localSettings['MAINTENANCE_DEBUG_MODE'] !== undefined && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      saving === 'MAINTENANCE_DEBUG_MODE' ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    onClick={() => handleSave('MAINTENANCE_DEBUG_MODE')}
                    disabled={saving === 'MAINTENANCE_DEBUG_MODE'}
                    sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
                  >
                    {saving === 'MAINTENANCE_DEBUG_MODE' ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                )}

                {getValue('MAINTENANCE_DEBUG_MODE') === 'true' && (
                  <Alert severity="warning">
                    Debug modu aktif. Canlı ortamda kullanımı önerilmez.
                  </Alert>
                )}

                <Divider />

                <TextField
                  label="Log Seviyesi"
                  select
                  value={getValue('MAINTENANCE_LOG_LEVEL')}
                  onChange={(e) => handleChange('MAINTENANCE_LOG_LEVEL', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={isDisabled}
                  helperText={
                    getSetting('MAINTENANCE_LOG_LEVEL')?.description ||
                    'Sistemin hangi seviyede log kaydedeceği'
                  }
                >
                  <MenuItem value="error">Sadece Hatalar (error)</MenuItem>
                  <MenuItem value="warn">Uyarı ve Hatalar (warn)</MenuItem>
                  <MenuItem value="info">Bilgi, Uyarı ve Hatalar (info)</MenuItem>
                  <MenuItem value="debug">Tüm Loglar (debug)</MenuItem>
                </TextField>
                {localSettings['MAINTENANCE_LOG_LEVEL'] !== undefined && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      saving === 'MAINTENANCE_LOG_LEVEL' ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )
                    }
                    onClick={() => handleSave('MAINTENANCE_LOG_LEVEL')}
                    disabled={saving === 'MAINTENANCE_LOG_LEVEL'}
                    sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
                  >
                    {saving === 'MAINTENANCE_LOG_LEVEL' ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                )}
              </Stack>
              </Box>
            </Collapse>
          </Card>
        </Grid>

        {/* Bilgilendirme */}
        <Grid size={{ xs: 12, md: 12 }}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box
              onClick={() => toggleSection('info')}
              sx={{
                ...cardHeaderSx,
                background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.03)} 0%, ${alpha(theme.palette.warning.light, 0.02)} 100%)`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={iconBoxSx(theme.palette.warning.main, theme.palette.warning.dark)}>
                    <AssessmentIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      Bakım Modu Bilgilendirme
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Bakım modu kullanım bilgileri
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('info');
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.info ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.info} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>
                <Alert severity="info" icon={<AssessmentIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Bakım Modu
                  </Typography>
                  <Typography variant="body2">
                    Sistemin bakım modunu aktifleştirmek için <strong>Genel Sistem</strong> sekmesindeki{' '}
                    <strong>Bakım Modu</strong> kartını kullanabilirsiniz.
                  </Typography>
                </Alert>
              </Box>
            </Collapse>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default MaintenanceSettings;
