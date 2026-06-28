// src/features/system/pages/SystemSettingsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Alert, useTheme } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../app/providers/AuthContext';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';

import { getSystemSettings, updateSystemSetting } from '../services/systemApi';
import type { SystemSetting } from '../services/systemApi';
import SettingsSidebar, { type SettingsCategory } from '../components/SettingsSidebar';
import SystemSettingsContent from '../components/SystemSettingsContent';
import {
  getCategoryFromPath,
  getPathFromCategory,
} from '../constants/settingsNavigation';

const SystemSettingsPage: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { refreshSettings } = useSystemSettings();
  const toast = useToast();

  const canView = hasPermission('SYSTEM_SETTINGS_VIEW');
  const canManage = hasPermission('SYSTEM_SETTINGS_MANAGE');

  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory>(() =>
    getCategoryFromPath(location.pathname),
  );
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemSettings();
      setSettings(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Sistem ayarları yüklenirken bir hata oluştu.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) {
      loadSettings();
    }
  }, [canView, loadSettings]);

  useEffect(() => {
    setSelectedCategory(getCategoryFromPath(location.pathname));
  }, [location.pathname]);

  const handleCategoryChange = useCallback(
    (category: SettingsCategory) => {
      setSelectedCategory(category);
      const nextPath = getPathFromCategory(category);
      if (location.pathname !== nextPath) {
        navigate(nextPath);
      }
    },
    [location.pathname, navigate],
  );

  const handleUpdate = useCallback(
    async (key: string, value: string) => {
      if (!canManage) return;
      try {
        await updateSystemSetting(key, { value });
        toast.success('Ayar başarıyla güncellendi');
        await refreshSettings();
        const updated = await getSystemSettings();
        setSettings(Array.isArray(updated) ? updated : []);
      } catch (e) {
        const message = getApiErrorMessage(e, 'Ayar güncellenirken bir hata oluştu.');
        toast.showError(message);
        throw e;
      }
    },
    [canManage, toast, refreshSettings],
  );

  if (!canView) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          px: 3,
        }}
      >
        <Alert
          severity="error"
          sx={{
            borderRadius: 2,
            maxWidth: 500,
          }}
        >
          Bu sayfaya erişim yetkiniz bulunmamaktadır.
        </Alert>
      </Box>
    );
  }

  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<SettingsIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="Sistem Ayarları"
          description="Sistem genel ayarlarını yönetin ve yapılandırın"
          color={theme.palette.primary.main}
          darkColor={theme.palette.primary.dark}
          lightColor={theme.palette.primary.light}
        />

        <SettingsSidebar
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        <SystemSettingsContent
          loading={loading}
          error={error}
          onClearError={() => setError(null)}
          selectedCategory={selectedCategory}
          settings={settings}
          canManage={canManage}
          onUpdate={handleUpdate}
        />
      </Box>
    </PageLayout>
  );
};

export default SystemSettingsPage;
