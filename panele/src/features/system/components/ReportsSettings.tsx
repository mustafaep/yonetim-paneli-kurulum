import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  useTheme,
  alpha,
  Button,
  Stack,
  Alert,
  Chip,
  Collapse,
  IconButton,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import type { SystemSetting } from '../services/systemApi';

interface ReportsSettingsProps {
  settings?: SystemSetting[];
  onUpdate?: (key: string, value: string) => Promise<void>;
  loading?: boolean;
}

interface ToggleField {
  key: string;
  label: string;
  description: string;
}

const cardSx = (theme: ReturnType<typeof useTheme>) => ({
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 2,
  overflow: 'hidden',
});

const ReportsSettings: React.FC<ReportsSettingsProps> = ({
  settings = [],
  onUpdate,
  loading = false,
}) => {
  const theme = useTheme();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: false,
    charts: false,
    details: false,
  });

  const getSetting = (key: string): SystemSetting | undefined =>
    settings.find((s) => s.key === key);

  const getValue = (key: string): string =>
    localSettings[key] !== undefined ? localSettings[key] : getSetting(key)?.value || 'true';

  const handleChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
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

  const hasUnsavedChanges = Object.keys(localSettings).length > 0;

  const renderToggleFields = (fields: ToggleField[]) => (
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
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {field.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {field.description}
                </Typography>
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

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('general')}
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
                    <AssessmentIcon sx={{ color: theme.palette.primary.main }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Genel Görünüm</Typography>
                </Box>
                <IconButton size="small">
                  <ExpandMoreIcon sx={{ transform: expandedSections.general ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.general} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>
                {renderToggleFields([
                  { key: 'REPORTS_SHOW_REFRESH_BUTTON', label: 'Yenile Butonu', description: 'Sayfa başlığındaki yenile butonu görünürlüğü' },
                  { key: 'REPORTS_SHOW_FILTER_PANEL', label: 'Filtre Paneli', description: 'İl/İlçe/Şube/Kurum filtrelerini göster' },
                  { key: 'REPORTS_SHOW_KPI_CARDS', label: 'KPI Kartları', description: 'Toplam üye, aktif üye, ayrılan üye, toplam kesinti kartları' },
                  { key: 'REPORTS_SHOW_TREND_CARDS', label: 'Trend Kartları', description: 'Son 30 gün trend kartları' },
                  { key: 'REPORTS_SHOW_ALERT_CARDS', label: 'Uyarı Kartları', description: 'Kesintisiz üyeler, bekleyen başvurular ve kayıp iller kartları' },
                ])}
              </Box>
            </Collapse>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('charts')}
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
                    <BarChartIcon sx={{ color: theme.palette.success.main }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Grafikler</Typography>
                </Box>
                <IconButton size="small">
                  <ExpandMoreIcon sx={{ transform: expandedSections.charts ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.charts} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>
                {renderToggleFields([
                  { key: 'REPORTS_SHOW_MEMBER_GROWTH_CHART', label: 'Üye Artış/Azalış Grafiği', description: 'Son 6 aylık üye hareketleri grafiği' },
                  { key: 'REPORTS_SHOW_MEMBER_STATUS_PIE', label: 'Üye Durum Dağılımı', description: 'Pasta grafiği görünürlüğü' },
                  { key: 'REPORTS_SHOW_PROVINCE_DISTRIBUTION_CHART', label: 'İl Bazlı Üye Dağılımı', description: 'Top 15 il dağılım grafiği görünürlüğü' },
                  { key: 'REPORTS_SHOW_DUES_CHART', label: 'Aylık Kesinti Grafiği', description: 'Aylık kesinti line chart görünürlüğü' },
                ])}
              </Box>
            </Collapse>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('details')}
              sx={{
                p: 2.5,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.03)} 0%, ${alpha(theme.palette.warning.light, 0.02)} 100%)`,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TableChartIcon sx={{ color: theme.palette.warning.dark }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>Detay Alanları</Typography>
                </Box>
                <IconButton size="small">
                  <ExpandMoreIcon sx={{ transform: expandedSections.details ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.details} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>
                {renderToggleFields([
                  { key: 'REPORTS_SHOW_DUES_SUMMARY_CARDS', label: 'Kesinti Özet Kartları', description: 'Kesinti yapan/yapmayan ve toplam kesinti özet kartları' },
                  { key: 'REPORTS_SHOW_REGION_TABLE', label: 'İl Bazlı Detaylı Rapor Tablosu', description: 'Alt kısım detay tablo görünürlüğü' },
                ])}
              </Box>
            </Collapse>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default ReportsSettings;
