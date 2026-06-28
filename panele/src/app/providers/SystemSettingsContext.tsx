// src/app/providers/SystemSettingsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { getSystemSettings, type SystemSetting } from '../../features/system/services/systemApi';
import { useAuth } from './AuthContext';

interface SystemSettingsContextValue {
  settings: SystemSetting[];
  isLoading: boolean;
  getSetting: (key: string) => SystemSetting | undefined;
  getSettingValue: (key: string, defaultValue?: string) => string;
  refreshSettings: () => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextValue | undefined>(undefined);

export const SystemSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const loadSettings = useCallback(async () => {
    // Only load settings if user is authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getSystemSettings();
      setSettings(data);
    } catch (error) {
      console.error('Sistem ayarları yüklenirken hata:', error);
      // Don't throw, just log the error - settings will remain empty
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Wait for auth to finish loading before attempting to load settings
    if (!authLoading) {
      loadSettings();
    }
  }, [authLoading, loadSettings]);

  const getSetting = (key: string): SystemSetting | undefined => {
    return settings.find((s) => s.key === key);
  };

  const getSettingValue = (key: string, defaultValue = ''): string => {
    return getSetting(key)?.value || defaultValue;
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  const value: SystemSettingsContextValue = {
    settings,
    isLoading,
    getSetting,
    getSettingValue,
    refreshSettings,
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const ctx = useContext(SystemSettingsContext);
  if (!ctx) {
    throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  }
  return ctx;
};
