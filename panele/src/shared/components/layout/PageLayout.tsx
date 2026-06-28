// src/shared/components/layout/PageLayout.tsx
// Referans: Üyeler sayfası (MembersListPage) – tüm sayfalarda aynı başlık + içerik hizası için ortak wrapper.
import React, { ReactNode } from 'react';
import { Box } from '@mui/material';

export interface PageLayoutProps {
  children: ReactNode;
  /** Ek sx (örn. gap) – başlık/genişlik standardını bozmayacak şekilde kullanın */
  sx?: object;
}

/**
 * Sayfa başlığı ve içeriğini aynı genişlikte tutan ortak container.
 * - MainLayout'un verdiği padding içinde tam genişlik kullanır (ek Container/maxWidth yok).
 * - Başlık (PageHeader) ve içerik bu wrapper içinde aynı hizada başlar.
 */
const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ children, sx = {} }, ref) => (
    <Box
      ref={ref}
      sx={{
        pb: 4,
        width: '100%',
        ...sx,
      }}
    >
      {children}
    </Box>
  ),
);

PageLayout.displayName = 'PageLayout';

export default PageLayout;
