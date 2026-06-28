// src/pages/notifications/NotificationSettingsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
  Divider,
  TextField,
  MenuItem,
  Button,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Paper,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from '../services/notificationsApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const NotificationSettingsPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getNotificationSettings();
      setSettings(data);
    } catch (error: unknown) {
      console.error('Ayarlar yüklenirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Ayarlar yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await updateNotificationSettings(settings);
      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (error: unknown) {
      console.error('Ayarlar kaydedilirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Ayarlar kaydedilirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof NotificationSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Typography>Yükleniyor...</Typography>
      </Box>
    );
  }

  if (!settings) {
    return <Alert severity="error">Ayarlar yüklenemedi</Alert>;
  }

  return (
    <PageLayout>
      <PageHeader
        icon={<SettingsIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Bildirim Ayarları"
        description="Bildirim tercihlerinizi yönetin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        }
      />
      <Grid container spacing={3}>
        {/* Kanal Ayarları */}
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
              background: '#fff',
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Kanal Ayarları
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Hangi kanallardan bildirim almak istediğinizi seçin
            </Typography>

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailEnabled}
                    onChange={(e) => handleChange('emailEnabled', e.target.checked)}
                  />
                }
                label="E-posta Bildirimleri"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smsEnabled}
                    onChange={(e) => handleChange('smsEnabled', e.target.checked)}
                  />
                }
                label="SMS Bildirimleri"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.whatsappEnabled}
                    onChange={(e) => handleChange('whatsappEnabled', e.target.checked)}
                  />
                }
                label="WhatsApp Bildirimleri"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.inAppEnabled}
                    onChange={(e) => handleChange('inAppEnabled', e.target.checked)}
                  />
                }
                label="Uygulama İçi Bildirimler"
              />
            </Stack>
          </Card>
        </Grid>

        {/* Zaman Ayarları */}
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
              background: '#fff',
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Zaman Ayarları
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sessiz saatler ve zaman dilimi ayarları
            </Typography>

            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Zaman Dilimi</InputLabel>
                <Select
                  value={settings.timeZone}
                  onChange={(e) => handleChange('timeZone', e.target.value)}
                  label="Zaman Dilimi"
                >
                  <MenuItem value="Europe/Istanbul">Türkiye Saati (GMT+3)</MenuItem>
                  <MenuItem value="UTC">UTC</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Sessiz Saatler Başlangıç"
                type="time"
                value={settings.quietHoursStart || ''}
                onChange={(e) => handleChange('quietHoursStart', e.target.value || null)}
                InputLabelProps={{ shrink: true }}
                helperText="Bu saatten sonra bildirim gönderilmez (örn: 22:00)"
                fullWidth
              />

              <TextField
                label="Sessiz Saatler Bitiş"
                type="time"
                value={settings.quietHoursEnd || ''}
                onChange={(e) => handleChange('quietHoursEnd', e.target.value || null)}
                InputLabelProps={{ shrink: true }}
                helperText="Bu saatten sonra bildirimler tekrar başlar (örn: 08:00)"
                fullWidth
              />
            </Stack>
          </Card>
        </Grid>

        {/* Kategori Ayarları */}
        <Grid size={12}>
          <Card
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
              background: '#fff',
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Kategori Ayarları
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Hangi kategorilerden bildirim almak istediğinizi seçin
            </Typography>

            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.systemNotificationsEnabled}
                    onChange={(e) =>
                      handleChange('systemNotificationsEnabled', e.target.checked)
                    }
                  />
                }
                label="Sistem Bildirimleri"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.financialNotificationsEnabled}
                    onChange={(e) =>
                      handleChange('financialNotificationsEnabled', e.target.checked)
                    }
                  />
                }
                label="Mali Bildirimler"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.announcementNotificationsEnabled}
                    onChange={(e) =>
                      handleChange('announcementNotificationsEnabled', e.target.checked)
                    }
                  />
                }
                label="Duyuru Bildirimleri"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.reminderNotificationsEnabled}
                    onChange={(e) =>
                      handleChange('reminderNotificationsEnabled', e.target.checked)
                    }
                  />
                }
                label="Hatırlatma Bildirimleri"
              />
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </PageLayout>
  );
};

export default NotificationSettingsPage;

