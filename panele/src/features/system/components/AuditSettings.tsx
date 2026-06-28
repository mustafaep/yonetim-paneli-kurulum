// src/pages/system/components/AuditSettings.tsx
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
  Chip,
  Alert,
  InputAdornment,
  MenuItem,
  Collapse,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import StorageIcon from '@mui/icons-material/Storage';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SystemSetting } from '../services/systemApi';

interface AuditSettingsProps {
  settings?: SystemSetting[];
  onUpdate?: (key: string, value: string) => Promise<void>;
  loading?: boolean;
}

const AuditSettings: React.FC<AuditSettingsProps> = ({
  settings = [],
  onUpdate,
  loading = false,
}) => {
  const theme = useTheme();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    logSettings: false,
    monitoring: false,
    info: false,
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
    if (!onUpdate) return;
    
    setSaving(key);
    try {
      await onUpdate(key, getValue(key));
      setLocalSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (error) {
      console.error('Ayar güncellenirken hata:', error);
      throw error;
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    if (!onUpdate) return;
    
    const keys = Object.keys(localSettings);
    setSaving('all');
    try {
      await Promise.all(keys.map((key) => onUpdate(key, localSettings[key])));
      setLocalSettings({});
    } catch (error) {
      console.error('Ayarlar güncellenirken hata:', error);
    } finally {
      setSaving(null);
    }
  };

  const hasUnsavedChanges = Object.keys(localSettings).length > 0;
  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  return (
    <Stack spacing={3}>
      {/* Üst Aksiyon Bölümü */}
      {hasUnsavedChanges && onUpdate && (
        <Alert 
          severity="info"
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
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
        {/* Loglama Ayarları */}
        <Grid
          size={{
            xs: 12,
            md: 12
          }}>
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
              onClick={() => toggleSection('logSettings')}
              sx={{
                p: 2.5,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HistoryIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      Loglama Ayarları
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sistem loglarının yönetimi
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('logSettings');
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.logSettings ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.logSettings} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>

              <Stack spacing={2.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={getValue('AUDIT_LOG_ENABLED') === 'true'}
                      onChange={(e) =>
                        handleChange('AUDIT_LOG_ENABLED', e.target.checked ? 'true' : 'false')
                      }
                      disabled={!onUpdate || loading}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Audit Log Aktif
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getSetting('AUDIT_LOG_ENABLED')?.description || 'Sistem olaylarını logla'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
                {localSettings['AUDIT_LOG_ENABLED'] !== undefined && (
                  <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
                )}

                <Divider />

                <TextField
                  label="Log Saklama Süresi"
                  select
                  value={getValue('AUDIT_LOG_RETENTION_DAYS') || '365'}
                  onChange={(e) => handleChange('AUDIT_LOG_RETENTION_DAYS', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!onUpdate || loading}
                  helperText={getSetting('AUDIT_LOG_RETENTION_DAYS')?.description || 'Logların saklanacağı süre'}
                >
                  <MenuItem value="30">30 Gün</MenuItem>
                  <MenuItem value="90">90 Gün</MenuItem>
                  <MenuItem value="180">180 Gün</MenuItem>
                  <MenuItem value="365">1 Yıl</MenuItem>
                  <MenuItem value="730">2 Yıl</MenuItem>
                  <MenuItem value="1095">3 Yıl</MenuItem>
                  <MenuItem value="0">Sınırsız</MenuItem>
                </TextField>
                {localSettings['AUDIT_LOG_RETENTION_DAYS'] !== undefined && (
                  <Chip label="Kaydedilmemiş" size="small" color="warning" />
                )}

                <TextField
                  label="Maksimum Log Kayıt Sayısı"
                  type="number"
                  value={getValue('AUDIT_LOG_MAX_RECORDS') || '100000'}
                  onChange={(e) => handleChange('AUDIT_LOG_MAX_RECORDS', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!onUpdate || loading}
                  helperText={getSetting('AUDIT_LOG_MAX_RECORDS')?.description || 'Maksimum log kayıt sayısı (0 = sınırsız)'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">kayıt</InputAdornment>,
                  }}
                />
                {localSettings['AUDIT_LOG_MAX_RECORDS'] !== undefined && (
                  <Chip label="Kaydedilmemiş" size="small" color="warning" />
                )}
              </Stack>
              </Box>
            </Collapse>
          </Card>
        </Grid>

        {/* İzleme ve Güvenlik */}
        <Grid
          size={{
            xs: 12,
            md: 12
          }}>
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
              onClick={() => toggleSection('monitoring')}
              sx={{
                p: 2.5,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.light, 0.02)} 100%)`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <VisibilityIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      İzleme Ayarları
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hangi olayların loglanacağı
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('monitoring');
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.monitoring ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.monitoring} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>

              <Stack spacing={2.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={getValue('AUDIT_LOG_USER_ACTIONS') === 'true'}
                      onChange={(e) =>
                        handleChange('AUDIT_LOG_USER_ACTIONS', e.target.checked ? 'true' : 'false')
                      }
                      disabled={!onUpdate || loading}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Kullanıcı İşlemlerini Logla
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getSetting('AUDIT_LOG_USER_ACTIONS')?.description || 'Kullanıcı işlemlerini kaydet'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
                {localSettings['AUDIT_LOG_USER_ACTIONS'] !== undefined && (
                  <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={getValue('AUDIT_LOG_SYSTEM_CHANGES') === 'true'}
                      onChange={(e) =>
                        handleChange('AUDIT_LOG_SYSTEM_CHANGES', e.target.checked ? 'true' : 'false')
                      }
                      disabled={!onUpdate || loading}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Sistem Değişikliklerini Logla
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getSetting('AUDIT_LOG_SYSTEM_CHANGES')?.description || 'Sistem ayarı değişikliklerini kaydet'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
                {localSettings['AUDIT_LOG_SYSTEM_CHANGES'] !== undefined && (
                  <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={getValue('AUDIT_LOG_SECURITY_EVENTS') === 'true'}
                      onChange={(e) =>
                        handleChange('AUDIT_LOG_SECURITY_EVENTS', e.target.checked ? 'true' : 'false')
                      }
                      disabled={!onUpdate || loading}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Güvenlik Olaylarını Logla
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getSetting('AUDIT_LOG_SECURITY_EVENTS')?.description || 'Giriş, çıkış ve güvenlik olaylarını kaydet'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
                {localSettings['AUDIT_LOG_SECURITY_EVENTS'] !== undefined && (
                  <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={getValue('AUDIT_LOG_DATA_ACCESS') === 'true'}
                      onChange={(e) =>
                        handleChange('AUDIT_LOG_DATA_ACCESS', e.target.checked ? 'true' : 'false')
                      }
                      disabled={!onUpdate || loading}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Veri Erişimini Logla
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getSetting('AUDIT_LOG_DATA_ACCESS')?.description || 'Hassas veri erişimlerini kaydet'}
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
                {localSettings['AUDIT_LOG_DATA_ACCESS'] !== undefined && (
                  <Chip label="Kaydedilmemiş" size="small" color="warning" sx={{ ml: 5 }} />
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
                p: 2.5,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.03)} 0%, ${alpha(theme.palette.info.light, 0.02)} 100%)`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SecurityIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                      Log Görüntüleme
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sistem logları hakkında bilgilendirme
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
                <Alert severity="info" icon={<HistoryIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Log Görüntüleme
                  </Typography>
                  <Typography variant="body2">
                    Sistem loglarını görüntülemek için <strong>Sistem Logları</strong> sayfasını kullanabilirsiniz.
                    Loglar burada belirlenen saklama süresi ve maksimum kayıt sayısına göre otomatik olarak temizlenir.
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

export default AuditSettings;

