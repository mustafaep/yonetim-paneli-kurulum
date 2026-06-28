// src/pages/system/components/SettingsSidebar.tsx
import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  useTheme,
  alpha,
  useMediaQuery,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SecurityIcon from '@mui/icons-material/Security';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import BarChartIcon from '@mui/icons-material/BarChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';

export type SettingsCategory =
  | 'GENERAL'
  | 'MEMBERSHIP'
  | 'BULK_REGISTRATION'
  | 'MESSAGING'
  | 'KBS_DATA'
  | 'DASHBOARD'
  | 'REPORTS'
  | 'SECURITY'
  | 'AUDIT'
  | 'MAINTENANCE';

interface SettingsSidebarProps {
  selectedCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
}

interface CategoryItem {
  id: SettingsCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const categories: CategoryItem[] = [
  {
    id: 'GENERAL',
    label: 'Genel Sistem',
    icon: <SettingsIcon />,
    description: 'Temel sistem ayarları',
  },
  {
    id: 'MEMBERSHIP',
    label: 'Üyelik',
    icon: <PeopleIcon />,
    description: 'Üye başvuru ve onay',
  },
  {
    id: 'BULK_REGISTRATION',
    label: 'Toplu Veri Kayıt',
    icon: <UploadFileIcon />,
    description: 'CSV ile toplu üye kaydı',
  },
  {
    id: 'MESSAGING',
    label: 'Mesajlaşma',
    icon: <ForumIcon />,
    description: 'WhatsApp, SMS, E-posta',
  },
  {
    id: 'KBS_DATA',
    label: 'KBS Veri Çekme',
    icon: <CloudDownloadIcon />,
    description: 'KBS veri entegrasyonu',
  },
  {
    id: 'DASHBOARD',
    label: 'Dashboard Ayarları',
    icon: <DashboardIcon />,
    description: 'Dashboard görünürlük ayarları',
  },
  {
    id: 'REPORTS',
    label: 'Rapor Ayarları',
    icon: <BarChartIcon />,
    description: 'Rapor görünürlük ayarları',
  },
  {
    id: 'SECURITY',
    label: 'Güvenlik',
    icon: <SecurityIcon />,
    description: 'Şifre ve oturum politikası',
  },
  {
    id: 'AUDIT',
    label: 'Loglama',
    icon: <HistoryIcon />,
    description: 'Sistem log ayarları',
  },
  {
    id: 'MAINTENANCE',
    label: 'Bakım',
    icon: <AssessmentIcon />,
    description: 'Cache ve geliştirici ayarları',
  },
];

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleChange = (_event: React.SyntheticEvent, newIndex: number) => {
    const category = categories[newIndex];
    if (category) {
      onCategoryChange(category.id);
    }
  };

  const getCategoryIndex = () => {
    const index = categories.findIndex((cat) => cat.id === selectedCategory);
    return index >= 0 ? index : 0;
  };

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Tabs
        value={getCategoryIndex()}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: isMobile ? 60 : 72,
          px: { xs: 1, sm: 2 },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          },
          '& .MuiTabs-scrollButtons': {
            color: theme.palette.text.secondary,
            '&.Mui-disabled': {
              opacity: 0.3,
            },
          },
          '& .MuiTab-root': {
            minHeight: isMobile ? 60 : 72,
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            minWidth: isMobile ? 'auto' : 120,
            flex: isMobile ? 'none' : 1,
            maxWidth: isMobile ? 'none' : 'none',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
            },
            '&.Mui-selected': {
              color: theme.palette.primary.main,
              fontWeight: 600,
              '& .tab-icon-wrapper': {
                transform: 'scale(1.1)',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
            },
          },
        }}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <Tab
              key={category.id}
              icon={
                <Box
                  className="tab-icon-wrapper"
                  sx={{
                    width: { xs: 36, sm: 40 },
                    height: { xs: 36, sm: 40 },
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected 
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha(theme.palette.action.hover, 0.04),
                    color: isSelected 
                      ? theme.palette.primary.main 
                      : theme.palette.text.secondary,
                    transition: 'all 0.2s',
                    mb: { xs: 0.5, sm: 1 },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '& svg': { fontSize: { xs: 20, sm: 22 } },
                    }}
                  >
                    {category.icon}
                  </Box>
                </Box>
              }
              label={
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: { xs: 0.25, sm: 0.5 },
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      lineHeight: 1.2,
                      color: isSelected 
                        ? theme.palette.primary.main 
                        : theme.palette.text.primary,
                    }}
                  >
                    {category.label}
                  </Typography>
                  {!isMobile && (
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.7rem',
                        color: theme.palette.text.secondary,
                        lineHeight: 1,
                        fontWeight: 400,
                      }}
                    >
                      {category.description}
                    </Typography>
                  )}
                </Box>
              }
            />
          );
        })}
      </Tabs>
    </Box>
  );
};

export default SettingsSidebar;