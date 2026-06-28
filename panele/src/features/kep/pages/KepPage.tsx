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
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ConstructionIcon from '@mui/icons-material/Construction';
import SendIcon from '@mui/icons-material/Send';
import InboxIcon from '@mui/icons-material/Inbox';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import GroupsIcon from '@mui/icons-material/Groups';
import GavelIcon from '@mui/icons-material/Gavel';

import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

interface PlannedFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const PlannedFeatureCard: React.FC<PlannedFeatureCardProps> = ({ icon, title, description, color }) => {
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

const KepPage: React.FC = () => {
  const theme = useTheme();

  const plannedFeatures = [
    {
      icon: <SendIcon />,
      title: 'KEP Gönderimi',
      description: 'Üyelere ve kurumlara Kayıtlı Elektronik Posta (KEP) ile resmi yazışma gönderimi.',
      color: '#1565c0',
    },
    {
      icon: <InboxIcon />,
      title: 'Gelen KEP Kutusu',
      description: 'Gelen KEP mesajlarının listelenmesi, okunması ve yönetimi.',
      color: '#2e7d32',
    },
    {
      icon: <VerifiedIcon />,
      title: 'Tebligat Takibi',
      description: 'Gönderilen KEP tebligatlarının iletim durumu, okunma bilgisi ve yasal süre takibi.',
      color: '#e65100',
    },
    {
      icon: <GroupsIcon />,
      title: 'Toplu KEP Gönderimi',
      description: 'Birden fazla üyeye veya kuruma aynı anda toplu KEP gönderimi. İl, şube veya durum bazlı hedefleme.',
      color: '#6a1b9a',
    },
    {
      icon: <GavelIcon />,
      title: 'Hukuki Süreç Desteği',
      description: 'İhraç, istifa ve disiplin süreçlerinde yasal geçerliliği olan KEP tebligatları.',
      color: '#c62828',
    },
    {
      icon: <HistoryIcon />,
      title: 'KEP Geçmişi',
      description: 'Tüm gönderilen ve alınan KEP mesajlarının detaylı geçmişi, iletim kanıtları ve arşivleme.',
      color: '#607d8b',
    },
  ];

  return (
    <PageLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <PageHeader
          icon={<MarkEmailReadIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title="KEP Sistemi"
          description="Kayıtlı Elektronik Posta ile resmi yazışma ve tebligat"
          color="#5c6bc0"
          darkColor="#3949ab"
          lightColor={alpha('#5c6bc0', 0.06)}
        />

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
                KEP (Kayıtlı Elektronik Posta) sistemi yakında kullanıma sunulacaktır.
                Aşağıda planlanan özellikler yer almaktadır.
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>
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
    </PageLayout>
  );
};

export default KepPage;
