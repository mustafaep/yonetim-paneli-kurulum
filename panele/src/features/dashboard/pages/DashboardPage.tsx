// src/pages/dashboard/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  Paper,
  Avatar,
  Stack,
  Divider,
  alpha,
  useTheme,
  useMediaQuery,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  IconButton,
} from '@mui/material';

import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import MapIcon from '@mui/icons-material/Map';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BadgeIcon from '@mui/icons-material/Badge';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { getMemberApplications, getMembers } from '../../members/services/membersApi';
import { getUsers } from '../../users/services/usersApi';
import { getPayments } from '../../payments/services/paymentsApi';
import type { MemberListItem } from '../../../types/member';
import type { MemberPayment } from '../../payments/services/paymentsApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasPermission } = useAuth();
  const { getSettingValue } = useSystemSettings();
  const toast = useToast();

  const canViewApplications =
    hasPermission('MEMBER_APPLICATIONS_VIEW') ||
    hasPermission('MEMBER_APPROVE') ||
    hasPermission('MEMBER_REJECT');
  const canListMembers = hasPermission('MEMBER_LIST');
  /** Kesinti listesi / detay — dashboard’daki tahsilat ve kesinti kartları için */
  const canViewMemberPayments =
    hasPermission('MEMBER_PAYMENT_LIST') || hasPermission('MEMBER_PAYMENT_VIEW');
  const canCreateMemberApplication = hasPermission('MEMBER_CREATE_APPLICATION');
  const canManageRegions = hasPermission('BRANCH_MANAGE') || hasPermission('REGION_LIST');
  const canListUsers = hasPermission('USER_LIST');
  const showQuickActions = getSettingValue('DASHBOARD_SHOW_QUICK_ACTIONS', 'true') === 'true';
  const showStatCards = getSettingValue('DASHBOARD_SHOW_STAT_CARDS', 'true') === 'true';
  const showRecentMembers = getSettingValue('DASHBOARD_SHOW_RECENT_MEMBERS', 'true') === 'true';
  const showRecentPayments = getSettingValue('DASHBOARD_SHOW_RECENT_PAYMENTS', 'true') === 'true';
  const showPaymentStats = getSettingValue('DASHBOARD_SHOW_PAYMENT_STATS', 'true') === 'true';
  const showMemberStats = getSettingValue('DASHBOARD_SHOW_MEMBER_STATS', 'true') === 'true';
  const showApplicationManagement = getSettingValue('DASHBOARD_SHOW_APPLICATION_MANAGEMENT', 'true') === 'true';
  const showUserStats = getSettingValue('DASHBOARD_SHOW_USER_STATS', 'true') === 'true';

  const [pendingApplicationsCount, setPendingApplicationsCount] = useState<number>(0);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  
  // Statistics state
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [activeMembers, setActiveMembers] = useState<number>(0);
  const [inactiveMembers, setInactiveMembers] = useState<number>(0);
  const [resignedMembers, setResignedMembers] = useState<number>(0);
  const [expelledMembers, setExpelledMembers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // Recent members and payments
  const [recentMembers, setRecentMembers] = useState<MemberListItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<MemberPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Payment statistics
  const [totalPaymentsAmount, setTotalPaymentsAmount] = useState<number>(0);
  const [approvedPaymentsAmount, setApprovedPaymentsAmount] = useState<number>(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);
  const [thisMonthPaymentsAmount, setThisMonthPaymentsAmount] = useState<number>(0);

  useEffect(() => {
    const loadApplications = async () => {
      if (!canViewApplications) return;
      setApplicationsLoading(true);
      try {
        const data = await getMemberApplications();
        setPendingApplicationsCount(Array.isArray(data) ? data.length : 0);
      } catch (e: unknown) {
        console.error('Başvurular alınırken hata:', e);
        setPendingApplicationsCount(0);
        toast.showError(getApiErrorMessage(e, 'Başvurular alınırken bir hata oluştu.'));
      } finally {
        setApplicationsLoading(false);
      }
    };

    loadApplications();
  }, [canViewApplications]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!canListMembers) return;
      setMembersLoading(true);
      try {
        const data = await getMembers();
        const members = Array.isArray(data) ? data : [];
        setTotalMembers(members.length);
        setActiveMembers(members.filter(m => m.status === 'ACTIVE').length);
        setInactiveMembers(members.filter(m => m.status === 'INACTIVE').length);
        setResignedMembers(members.filter(m => m.status === 'RESIGNED').length);
        setExpelledMembers(members.filter(m => m.status === 'EXPELLED').length);
        
        // Son 5 üye
        const sortedMembers = [...members].sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setRecentMembers(sortedMembers.slice(0, 5));
      } catch (e: unknown) {
        console.error('Üyeler alınırken hata:', e);
        setTotalMembers(0);
        setActiveMembers(0);
        setInactiveMembers(0);
        setResignedMembers(0);
        setExpelledMembers(0);
        setRecentMembers([]);
        toast.showError(getApiErrorMessage(e, 'Üyeler alınırken bir hata oluştu.'));
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, [canListMembers]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!canListUsers) return;
      setUsersLoading(true);
      try {
        const data = await getUsers();
        const users = Array.isArray(data) ? data : [];
        setTotalUsers(users.length);
        setActiveUsers(users.filter(u => u.isActive).length);
      } catch (e: unknown) {
        console.error('Kullanıcılar alınırken hata:', e);
        setTotalUsers(0);
        setActiveUsers(0);
        toast.showError(getApiErrorMessage(e, 'Kullanıcılar alınırken bir hata oluştu.'));
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [canListUsers]);

  useEffect(() => {
    const loadPayments = async () => {
      if (!canViewMemberPayments) return;
      setPaymentsLoading(true);
      try {
        const data = await getPayments();
        const payments = Array.isArray(data) ? data : [];
        
        // Son 5 Kesinti
        const sortedPayments = [...payments].sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setRecentPayments(sortedPayments.slice(0, 5));

        // Toplam Kesinti tutarı
        const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        setTotalPaymentsAmount(total);

        // Onaylanmış Kesintiler tutarı
        const approved = payments.filter(p => p.isApproved).reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        setApprovedPaymentsAmount(approved);

        // Bekleyen Kesintiler sayısı
        const pending = payments.filter(p => !p.isApproved).length;
        setPendingPaymentsCount(pending);

        // Bu ay yapılan Kesintiler
        const now = new Date();
        const thisMonth = payments.filter(p => {
          const paymentDate = new Date(p.createdAt);
          return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
        }).reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        setThisMonthPaymentsAmount(thisMonth);
      } catch (e: unknown) {
        console.error('Kesintiler alınırken hata:', e);
        setRecentPayments([]);
        setTotalPaymentsAmount(0);
        setApprovedPaymentsAmount(0);
        setPendingPaymentsCount(0);
        setThisMonthPaymentsAmount(0);
        toast.showError(getApiErrorMessage(e, 'Kesintiler alınırken bir hata oluştu.'));
      } finally {
        setPaymentsLoading(false);
      }
    };

    loadPayments();
  }, [canViewMemberPayments]);

  const hasAnyPermission = canViewApplications || canListMembers || canListUsers || canCreateMemberApplication || canManageRegions;
  
  if (!hasAnyPermission) {
    return (
      <Box>
        <Paper 
          sx={{ 
            p: { xs: 3, sm: 4, md: 6 }, 
            textAlign: 'center',
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.light, 0.05)} 100%)`,
          }}
        >
          <WarningAmberIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Dashboard Erişimi
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
            Dashboard verilerini görmek için gerekli izinlere sahip değilsiniz. Lütfen sistem yöneticinizle iletişime geçin.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const quickActions = [
    {
      show: canCreateMemberApplication,
      title: 'Üye Başvuruları',
      description: 'Yeni üye başvurusu oluşturun veya bekleyen başvuruları yönetin',
      icon: PersonAddAlt1Icon,
      path: '/members/applications',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#667eea',
    },
    {
      show: canListMembers,
      title: 'Üyeler',
      description: 'Beklemedeki üye başvurularını görüntüleyin ve yönetin',
      icon: BadgeIcon,
      path: '/members/waiting',
      gradient: 'linear-gradient(135deg, #fa8bff 0%, #2bd2ff 100%)',
      color: '#fa8bff',
    },
    {
      show: canManageRegions,
      title: 'Bölge Yönetimi',
      description: 'İl, ilçe ve işyerlerini yönetin',
      icon: MapIcon,
      path: '/regions/provinces',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#f093fb',
    },
    {
      show: canListUsers,
      title: 'Kullanıcı Yönetimi',
      description: 'Panel kullanıcılarını, rollerini ve yetkilerini yönetin',
      icon: ManageAccountsIcon,
      path: '/users',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#4facfe',
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        icon={<TrendingUpIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Dashboard"
        description="Sendika yönetim sistemi genel görünümü"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
      />
      {/* Hızlı Aksiyon Kartları */}
      {showQuickActions && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
          {quickActions.filter(action => action.show).map((action) => (
          <Grid
            key={action.path}
            size={{
              xs: 12,
              sm: 6,
              md: 6,
              lg: 3
            }}>
            <Card
              sx={{
                cursor: 'pointer',
                height: '100%',
                minHeight: { xs: 140, sm: 160 },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4,
                background: '#fff',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: `0 20px 40px ${alpha(action.color, 0.2)}`,
                  border: `1px solid ${alpha(action.color, 0.3)}`,
                  '& .action-icon': {
                    transform: 'scale(1.1) rotate(5deg)',
                  },
                  '& .arrow-icon': {
                    transform: 'translateX(4px)',
                    opacity: 1,
                  },
                },
              }}
              onClick={() => navigate(action.path)}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: action.gradient,
                }}
              />
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    className="action-icon"
                    sx={{
                      width: { xs: 48, sm: 56 },
                      height: { xs: 48, sm: 56 },
                      borderRadius: 2.5,
                      background: action.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      boxShadow: `0 8px 16px ${alpha(action.color, 0.3)}`,
                    }}
                  >
                    <action.icon sx={{ color: 'white', fontSize: { xs: 24, sm: 28 } }} />
                  </Box>
                  <ArrowForwardIcon 
                    className="arrow-icon"
                    sx={{ 
                      color: action.color, 
                      opacity: 0,
                      transition: 'all 0.3s ease',
                      fontSize: 20,
                    }} 
                  />
                </Box>
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  gutterBottom
                  sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}
                >
                  {action.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    lineHeight: 1.6,
                    fontSize: { xs: '0.85rem', sm: '0.875rem' },
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          ))}
        </Grid>
      )}
      {/* Statistics Cards */}
      {showStatCards && (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
        {/* Pending Applications */}
        {canViewApplications && (
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 6,
              lg: 3
            }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                borderRadius: 3,
                height: '100%',
                minHeight: { xs: 130, sm: 140 },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px ${alpha('#fa709a', 0.3)}`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: alpha('#fff', 0.1),
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                },
              }}
              onClick={() => navigate('/members/applications')}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative', zIndex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, fontWeight: 600 }}>
                      Bekleyen Başvurular
                    </Typography>
                    {applicationsLoading ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '2.75rem' }, mb: 0.5 }}>
                        {pendingApplicationsCount}
                      </Typography>
                    )}
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <AccessTimeIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                      <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                        Onay Bekliyor
                      </Typography>
                    </Stack>
                  </Box>
                  <Avatar 
                    sx={{ 
                      bgcolor: alpha('#fff', 0.2),
                      width: { xs: 48, sm: 56 }, 
                      height: { xs: 48, sm: 56 },
                      boxShadow: `0 4px 12px ${alpha('#000', 0.2)}`,
                    }}
                  >
                    <PendingActionsIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Active Members */}
        {canListMembers && (
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 6,
              lg: 3
            }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 3,
                height: '100%',
                minHeight: { xs: 130, sm: 140 },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px ${alpha('#667eea', 0.3)}`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: alpha('#fff', 0.1),
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                },
              }}
              onClick={() => navigate('/members')}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative', zIndex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, fontWeight: 600 }}>
                      Aktif Üyeler
                    </Typography>
                    {membersLoading ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '2.75rem' }, mb: 0.5 }}>
                        {activeMembers}
                      </Typography>
                    )}
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <TrendingUpIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                      <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                        Toplam: {totalMembers}
                      </Typography>
                    </Stack>
                  </Box>
                  <Avatar 
                    sx={{ 
                      bgcolor: alpha('#fff', 0.2),
                      width: { xs: 48, sm: 56 }, 
                      height: { xs: 48, sm: 56 },
                      boxShadow: `0 4px 12px ${alpha('#000', 0.2)}`,
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Total Payments */}
        {canViewMemberPayments && (
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 6,
              lg: 3
            }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                borderRadius: 3,
                height: '100%',
                minHeight: { xs: 130, sm: 140 },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px ${alpha('#43e97b', 0.3)}`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: alpha('#fff', 0.1),
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                },
              }}
              onClick={() => navigate('/payments')}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative', zIndex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, fontWeight: 600 }}>
                      Toplam Tahsilat
                    </Typography>
                    {paymentsLoading ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }, mb: 0.5 }}>
                        {approvedPaymentsAmount.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ₺
                      </Typography>
                    )}
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CheckCircleIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                      <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                        Onaylı Kesintiler
                      </Typography>
                    </Stack>
                  </Box>
                  <Avatar 
                    sx={{ 
                      bgcolor: alpha('#fff', 0.2),
                      width: { xs: 48, sm: 56 }, 
                      height: { xs: 48, sm: 56 },
                      boxShadow: `0 4px 12px ${alpha('#000', 0.2)}`,
                    }}
                  >
                    <AccountBalanceWalletIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Total Users */}
        {canListUsers && (
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 6,
              lg: 3
            }}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                borderRadius: 3,
                height: '100%',
                minHeight: { xs: 130, sm: 140 },
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px ${alpha('#4facfe', 0.3)}`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: alpha('#fff', 0.1),
                  borderRadius: '50%',
                  transform: 'translate(30%, -30%)',
                },
              }}
              onClick={() => navigate('/users')}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative', zIndex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' }, fontWeight: 600 }}>
                      Panel Kullanıcıları
                    </Typography>
                    {usersLoading ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '2.75rem' }, mb: 0.5 }}>
                        {totalUsers}
                      </Typography>
                    )}
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CheckCircleIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                      <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                        Aktif: {activeUsers}
                      </Typography>
                    </Stack>
                  </Box>
                  <Avatar 
                    sx={{ 
                      bgcolor: alpha('#fff', 0.2),
                      width: { xs: 48, sm: 56 }, 
                      height: { xs: 48, sm: 56 },
                      boxShadow: `0 4px 12px ${alpha('#000', 0.2)}`,
                    }}
                  >
                    <ManageAccountsIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
        </Grid>
      )}
      {/* Detailed Statistics Section */}
      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
        {/* Recent Members */}
        {canListMembers && showRecentMembers && (
          <Grid
            size={{
              xs: 12,
              lg: 6
            }}>
            <Card 
              sx={{ 
                borderRadius: 4, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), width: 40, height: 40 }}>
                      <PersonAddAlt1Icon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                      Son Eklenen Üyeler
                    </Typography>
                  </Stack>
                  <Chip 
                    label={`${recentMembers.length} Üye`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                {membersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : recentMembers.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">Henüz üye bulunmuyor</Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {recentMembers.map((member, index) => (
                      <ListItem
                        key={member.id}
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderRadius: 2,
                          mb: index < recentMembers.length - 1 ? 1 : 0,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            transform: 'translateX(4px)',
                          },
                        }}
                        onClick={() => navigate(`/members/${member.id}`)}
                        secondaryAction={
                          <Tooltip title="Detayları Görüntüle">
                            <IconButton edge="end" size="small">
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              bgcolor: alpha(theme.palette.primary.main, 0.15),
                              color: theme.palette.primary.main,
                              fontWeight: 700,
                            }}
                          >
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}>
                              {member.firstName} {member.lastName}
                            </Typography>
                          }
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                              {member.registrationNumber && (
                                <Chip 
                                  label={`#${member.registrationNumber}`} 
                                  size="small" 
                                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                              )}
                              {member.branch && (
                                <Chip 
                                  label={member.branch.name} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                              {member.status === 'ACTIVE' && (
                                <Chip 
                                  label="Aktif" 
                                  size="small" 
                                  color="success"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Stack>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/members')}
                  sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
                  endIcon={<ArrowForwardIcon />}
                >
                  Tüm Üyeleri Görüntüle
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Payments */}
        {canViewMemberPayments && showRecentPayments && (
          <Grid
            size={{
              xs: 12,
              lg: 6
            }}>
            <Card 
              sx={{ 
                borderRadius: 4, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                boxShadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.08)}`,
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), width: 40, height: 40 }}>
                      <PaymentIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                      Son Kesintiler
                    </Typography>
                  </Stack>
                  <Chip 
                    label={`${recentPayments.length} Kesinti`} 
                    size="small" 
                    color="success" 
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                {paymentsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : recentPayments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <PaymentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">Henüz Kesinti bulunmuyor</Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {recentPayments.map((payment, index) => {
                      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
                      const monthName = monthNames[payment.paymentPeriodMonth - 1];
                      
                      return (
                        <ListItem
                          key={payment.id}
                          sx={{
                            px: 2,
                            py: 1.5,
                            borderRadius: 2,
                            mb: index < recentPayments.length - 1 ? 1 : 0,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.success.main, 0.05),
                            },
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar 
                              sx={{ 
                                bgcolor: payment.isApproved 
                                  ? alpha(theme.palette.success.main, 0.15)
                                  : alpha(theme.palette.warning.main, 0.15),
                                color: payment.isApproved 
                                  ? theme.palette.success.main
                                  : theme.palette.warning.main,
                              }}
                            >
                              {payment.isApproved ? (
                                <CheckCircleIcon fontSize="small" />
                              ) : (
                                <AccessTimeIcon fontSize="small" />
                              )}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}>
                                  {payment.member?.firstName} {payment.member?.lastName}
                                </Typography>
                                {payment.member?.registrationNumber && (
                                  <Chip 
                                    label={`#${payment.member.registrationNumber}`} 
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Stack>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                                <Chip 
                                  label={`${monthName} ${payment.paymentPeriodYear}`} 
                                  size="small" 
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 700,
                                    color: theme.palette.success.main,
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {parseFloat(payment.amount).toLocaleString('tr-TR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })} ₺
                                </Typography>
                              </Stack>
                            }
                            primaryTypographyProps={{ component: 'div' }}
                            secondaryTypographyProps={{ component: 'div' }}
                          />
                          {payment.isApproved ? (
                            <Chip 
                              label="Onaylı" 
                              size="small" 
                              color="success"
                              icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          ) : (
                            <Chip 
                              label="Bekliyor" 
                              size="small" 
                              color="warning"
                              icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/payments')}
                  sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
                  endIcon={<ArrowForwardIcon />}
                  color="success"
                >
                  Tüm Kesintileri Görüntüle
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Payment Statistics */}
        {canViewMemberPayments && showPaymentStats && (
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Card 
              sx={{ 
                borderRadius: 4, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                boxShadow: `0 2px 8px ${alpha(theme.palette.info.main, 0.08)}`,
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), width: 40, height: 40 }}>
                    <AccountBalanceWalletIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                    Kesinti İstatistikleri
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                {paymentsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : (
                  <Stack spacing={3}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                          Toplam Tahsilat
                        </Typography>
                        <Chip
                          label={`${totalPaymentsAmount.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} ₺`}
                          color="info"
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                        />
                      </Stack>
                      <LinearProgress 
                        variant="determinate" 
                        value={totalPaymentsAmount > 0 ? (approvedPaymentsAmount / totalPaymentsAmount) * 100 : 0} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)',
                          },
                        }} 
                      />
                    </Box>
                    
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                            Onaylı Kesintiler
                          </Typography>
                        </Stack>
                        <Typography variant="body1" fontWeight={700} color="success.main" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                          {approvedPaymentsAmount.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} ₺
                        </Typography>
                      </Stack>
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <AccessTimeIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                            Bekleyen Kesintiler
                          </Typography>
                        </Stack>
                        <Chip
                          label={`${pendingPaymentsCount} Adet`}
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CalendarTodayIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                            Bu Ay Tahsilat
                          </Typography>
                        </Stack>
                        <Typography variant="body1" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                          {thisMonthPaymentsAmount.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} ₺
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
        {/* Member Statistics */}
        {canListMembers && showMemberStats && (
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Card 
              sx={{ 
                borderRadius: 4, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), width: 40, height: 40 }}>
                    <PeopleIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                    Üye İstatistikleri
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                {membersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : (
                  <Stack spacing={3}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                          Toplam Üyeler
                        </Typography>
                        <Chip
                          label={totalMembers}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>
                      <LinearProgress 
                        variant="determinate" 
                        value={totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                          },
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                        %{totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0} Aktif Üye Oranı
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                            Aktif Üyeler
                          </Typography>
                        </Stack>
                        <Chip
                          label={activeMembers}
                          color="success"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>
                    </Box>
                    
                    {(inactiveMembers > 0 || resignedMembers > 0 || expelledMembers > 0) && (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <PersonOffIcon sx={{ fontSize: 18, color: 'error.main' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                              Pasif/İptal Üyeler
                            </Typography>
                          </Stack>
                          <Chip
                            label={inactiveMembers + resignedMembers + expelledMembers}
                            color="default"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
                          {inactiveMembers > 0 && (
                            <Chip 
                              label={`Pasif: ${inactiveMembers}`} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          )}
                          {resignedMembers > 0 && (
                            <Chip 
                              label={`İstifa: ${resignedMembers}`} 
                              size="small" 
                              variant="outlined"
                              color="warning"
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          )}
                          {expelledMembers > 0 && (
                            <Chip 
                              label={`İhraç: ${expelledMembers}`} 
                              size="small" 
                              variant="outlined"
                              color="error"
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    )}
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate('/members')}
                      sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                      endIcon={<ArrowForwardIcon />}
                    >
                      Tüm Üyeleri Görüntüle
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Quick Info & Applications */}
        {canViewApplications && showApplicationManagement && (
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Card 
              sx={{ 
                borderRadius: 4, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                boxShadow: `0 2px 8px ${alpha(theme.palette.warning.main, 0.08)}`,
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), width: 40, height: 40 }}>
                    <PendingActionsIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                    Başvuru Yönetimi
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                {applicationsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : (
                  <Stack spacing={2.5}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${alpha(theme.palette.warning.light, 0.04)} 100%)`,
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.3)}`,
                            }}
                          >
                            <PendingActionsIcon sx={{ fontSize: 24 }} />
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                              BEKLEYEN BAŞVURULAR
                            </Typography>
                            <Typography variant="h3" fontWeight={700} color="warning.main">
                              {pendingApplicationsCount}
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    </Box>
                    
                    {pendingApplicationsCount > 0 && (
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.warning.main, 0.04),
                          border: `1px dashed ${alpha(theme.palette.warning.main, 0.3)}`,
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <AccessTimeIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            {pendingApplicationsCount} başvuru onayınızı bekliyor
                          </Typography>
                        </Stack>
                      </Box>
                    )}
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate('/members/applications')}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                      endIcon={<ArrowForwardIcon />}
                      color="warning"
                    >
                      Başvuruları İncele
                    </Button>
                    
                    {canCreateMemberApplication && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate('/members/applications/new')}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                        startIcon={<PersonAddAlt1Icon />}
                        color="warning"
                      >
                        Yeni Başvuru Oluştur
                      </Button>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* User Statistics */}
        {canListUsers && showUserStats && (
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <Card 
              sx={{ 
                borderRadius: 4, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                boxShadow: `0 2px 8px ${alpha(theme.palette.info.main, 0.08)}`,
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), width: 40, height: 40 }}>
                    <ManageAccountsIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                    Kullanıcı İstatistikleri
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 3 }} />
                {usersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : (
                  <Stack spacing={3}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                          Toplam Kullanıcılar
                        </Typography>
                        <Chip
                          label={totalUsers}
                          color="info"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>
                      <LinearProgress 
                        variant="determinate" 
                        value={totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                          },
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                        %{totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0} Aktif Kullanıcı Oranı
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                            Aktif Kullanıcılar
                          </Typography>
                        </Stack>
                        <Chip
                          label={activeUsers}
                          color="success"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>
                    </Box>
                    
                    {totalUsers > activeUsers && (
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.error.main, 0.04),
                          border: `1px dashed ${alpha(theme.palette.error.main, 0.3)}`,
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <PersonOffIcon sx={{ fontSize: 18, color: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            {totalUsers - activeUsers} pasif kullanıcı
                          </Typography>
                        </Stack>
                      </Box>
                    )}
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate('/users')}
                      sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                      endIcon={<ArrowForwardIcon />}
                      color="info"
                    >
                      Tüm Kullanıcıları Görüntüle
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </PageLayout>
  );
};

export default DashboardPage;