// src/features/system/components/GeneralSettings.tsx
import React, { useState, useRef } from 'react';
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
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Fade,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import BusinessIcon from '@mui/icons-material/Business';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import BuildIcon from '@mui/icons-material/Build';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SystemSetting } from '../services/systemApi';
import { uploadHeaderPaper } from '../services/systemApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';
import { DraftPdfCanvasPreview } from '../../documents/components/DraftPdfCanvasPreview';

interface GeneralSettingsProps {
  settings: SystemSetting[];
  onUpdate: (key: string, value: string) => Promise<void>;
  loading?: boolean;
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

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onUpdate,
  loading = false,
}) => {
  const theme = useTheme();
  const toast = useToast();
  const { refreshSettings } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadingHeaderPaper, setUploadingHeaderPaper] = useState(false);
  const headerPaperInputRef = useRef<HTMLInputElement>(null);
  // Antetli kağıt görüntüleme (PDF/resim - diğer sayfalardaki blob + embed/img mantığı)
  const [headerPaperViewerOpen, setHeaderPaperViewerOpen] = useState(false);
  const [headerPaperBlobUrl, setHeaderPaperBlobUrl] = useState<string | null>(null);
  const [headerPaperLoading, setHeaderPaperLoading] = useState(false);
  const [headerPaperIsPdf, setHeaderPaperIsPdf] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: false,
    contact: false,
    maintenance: false,
  });

  const getSetting = (key: string): SystemSetting | undefined =>
    settings.find((s) => s.key === key);

  const getValue = (key: string): string =>
    localSettings[key] !== undefined
      ? localSettings[key]
      : getSetting(key)?.value || '';

  const handleChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await onUpdate(key, getValue(key));
      setLocalSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success('Ayar başarıyla güncellendi');
      await refreshSettings();
    } catch (error: unknown) {
      console.error('Ayar güncellenirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Ayar güncellenirken bir hata oluştu'));
    } finally {
      setSaving(null);
    }
  };

  const handleHeaderPaperUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/(pdf|png|jpg|jpeg)$/) && !file.name.match(/\.(pdf|png|jpg|jpeg)$/i)) {
      toast.error('Lütfen bir PDF, PNG veya JPG dosyası seçin (PNG/JPG öneriliyor)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dosya boyutu 10MB\'dan küçük olmalıdır');
      return;
    }
    setUploadingHeaderPaper(true);
    try {
      const headerPaperUrl = await uploadHeaderPaper(file);
      await onUpdate('DOCUMENT_HEADER_PAPER_PATH', headerPaperUrl);
      await refreshSettings();
      toast.success('Antetli kağıt başarıyla yüklendi');
    } catch (error: unknown) {
      console.error('Antetli kağıt yüklenirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Antetli kağıt yüklenirken bir hata oluştu'));
    } finally {
      setUploadingHeaderPaper(false);
      if (headerPaperInputRef.current) headerPaperInputRef.current.value = '';
    }
  };

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? window.location.origin : 'http://localhost:3000');

  const handleShowHeaderPaper = async () => {
    const path = getValue('DOCUMENT_HEADER_PAPER_PATH');
    if (!path?.trim()) {
      toast.error('Önce antetli kağıt yükleyin');
      return;
    }
    const fullUrl = path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    setHeaderPaperLoading(true);
    setHeaderPaperViewerOpen(true);
    setHeaderPaperBlobUrl(null);
    try {
      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error(response.statusText || 'Dosya yüklenemedi');
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      setHeaderPaperBlobUrl(blobUrl);
      const lower = (path || '').toLowerCase();
      setHeaderPaperIsPdf(lower.endsWith('.pdf'));
    } catch (e) {
      console.error('Antetli kağıt yüklenirken hata:', e);
      toast.error(getApiErrorMessage(e, 'Antetli kağıt görüntülenemedi'));
      setHeaderPaperViewerOpen(false);
    } finally {
      setHeaderPaperLoading(false);
    }
  };

  const closeHeaderPaperViewer = () => {
    setHeaderPaperViewerOpen(false);
    if (headerPaperBlobUrl) {
      window.URL.revokeObjectURL(headerPaperBlobUrl);
      setHeaderPaperBlobUrl(null);
    }
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const envValue = getValue('ENVIRONMENT') || 'Production';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Fade in timeout={500}>
      <Box>
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Sistem Kimliği */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('identity')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.primary.main, theme.palette.primary.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={iconBoxSx(theme, theme.palette.primary.main, theme.palette.primary.dark)}>
                    <BusinessIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                      Sistem Kimliği
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      Temel tanımlama ve görüntülenme bilgileri
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('identity');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.primary.main,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.identity ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.identity} timeout="auto" unmountOnExit>
            <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Sistem Adı"
                    value={getValue('SITE_NAME')}
                    onChange={(e) => handleChange('SITE_NAME', e.target.value)}
                    fullWidth
                    size="small"
                    helperText={getSetting('SITE_NAME')?.description || 'Sistemin görünen adı'}
                  />
                  {localSettings['SITE_NAME'] !== undefined && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={saving === 'SITE_NAME' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={() => handleSave('SITE_NAME')}
                      disabled={saving === 'SITE_NAME'}
                      sx={{ mt: 1.5, borderRadius: 2 }}
                    >
                      {saving === 'SITE_NAME' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Sistem Kısa Adı"
                    value={getValue('SYSTEM_CODE')}
                    onChange={(e) => handleChange('SYSTEM_CODE', e.target.value)}
                    fullWidth
                    size="small"
                    helperText={getSetting('SYSTEM_CODE')?.description || 'Örn: sendika-core'}
                    placeholder="sendika-core"
                  />
                  {localSettings['SYSTEM_CODE'] !== undefined && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={saving === 'SYSTEM_CODE' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={() => handleSave('SYSTEM_CODE')}
                      disabled={saving === 'SYSTEM_CODE'}
                      sx={{ mt: 1.5, borderRadius: 2 }}
                    >
                      {saving === 'SYSTEM_CODE' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Sistem Versiyonu"
                    value={getValue('SYSTEM_VERSION')}
                    fullWidth
                    size="small"
                    disabled
                    helperText="Otomatik yönetilir (salt okunur)"
                    InputProps={{ readOnly: true }}
                    sx={{ '& .MuiInputBase-input': { bgcolor: alpha(theme.palette.action.disabledBackground, 0.4), borderRadius: 1 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ortam Bilgisi</InputLabel>
                    <Select
                      value={envValue}
                      onChange={(e) => handleChange('ENVIRONMENT', e.target.value)}
                      label="Ortam Bilgisi"
                    >
                      <MenuItem value="Production">Üretim</MenuItem>
                      <MenuItem value="Staging">Hazırlık</MenuItem>
                      <MenuItem value="Test">Test</MenuItem>
                    </Select>
                  </FormControl>
                  {getSetting('ENVIRONMENT')?.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {getSetting('ENVIRONMENT')?.description}
                    </Typography>
                  )}
                  {localSettings['ENVIRONMENT'] !== undefined && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={saving === 'ENVIRONMENT' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={() => handleSave('ENVIRONMENT')}
                      disabled={saving === 'ENVIRONMENT'}
                      sx={{ mt: 1.5, borderRadius: 2 }}
                    >
                      {saving === 'ENVIRONMENT' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Varsayılan Dil</InputLabel>
                    <Select
                      value={getValue('DEFAULT_LANGUAGE')}
                      onChange={(e) => handleChange('DEFAULT_LANGUAGE', e.target.value)}
                      label="Varsayılan Dil"
                    >
                      <MenuItem value="tr">Türkçe</MenuItem>
                      <MenuItem value="en" disabled>English (Yakında)</MenuItem>
                    </Select>
                  </FormControl>
                  {localSettings['DEFAULT_LANGUAGE'] !== undefined && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={saving === 'DEFAULT_LANGUAGE' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={() => handleSave('DEFAULT_LANGUAGE')}
                      disabled={saving === 'DEFAULT_LANGUAGE'}
                      sx={{ mt: 1.5, borderRadius: 2 }}
                    >
                      {saving === 'DEFAULT_LANGUAGE' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Saat Dilimi"
                    value={getValue('TIMEZONE')}
                    onChange={(e) => handleChange('TIMEZONE', e.target.value)}
                    fullWidth
                    size="small"
                    helperText="Örn: Europe/Istanbul"
                    placeholder="Europe/Istanbul"
                  />
                  {localSettings['TIMEZONE'] !== undefined && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={saving === 'TIMEZONE' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={() => handleSave('TIMEZONE')}
                      disabled={saving === 'TIMEZONE'}
                      sx={{ mt: 1.5, borderRadius: 2 }}
                    >
                      {saving === 'TIMEZONE' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>

                {/* Antetli kağıt */}
                <Grid size={{ xs: 12 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: `1px dashed ${alpha(theme.palette.divider, 0.4)}`,
                      backgroundColor: alpha(theme.palette.grey[500], 0.04),
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.4), backgroundColor: alpha(theme.palette.primary.main, 0.02) },
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                      Antetli Kağıt (PDF arka plan)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Üye dökümanları için kullanılacak antetli kağıt. Tüm üye dökümanlarının arka planı olarak kullanılır.
                    </Typography>
                    <input ref={headerPaperInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={handleHeaderPaperUpload} style={{ display: 'none' }} />
                    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5}>
                      <Button
                        variant="outlined"
                        startIcon={uploadingHeaderPaper ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
                        onClick={() => headerPaperInputRef.current?.click()}
                        disabled={uploadingHeaderPaper}
                        size="small"
                        sx={{ borderRadius: 2 }}
                      >
                        {uploadingHeaderPaper ? 'Yükleniyor...' : 'Antetli Kağıt Yükle'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={handleShowHeaderPaper}
                        disabled={!getValue('DOCUMENT_HEADER_PAPER_PATH')}
                        size="small"
                        sx={{ borderRadius: 2 }}
                      >
                        Antetli Kağıt Göster
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      PNG, JPG veya PDF · Maks. 10MB (PNG/JPG önerilir)
                    </Typography>
                    {getValue('DOCUMENT_HEADER_PAPER_PATH') && (
                      <Typography variant="caption" sx={{ mt: 0.5, color: 'success.main', fontWeight: 600 }}>
                        ✓ Yüklendi
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
            </Collapse>
          </Card>
        </Grid>

        {/* İletişim & Kurumsal Bilgiler */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('contact')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.info.main, theme.palette.info.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={iconBoxSx(theme, theme.palette.info.main, theme.palette.info.dark)}>
                    <ContactMailIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                      İletişim & Kurumsal Bilgiler
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      PDF, e-posta ve raporlarda kullanılır
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('contact');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.info.main,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.info.main, 0.08),
                    },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.contact ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.contact} timeout="auto" unmountOnExit>
            <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Kurumsal E-posta"
                    value={getValue('CONTACT_EMAIL')}
                    onChange={(e) => handleChange('CONTACT_EMAIL', e.target.value)}
                    fullWidth
                    size="small"
                    type="email"
                    helperText="Örn: info@sendika.org"
                    placeholder="info@sendika.org"
                  />
                  {localSettings['CONTACT_EMAIL'] !== undefined && (
                    <Button size="small" variant="contained" startIcon={saving === 'CONTACT_EMAIL' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={() => handleSave('CONTACT_EMAIL')} disabled={saving === 'CONTACT_EMAIL'} sx={{ mt: 1.5, borderRadius: 2 }}>
                      {saving === 'CONTACT_EMAIL' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Telefon"
                    value={getValue('CONTACT_PHONE')}
                    onChange={(e) => handleChange('CONTACT_PHONE', e.target.value)}
                    fullWidth
                    size="small"
                    helperText="Kurumsal telefon"
                    placeholder="+90 (212) 123 45 67"
                  />
                  {localSettings['CONTACT_PHONE'] !== undefined && (
                    <Button size="small" variant="contained" startIcon={saving === 'CONTACT_PHONE' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={() => handleSave('CONTACT_PHONE')} disabled={saving === 'CONTACT_PHONE'} sx={{ mt: 1.5, borderRadius: 2 }}>
                      {saving === 'CONTACT_PHONE' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Adres"
                    value={getValue('CONTACT_ADDRESS')}
                    onChange={(e) => handleChange('CONTACT_ADDRESS', e.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    helperText="Kurumsal adres (opsiyonel)"
                    placeholder="Örn: Atatürk Bulvarı No: 123, Çankaya, Ankara"
                  />
                  {localSettings['CONTACT_ADDRESS'] !== undefined && (
                    <Button size="small" variant="contained" startIcon={saving === 'CONTACT_ADDRESS' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={() => handleSave('CONTACT_ADDRESS')} disabled={saving === 'CONTACT_ADDRESS'} sx={{ mt: 1.5, borderRadius: 2 }}>
                      {saving === 'CONTACT_ADDRESS' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Alt Bilgi (Footer) Metni"
                    value={getValue('FOOTER_TEXT')}
                    onChange={(e) => handleChange('FOOTER_TEXT', e.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    helperText="PDF ve rapor çıktılarında gösterilir"
                    placeholder="© 2025 X Sendikası – Tüm hakları saklıdır"
                  />
                  {localSettings['FOOTER_TEXT'] !== undefined && (
                    <Button size="small" variant="contained" startIcon={saving === 'FOOTER_TEXT' ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={() => handleSave('FOOTER_TEXT')} disabled={saving === 'FOOTER_TEXT'} sx={{ mt: 1.5, borderRadius: 2 }}>
                      {saving === 'FOOTER_TEXT' ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>
            </Collapse>
          </Card>
        </Grid>

        {/* Bakım Modu */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx(theme)}>
            <Box
              onClick={() => toggleSection('maintenance')}
              sx={{
                ...sectionHeaderSx(theme, theme.palette.warning.main, theme.palette.warning.dark),
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={iconBoxSx(theme, theme.palette.warning.main, theme.palette.warning.dark)}>
                    <BuildIcon sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.35rem' } }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' } }}>
                      Bakım Modu
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      Sistem bakım durumu ve mesajı
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSection('maintenance');
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.warning.dark,
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    },
                  }}
                >
                  <ExpandMoreIcon
                    sx={{
                      transform: expandedSections.maintenance ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={expandedSections.maintenance} timeout="auto" unmountOnExit>
            <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={getValue('MAINTENANCE_MODE') === 'true'}
                    onChange={(e) => handleChange('MAINTENANCE_MODE', e.target.checked ? 'true' : 'false')}
                  />
                }
                label="Bakım modunu aktif et"
                sx={{ mb: 2 }}
              />
              {getValue('MAINTENANCE_MODE') === 'true' && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  Bakım modu aktifken sadece yetkili kullanıcılar erişebilir.
                </Alert>
              )}
              <TextField
                label="Bakım Mesajı"
                value={getValue('MAINTENANCE_MESSAGE')}
                onChange={(e) => handleChange('MAINTENANCE_MESSAGE', e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={3}
                helperText={getSetting('MAINTENANCE_MESSAGE')?.description}
                sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
              />
              {(localSettings['MAINTENANCE_MODE'] !== undefined || localSettings['MAINTENANCE_MESSAGE'] !== undefined) && (
                <Button
                  variant="contained"
                  color={getValue('MAINTENANCE_MODE') === 'true' ? 'warning' : 'primary'}
                  startIcon={saving !== null ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  onClick={async () => {
                    if (localSettings['MAINTENANCE_MODE'] !== undefined) await handleSave('MAINTENANCE_MODE');
                    if (localSettings['MAINTENANCE_MESSAGE'] !== undefined) await handleSave('MAINTENANCE_MESSAGE');
                  }}
                  disabled={saving !== null}
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  {saving !== null ? 'Kaydediliyor...' : 'Bakım Ayarlarını Kaydet'}
                </Button>
              )}
            </Box>
            </Collapse>
          </Card>
        </Grid>
      </Grid>

      {/* Antetli kağıt görüntüleme dialog (PDF/resim - diğer sayfalardaki mantık) */}
      <Dialog
        open={headerPaperViewerOpen}
        onClose={closeHeaderPaperViewer}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh', maxHeight: '90vh' },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {headerPaperIsPdf ? (
              <PictureAsPdfIcon sx={{ color: theme.palette.error.main }} />
            ) : (
              <ImageIcon sx={{ color: theme.palette.primary.main }} />
            )}
            <Typography variant="h6">Antetli Kağıt</Typography>
          </Box>
          <IconButton
            onClick={closeHeaderPaperViewer}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            height: 'calc(90vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {headerPaperLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                Yükleniyor...
              </Typography>
            </Box>
          ) : headerPaperBlobUrl ? (
            headerPaperIsPdf ? (
              <DraftPdfCanvasPreview blobUrl={headerPaperBlobUrl} variant="document" />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  overflow: 'auto',
                  '& img': { maxWidth: '100%', height: 'auto', display: 'block' },
                }}
              >
                <img src={headerPaperBlobUrl} alt="Antetli kağıt" style={{ width: '100%', height: 'auto' }} />
              </Box>
            )
          ) : null}
        </DialogContent>
      </Dialog>
      </Box>
    </Fade>
  );
};

export default GeneralSettings;
