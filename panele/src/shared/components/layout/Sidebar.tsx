// src/shared/components/layout/Sidebar.tsx
import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  useTheme,
  alpha,
  useMediaQuery,
  IconButton,
  Collapse,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import GroupsIcon from '@mui/icons-material/Groups';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import BusinessIcon from '@mui/icons-material/Business';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ArticleIcon from '@mui/icons-material/Article';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SettingsIcon from '@mui/icons-material/Settings';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BadgeIcon from '@mui/icons-material/Badge';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import SmsIcon from '@mui/icons-material/Sms';
import EmailIcon from '@mui/icons-material/Email';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FeedIcon from '@mui/icons-material/Feed';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import type { SxProps, Theme } from '@mui/material';
import { getSidebarNavFlags } from '../../utils/navPermissions';

const drawerWidth = 260;

// Helper function: Tekrarlayan nav item stilini oluşturur
const getNavItemSx = (theme: Theme, variant: 'default' | 'success' = 'default'): SxProps<Theme> => {
  const color = variant === 'success' ? theme.palette.success : theme.palette.primary;
  
  return {
    borderRadius: 2,
    mb: 0.5,
    ...(variant === 'success' && {
      backgroundColor: alpha(color.main, 0.08),
      '& .MuiListItemIcon-root': {
        color: color.main,
      },
    }),
    '&.Mui-selected': {
      backgroundColor: alpha(color.main, 0.08),
      color: color.main,
      '&:hover': {
        backgroundColor: alpha(color.main, 0.12),
      },
      '& .MuiListItemIcon-root': {
        color: color.main,
      },
    },
    '&:hover': {
      backgroundColor: variant === 'success' 
        ? alpha(color.main, 0.12)
        : alpha(theme.palette.action.hover, 0.04),
    },
  };
};

interface SidebarProps {
  mobileOpen?: boolean;
  onDrawerToggle?: () => void;
  desktopOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onDrawerToggle, desktopOpen = true }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hasPermission, hasRole } = useAuth();
  const nav = getSidebarNavFlags(hasPermission, hasRole);

  const {
    showNewMemberApplication,
    showMemberApplications,
    showMembersList,
    showMemberHistory,
    showContent,
    showRegions,
    showRoles,
    showDocumentsSection,
    showPdfGenerate,
    showDocumentTemplates,
    showDocumentMemberHistory,
    showUsers,
    showPanelUserApplications,
    showBranches,
    showAccounting,
    showAdvances,
    showPaymentsList,
    showPaymentQuickEntry,
    showInvoices,
    showReports,
    showNotifications,
    showMessaging,
    showWhatsAppChatNav,
    showWhatsAppBulkNav,
    showWhatsAppTemplatesNav,
    showSystemSettings,
    showSystemLogs,
    showInstitutions,
  } = nav;

  const [openSection, setOpenSection] = React.useState<string | null>(null);

  const isActive = (path: string) => location.pathname === path;

  const handleLinkClick = () => {
    if (isMobile && onDrawerToggle) {
      onDrawerToggle();
    }
  };

  const handleSectionToggle = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  React.useEffect(() => {
    const path = location.pathname;

    if (path.startsWith('/members') || path.startsWith('/professions')) {
      setOpenSection('members');
    } else if (
      path.startsWith('/regions') ||
      path.startsWith('/institutions') ||
      path.startsWith('/accounting/tevkifat-centers')
    ) {
      setOpenSection('region');
    } else if (
      path.startsWith('/payments') ||
      path.startsWith('/accounting/advances') ||
      path.startsWith('/invoices')
    ) {
      setOpenSection('deductions');
    } else if (path.startsWith('/content') || path.startsWith('/documents')) {
      setOpenSection('content-docs');
    } else if (path.startsWith('/users') || path.startsWith('/roles')) {
      setOpenSection('user-management');
    } else if (path.startsWith('/system')) {
      setOpenSection('system');
    } else if (path.startsWith('/whatsapp') || path.startsWith('/messaging')) {
      setOpenSection('whatsapp');
    } else {
      setOpenSection(null);
    }
  }, [location.pathname]);

  const hasRegionGroup =
    showRegions || showBranches || showInstitutions || showAccounting;
  const hasDeductionsGroup =
    showPaymentsList ||
    showPaymentQuickEntry ||
    showAdvances ||
    showInvoices;
  const hasMembersGroup =
    showMemberApplications ||
    showMembersList ||
    showMemberHistory;
  const hasContentGroup = showDocumentsSection || showContent;
  const hasUserManagementGroup = showUsers || showRoles || showPanelUserApplications;
  const hasSystemGroup = showSystemSettings || showSystemLogs;

  const drawerContent = (
    <>
      {isMobile && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Menü
          </Typography>
          <IconButton onClick={onDrawerToggle} size="small">
            <ChevronLeftIcon />
          </IconButton>
        </Box>
      )}
      
      {!isMobile && <Toolbar />}
      
      <List sx={{ px: 1 }}>
        <ListItemButton
          component={Link}
          to="/"
          selected={isActive('/') || isActive('/dashboard')}
          onClick={handleLinkClick}
          sx={getNavItemSx(theme)}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <GridViewIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Dashboard" 
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          />
        </ListItemButton>
      </List>

      {showNewMemberApplication && (
        <List sx={{ px: 1, pt: 0, mb: 1.5 }}>
          <ListItemButton
            component={Link}
            to="/members/applications/new"
            selected={location.pathname === '/members/applications/new'}
            onClick={handleLinkClick}
            sx={getNavItemSx(theme, 'success')}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <PersonAddIcon />
            </ListItemIcon>
            <ListItemText
              primary="Yeni Üye Başvurusu"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: theme.palette.success.main,
              }}
            />
          </ListItemButton>
        </List>
      )}

      {/* 3. Üyeler */}
      {hasMembersGroup && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('members')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <GroupsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Üyeler"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
            {openSection === 'members' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={openSection === 'members'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {showMemberApplications && (
                <ListItemButton
                  component={Link}
                  to="/members/applications"
                  selected={
                    location.pathname.startsWith('/members/applications') &&
                    !location.pathname.startsWith('/members/waiting')
                  }
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <AssignmentIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Üye Başvuruları"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showMembersList && (
                <ListItemButton
                  component={Link}
                  to="/members"
                  selected={
                    location.pathname === '/members' ||
                    (location.pathname.startsWith('/members/waiting') &&
                      !location.pathname.startsWith('/members/applications') &&
                      !location.pathname.startsWith('/members/waiting') &&
                      !location.pathname.startsWith('/members/status') &&
                      /^\/members\/[^/]+$/.test(location.pathname))
                  }
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <GroupsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Üyeler"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showMemberHistory && (
                <ListItemButton
                  component={Link}
                  to="/members/status"
                  selected={location.pathname.startsWith('/members/status')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <HistoryIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Üye Hareketleri"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

            </List>
          </Collapse>
        </List>
      )}

      {/* 4. Bölge ve Kurum Bilgileri */}
      {hasRegionGroup && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('region')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LocationCityIcon />
            </ListItemIcon>
            <ListItemText
              primary="Bölge ve Kurum Bilgileri"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
            {openSection === 'region' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={openSection === 'region'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {showRegions && (
                <ListItemButton
                  component={Link}
                  to="/regions/provinces"
                  selected={location.pathname.startsWith('/regions/provinces')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <LocationCityIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="İller & İlçeler"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showInstitutions && (
                <ListItemButton
                  component={Link}
                  to="/institutions"
                  selected={location.pathname.startsWith('/institutions')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <BusinessIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Kurumlar"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showAccounting && (
                <ListItemButton
                  component={Link}
                  to="/accounting/tevkifat-centers"
                  selected={location.pathname.startsWith('/accounting/tevkifat-centers')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <AccountBalanceIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tevkifat Merkezleri"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showBranches && (
                <ListItemButton
                  component={Link}
                  to="/regions/branches"
                  selected={location.pathname.startsWith('/regions/branches')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <BusinessIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Şubeler"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </List>
      )}

      {/* 5. Kesintiler */}
      {hasDeductionsGroup && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('deductions')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <ReceiptLongIcon />
            </ListItemIcon>
            <ListItemText
              primary="Kesintiler"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
            {openSection === 'deductions' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={openSection === 'deductions'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {showPaymentQuickEntry && (
                <ListItemButton
                  component={Link}
                  to="/payments/quick-entry"
                  selected={location.pathname === '/payments/quick-entry'}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <CreditCardIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Kesinti Girişi"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showPaymentsList && (
                <ListItemButton
                  component={Link}
                  to="/payments"
                  selected={
                    location.pathname === '/payments' ||
                    (location.pathname.startsWith('/payments/') &&
                      !location.pathname.startsWith('/payments/quick-entry') &&
                      !/^\/payments\/[^/]+$/.test(location.pathname))
                  }
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <ReceiptLongIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Kesinti Sorgulama"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showAdvances && (
                <ListItemButton
                  component={Link}
                  to="/accounting/advances"
                  selected={location.pathname.startsWith('/accounting/advances')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <MonetizationOnIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Avans Sistemi"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showInvoices && (
                <ListItemButton
                  component={Link}
                  to="/invoices"
                  selected={location.pathname.startsWith('/invoices')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <RequestQuoteIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Fatura Sistemi"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </List>
      )}

      {/* 6. İçerik ve Doküman Sistemi */}
      {hasContentGroup && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('content-docs')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <ArticleIcon />
            </ListItemIcon>
            <ListItemText
              primary="İçerik ve Doküman Sistemi"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
            {openSection === 'content-docs' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={openSection === 'content-docs'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {showContent && (
                <ListItemButton
                  component={Link}
                  to="/content"
                  selected={location.pathname.startsWith('/content')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <FeedIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="İçerik Yönetimi"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
              {showPdfGenerate && (
                <ListItemButton
                  component={Link}
                  to="/documents/generate"
                  selected={location.pathname.startsWith('/documents/generate')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="PDF Oluştur"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
              {showDocumentTemplates && (
                <ListItemButton
                  component={Link}
                  to="/documents/templates"
                  selected={location.pathname.startsWith('/documents/templates')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="PDF Şablonları"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
              {showDocumentMemberHistory && (
                <ListItemButton
                  component={Link}
                  to="/documents/members"
                  selected={location.pathname.startsWith('/documents/members')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="PDF Oluşturma Geçmişi"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </List>
      )}

      {/* 7. Raporlar */}
      <List sx={{ px: 1 }}>
        {showReports && (
          <ListItemButton
            component={Link}
            to="/reports"
            selected={location.pathname.startsWith('/reports')}
            onClick={handleLinkClick}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <BarChartIcon />
            </ListItemIcon>
            <ListItemText
              primary="Raporlar"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        )}
      </List>

      {/* 8. Bildirimler */}
      {showNotifications && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            component={Link}
            to="/notifications"
            selected={location.pathname.startsWith('/notifications')}
            onClick={handleLinkClick}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <NotificationsActiveIcon />
            </ListItemIcon>
            <ListItemText
              primary="Bildirimler"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </List>
      )}

      {/* 8.5. WhatsApp & SMS */}
      {showMessaging && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('whatsapp')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <WhatsAppIcon />
            </ListItemIcon>
            <ListItemText
              primary="Mesajlaşma"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
            {openSection === 'whatsapp' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={openSection === 'whatsapp'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {showWhatsAppChatNav && (
                <ListItemButton
                  component={Link}
                  to="/whatsapp"
                  selected={
                    (location.pathname === '/whatsapp' || location.pathname.startsWith('/whatsapp/chat')) &&
                    !location.pathname.startsWith('/whatsapp/auto-templates')
                  }
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <WhatsAppIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sohbetler"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
              {showWhatsAppBulkNav && (
                <ListItemButton
                  component={Link}
                  to="/whatsapp/bulk"
                  selected={location.pathname.startsWith('/whatsapp/bulk')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <CloudDownloadIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Toplu Mesaj"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
              {showWhatsAppTemplatesNav && (
                <ListItemButton
                  component={Link}
                  to="/whatsapp/auto-templates"
                  selected={location.pathname.startsWith('/whatsapp/auto-templates')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <AutoAwesomeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Şablonlar"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </List>
      )}

      {/* 8.6–8.7 SMS ve E-posta (geçici kapalı)
      {showMessaging && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('sms')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SmsIcon />
            </ListItemIcon>
            <ListItemText
              primary="SMS"
              primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
            />
            {openSection === 'sms' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={openSection === 'sms'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              <ListItemButton
                component={Link}
                to="/sms/bulk"
                selected={location.pathname.startsWith('/sms/bulk')}
                onClick={handleLinkClick}
                sx={getNavItemSx(theme)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CloudDownloadIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Toplu Mesaj"
                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                />
              </ListItemButton>
              <ListItemButton
                component={Link}
                to="/sms/templates"
                selected={location.pathname.startsWith('/sms/templates')}
                onClick={handleLinkClick}
                sx={getNavItemSx(theme)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AutoAwesomeIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Şablonlar"
                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                />
              </ListItemButton>
            </List>
          </Collapse>
        </List>
      )}

      {showMessaging && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('email')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <EmailIcon />
            </ListItemIcon>
            <ListItemText
              primary="E-posta"
              primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
            />
            {openSection === 'email' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={openSection === 'email'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              <ListItemButton
                component={Link}
                to="/email/bulk"
                selected={location.pathname.startsWith('/email/bulk')}
                onClick={handleLinkClick}
                sx={getNavItemSx(theme)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CloudDownloadIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Toplu E-posta"
                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                />
              </ListItemButton>
              <ListItemButton
                component={Link}
                to="/email/templates"
                selected={location.pathname.startsWith('/email/templates')}
                onClick={handleLinkClick}
                sx={getNavItemSx(theme)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AutoAwesomeIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Şablonlar"
                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                />
              </ListItemButton>
            </List>
          </Collapse>
        </List>
      )}
      */}

      {/* 8.8. KEP Sistemi */}
      {showNotifications && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            component={Link}
            to="/kep"
            selected={location.pathname.startsWith('/kep')}
            onClick={handleLinkClick}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <MarkEmailReadIcon />
            </ListItemIcon>
            <ListItemText
              primary="KEP Sistemi"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </List>
      )}

      {/* 9. Kullanıcı İşlemleri */}
      {hasUserManagementGroup && (
        <List sx={{ px: 1 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('user-management')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SupervisorAccountIcon />
            </ListItemIcon>
            <ListItemText
              primary="Kullanıcı İşlemleri"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
            {openSection === 'user-management' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={openSection === 'user-management'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {showUsers && (
                <ListItemButton
                  component={Link}
                  to="/users"
                  selected={
                    location.pathname === '/users' ||
                    (location.pathname.startsWith('/users/') &&
                      !location.pathname.startsWith('/users/applications'))
                  }
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <SupervisorAccountIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Panel Kullanıcıları"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showPanelUserApplications && (
                <ListItemButton
                  component={Link}
                  to="/users/applications"
                  selected={location.pathname === '/users/applications'}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <BadgeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Panel Kullanıcı Ekle"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showRoles && (
                <ListItemButton
                  component={Link}
                  to="/roles"
                  selected={location.pathname.startsWith('/roles')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <AdminPanelSettingsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Roller"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </List>
      )}

      {/* 10. Sistem Ayarları */}
      {hasSystemGroup && (
        <List sx={{ px: 1, pb: 2 }}>
          <ListItemButton
            onClick={() => handleSectionToggle('system')}
            sx={getNavItemSx(theme)}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Sistem Ayarları"
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            />
            {openSection === 'system' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={openSection === 'system'} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {showSystemSettings && (
                <ListItemButton
                  component={Link}
                  to="/system/settings"
                  selected={location.pathname.startsWith('/system/settings')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sistem Ayarları"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}

              {showSystemLogs && (
                <ListItemButton
                  component={Link}
                  to="/system/logs"
                  selected={location.pathname.startsWith('/system/logs')}
                  onClick={handleLinkClick}
                  sx={getNavItemSx(theme)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <ListAltIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sistem Logları"
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              )}
            </List>
          </Collapse>
        </List>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
            disableScrollLock: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              backgroundColor: '#ffffff',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* Desktop Drawer */
        (<Drawer
          variant="persistent"
          open={desktopOpen}
          sx={{
            display: { xs: 'none', md: 'block' },
            width: desktopOpen ? drawerWidth : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              backgroundColor: '#ffffff',
              boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
              transition: theme.transitions.create(['transform', 'width'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          {drawerContent}
        </Drawer>)
      )}
    </>
  );
};

export default Sidebar;
export { drawerWidth };