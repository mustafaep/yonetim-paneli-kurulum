import React from 'react';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  alpha,
  Grid,
  Chip,
} from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import SyncIcon from '@mui/icons-material/Sync';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';

interface PlannedFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const PlannedFeatureCard: React.FC<PlannedFeatureCardProps> = ({
  icon,
  title,
  description,
  color,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, 0.06)}`,
        backgroundColor: '#ffffff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(color, 0.1),
            color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Chip
            label="Yakında"
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 600,
              backgroundColor: alpha('#ff9800', 0.1),
              color: '#ff9800',
              mt: 0.25,
            }}
          />
        </Box>
      </Box>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.6 }}>
        {description}
      </Typography>
    </Paper>
  );
};

const plannedFeatures = [
  {
    icon: <SyncIcon />,
    title: 'KBS Entegrasyonu',
    description: 'Kamu Bilgi Sistemi (KBS) ile doğrudan veri entegrasyonu. Üye bilgilerinin otomatik çekilmesi.',
    color: '#1565c0',
  },
  {
    icon: <PersonSearchIcon />,
    title: 'TC Kimlik ile Sorgulama',
    description: 'TC Kimlik numarası ile KBS üzerinden personel bilgilerinin sorgulanması ve eşleştirilmesi.',
    color: '#2e7d32',
  },
  {
    icon: <CompareArrowsIcon />,
    title: 'Veri Karşılaştırma',
    description: 'KBS\'den çekilen veriler ile mevcut üye kayıtları arasında otomatik karşılaştırma ve fark analizi.',
    color: '#e65100',
  },
  {
    icon: <FactCheckIcon />,
    title: 'Toplu Doğrulama',
    description: 'Mevcut üye listesinin KBS verileri ile toplu olarak doğrulanması. Güncel olmayan kayıtların tespiti.',
    color: '#6a1b9a',
  },
  {
    icon: <StorageIcon />,
    title: 'Toplu Veri Aktarımı',
    description: 'KBS\'den çekilen verilerin toplu olarak sisteme aktarılması. Yeni üye kayıtlarının otomatik oluşturulması.',
    color: '#00838f',
  },
  {
    icon: <SecurityIcon />,
    title: 'Güvenli Bağlantı',
    description: 'KBS ile güvenli ve şifreli bağlantı. Veri transferinde uçtan uca koruma ve erişim logları.',
    color: '#c62828',
  },
];

const KbsDataSettings: React.FC = () => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: `1px solid ${alpha('#ff9800', 0.3)}`,
          boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.06)}`,
          backgroundColor: alpha('#ff9800', 0.03),
          overflow: 'hidden',
          p: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha('#ff9800', 0.12),
              flexShrink: 0,
            }}
          >
            <ConstructionIcon sx={{ fontSize: 28, color: '#ff9800' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Bu modül geliştirme aşamasındadır
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.6 }}>
              KBS veri çekme ve entegrasyon sistemi yakında kullanıma sunulacaktır.
              Aşağıda planlanan özellikler yer almaktadır.
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Planlanan Özellikler
      </Typography>

      <Grid container spacing={2}>
        {plannedFeatures.map((feature, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
            <PlannedFeatureCard {...feature} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default KbsDataSettings;
