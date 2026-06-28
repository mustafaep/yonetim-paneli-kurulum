// src/shared/components/layout/PageHeader.tsx
import React, { ReactNode } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';

export interface PageHeaderProps {
  /**
   * Sayfa başlığı ikonu (ReactNode olarak)
   */
  icon: ReactNode;
  
  /**
   * Sayfa başlığı metni (string veya ReactNode)
   */
  title: string | ReactNode;
  
  /**
   * Sayfa açıklama metni (string veya ReactNode)
   */
  description: string | ReactNode;
  
  /**
   * Sağ tarafta gösterilecek içerik (buton, link vb.)
   * Örnek: <Button>Yeni Üye Ekle</Button>
   */
  rightContent?: ReactNode;
  
  /**
   * Mobile cihazlarda gösterilecek içerik (genellikle fullWidth buton)
   * Eğer belirtilmezse, rightContent mobile'da gizlenir
   */
  mobileContent?: ReactNode;
  
  /**
   * Renk teması - ana renk
   * Varsayılan: '#0891b2' (cyan)
   */
  color?: string;
  
  /**
   * Renk teması - koyu renk (gradient için)
   * Varsayılan: '#059669' (emerald)
   */
  darkColor?: string;
  
  /**
   * Renk teması - açık renk (background için)
   * Varsayılan: otomatik hesaplanır
   */
  lightColor?: string;
  
  /**
   * Özel background gradient
   * Eğer belirtilmezse, color ve darkColor kullanılarak otomatik oluşturulur
   */
  backgroundGradient?: string;
  
  /**
   * Icon container boyutu
   * Varsayılan: { xs: 56, sm: 64 }
   */
  iconSize?: { xs?: number; sm?: number; md?: number };
  
  /**
   * Ekstra stil özelleştirmeleri
   */
  sx?: object;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  rightContent,
  mobileContent,
  color = '#0891b2',
  darkColor = '#059669',
  lightColor,
  backgroundGradient,
  iconSize = { xs: 56, sm: 64 },
  sx = {},
}) => {
  const theme = useTheme();
  
  // Light color otomatik hesaplama
  const calculatedLightColor = lightColor || alpha(color, 0.06);
  
  // Background gradient otomatik oluşturma
  const calculatedBackgroundGradient = backgroundGradient || 
    `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, ${alpha(darkColor, 0.06)} 100%)`;

  return (
    <Box
      sx={{
        mb: 4,
        p: { xs: 3, sm: 4, md: 5 },
        borderRadius: 4,
        background: calculatedBackgroundGradient,
        border: `1px solid ${alpha(color, 0.15)}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '300px',
          background: `radial-gradient(circle, ${alpha(color, 0.1)} 0%, transparent 70%)`,
          borderRadius: '50%',
          transform: 'translate(30%, -30%)',
        },
        ...sx,
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: 2 
          }}
        >
          {/* Sol taraf: Icon ve Metinler */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
            {/* Icon Container */}
            <Box
              sx={{
                width: iconSize.xs ? { xs: iconSize.xs, sm: iconSize.sm || iconSize.xs, md: iconSize.md || iconSize.sm || iconSize.xs } : { xs: 56, sm: 64 },
                height: iconSize.xs ? { xs: iconSize.xs, sm: iconSize.sm || iconSize.xs, md: iconSize.md || iconSize.sm || iconSize.xs } : { xs: 56, sm: 64 },
                borderRadius: 3,
                background: `linear-gradient(135deg, ${color} 0%, ${darkColor} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 24px ${alpha(color, 0.35)}`,
                transition: 'all 0.3s ease',
                flexShrink: 0,
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.05)',
                  boxShadow: `0 12px 32px ${alpha(color, 0.45)}`,
                },
              }}
            >
              {icon}
            </Box>
            
            {/* Title ve Description */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
                  color: theme.palette.text.primary,
                  mb: 1,
                  letterSpacing: '-0.02em',
                  textAlign: 'left',
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  fontWeight: 500,
                  textAlign: 'left',
                }}
              >
                {description}
              </Typography>
            </Box>
          </Box>
          
          {/* Sağ taraf: Opsiyonel içerik (butonlar vb.) */}
          {rightContent && (
            <Box 
              sx={{ 
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                gap: 1,
              }}
            >
              {rightContent}
            </Box>
          )}
        </Box>
        
        {/* Mobile içerik */}
        {mobileContent && (
          <Box 
            sx={{ 
              display: { xs: 'block', sm: 'none' },
              mt: 3,
            }}
          >
            {mobileContent}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PageHeader;
