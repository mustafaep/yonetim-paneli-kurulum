// src/features/system/components/ComingSoonPlaceholder.tsx
import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';

interface ComingSoonPlaceholderProps {
  title?: string;
}

const ComingSoonPlaceholder: React.FC<ComingSoonPlaceholderProps> = ({ title }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        py: 6,
        px: 2,
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        borderRadius: 2,
        border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          mb: 2,
        }}
      >
        <ScheduleIcon sx={{ fontSize: 32 }} />
      </Box>
      <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
        {title ? `${title} — Yakında` : 'Yakında eklenecek'}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={360}>
        Bu bölüm üzerinde çalışıyoruz. Kısa süre içinde kullanıma sunulacaktır.
      </Typography>
    </Box>
  );
};

export default ComingSoonPlaceholder;
