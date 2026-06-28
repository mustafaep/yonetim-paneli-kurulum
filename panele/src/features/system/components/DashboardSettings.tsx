import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import type { SystemSetting } from '../services/systemApi';

interface DashboardSettingsProps {
  settings?: SystemSetting[];
  onUpdate?: (key: string, value: string) => Promise<void>;
  loading?: boolean;
}

interface ToggleField {
  key: string;
  label: string;
  description: string;
}

const DashboardSettings: React.FC<DashboardSettingsProps> = ({
  settings = [],
  onUpdate,
  loading = false,
}) => {
  const theme = useTheme();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: false,
    detail: false,
  });

  const getSetting = (key: string): SystemSetting | undefined =>
    settings.find((s) => s.key === key);

  const getValue = (key: string): string =>
    localSettings[key] !== undefined ? localSettings[key] : getSetting(key)?.value || 'true';

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
      await Promise.all(keys.map((key) => onUpdate(key, localSettings[key])));
      setLocalSettings({});
    } finally {
      setSaving(null);
    }
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const hasUnsavedChanges = Object.keys(localSettings).length > 0;

  const renderFields = (fields: ToggleField[]) => (
    <Stack spacing={1.5}>
      {fields.map((field) => (
        <Box key={field.key}>
          <FormControlLabel
            control={
              <Switch
                checked={getValue(field.key) === 'true'}
                onChange={(e) => handleChange(field.key, e.target.checked ? 'true' : 'false')}
                disabled={!onUpdate || loading}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{field.label}</Typography>
                <Typography variant="caption" color="text.secondary">{field.description}</Typography>
              </Box>
            }
            sx={{ m: 0, width: '100%' }}
          />
          {localSettings[field.key] !== undefined && (
            <Box sx={{ mt: 0.5, ml: 5 }}>
              <Chip label="Kaydedilmemiş" size="small" color="warning" />
              <Button
                size="small"
                sx={{ ml: 1 }}
                startIcon={saving === field.key ? <CircularProgress size={14} /> : <SaveIcon />}
                onClick={() => handleSave(field.key)}
                disabled={saving === field.key}
              >
                Kaydet
              </Button>
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );

  return (
    <Stack spacing={3}>
      {hasUnsavedChanges && onUpdate && (
        <Alert
          severity="info"
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={saving === 'all' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
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

      <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box
          onClick={() => toggleSection('overview')}
          sx={{
            p: 2.5,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DashboardIcon sx={{ color: theme.palette.primary.main }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Genel Dashboard Alanları</Typography>
            </Box>
            <IconButton size="small">
              <ExpandMoreIcon sx={{ transform: expandedSections.overview ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
            </IconButton>
          </Box>
        </Box>
        <Collapse in={expandedSections.overview} timeout="auto" unmountOnExit>
          <Box sx={{ p: 3 }}>
            {renderFields([
              { key: 'DASHBOARD_SHOW_QUICK_ACTIONS', label: 'Hızlı Aksiyon Kartları', description: 'Sayfanın üstündeki hızlı aksiyon kartları' },
              { key: 'DASHBOARD_SHOW_STAT_CARDS', label: 'İstatistik Kartları', description: 'Bekleyen başvuru, aktif üye, tahsilat, kullanıcı kartları' },
              { key: 'DASHBOARD_SHOW_MEMBER_STATS', label: 'Üye İstatistikleri', description: 'Alt bölümdeki üye istatistik kartı' },
              { key: 'DASHBOARD_SHOW_USER_STATS', label: 'Kullanıcı İstatistikleri', description: 'Alt bölümdeki kullanıcı istatistik kartı' },
            ])}
          </Box>
        </Collapse>
      </Card>

      <Card elevation={0} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box
          onClick={() => toggleSection('detail')}
          sx={{
            p: 2.5,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.03)} 0%, ${alpha(theme.palette.success.light, 0.02)} 100%)`,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DashboardIcon sx={{ color: theme.palette.success.main }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Detay Dashboard Alanları</Typography>
            </Box>
            <IconButton size="small">
              <ExpandMoreIcon sx={{ transform: expandedSections.detail ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
            </IconButton>
          </Box>
        </Box>
        <Collapse in={expandedSections.detail} timeout="auto" unmountOnExit>
          <Box sx={{ p: 3 }}>
            {renderFields([
              { key: 'DASHBOARD_SHOW_RECENT_MEMBERS', label: 'Son Eklenen Üyeler', description: 'Son üye listesini göster' },
              { key: 'DASHBOARD_SHOW_RECENT_PAYMENTS', label: 'Son Kesintiler', description: 'Son kesinti listesini göster' },
              { key: 'DASHBOARD_SHOW_PAYMENT_STATS', label: 'Kesinti İstatistikleri', description: 'Tahsilat ve kesinti özet kartı' },
              { key: 'DASHBOARD_SHOW_APPLICATION_MANAGEMENT', label: 'Başvuru Yönetimi', description: 'Başvuru yönetimi kartını göster' },
            ])}
          </Box>
        </Collapse>
      </Card>
    </Stack>
  );
};

export default DashboardSettings;
