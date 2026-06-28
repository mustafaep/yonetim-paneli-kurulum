// src/pages/notifications/MyNotificationsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MarkAsReadIcon from '@mui/icons-material/DoneAll';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import AlarmIcon from '@mui/icons-material/Alarm';
import FilterListIcon from '@mui/icons-material/FilterList';
import InboxIcon from '@mui/icons-material/Inbox';
import { useNavigate } from 'react-router-dom';
import {
  getMyNotifications,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendNotification,
  type Notification,
  type UserNotification,
} from '../services/notificationsApi';
import { useToast } from '../../../shared/hooks/useToast';
import { useNotificationContextOptional } from '../context/NotificationContext';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { formatTimeAgo, getCategoryColor, getCategoryLabel } from '../utils/notification.utils';
import { useAuth } from '../../../app/providers/AuthContext';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';
import { getProvinces } from '../../regions/services/regionsApi';
import { getUsers } from '../../users/services/usersApi';
import type { Province } from '../../../types/region';
import type { UserListItem } from '../../../types/user';

type NotificationFormState = {
  title: string;
  message: string;
  type: 'EMAIL' | 'SMS' | 'IN_APP';
  targetType: 'ALL_MEMBERS' | 'REGION' | 'SCOPE' | 'USER';
};

// Kategoriye göre ikon döner
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'SYSTEM':       return <SettingsIcon fontSize="small" />;
    case 'FINANCIAL':    return <MonetizationOnIcon fontSize="small" />;
    case 'ANNOUNCEMENT': return <AnnouncementIcon fontSize="small" />;
    case 'REMINDER':     return <AlarmIcon fontSize="small" />;
    default:             return <NotificationsActiveIcon fontSize="small" />;
  }
};

// MUI chip renk adını gerçek tema rengine dönüştürür
const useChipColorToHex = () => {
  const theme = useTheme();
  return (chipColor: 'primary' | 'success' | 'info' | 'warning' | 'default') => {
    switch (chipColor) {
      case 'primary': return theme.palette.primary.main;
      case 'success': return theme.palette.success.main;
      case 'info':    return theme.palette.info.main;
      case 'warning': return theme.palette.warning.main;
      default:        return theme.palette.grey[500];
    }
  };
};

const MyNotificationsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const notificationContext = useNotificationContextOptional();
  const { hasPermission } = useAuth();
  const { getSettingValue } = useSystemSettings();
  const chipColorToHex = useChipColorToHex();

  const [tab, setTab] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
  const [sentLoading, setSentLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const firstDialogInputRef = useRef<HTMLInputElement>(null);

  const canNotifyAll = hasPermission('NOTIFY_ALL_MEMBERS');
  const canNotifyRegion = hasPermission('NOTIFY_REGION');
  const canNotifyScope = hasPermission('NOTIFY_OWN_SCOPE');
  const canSend = canNotifyAll || canNotifyRegion || canNotifyScope;

  const integrationEmailEnabled = getSettingValue('INTEGRATION_EMAIL_ENABLED') === 'true';
  const integrationSmsEnabled = getSettingValue('INTEGRATION_SMS_ENABLED') === 'true';
  const notificationEmailEnabled = getSettingValue('NOTIFICATION_EMAIL_ENABLED') === 'true';
  const notificationSmsEnabled = getSettingValue('NOTIFICATION_SMS_ENABLED') === 'true';

  const emailChannelAvailable = integrationEmailEnabled && notificationEmailEnabled;
  const smsChannelAvailable = integrationSmsEnabled && notificationSmsEnabled;

  const getDefaultNotificationType = (): 'EMAIL' | 'SMS' | 'IN_APP' => {
    if (emailChannelAvailable) return 'EMAIL';
    if (smsChannelAvailable) return 'SMS';
    return 'IN_APP';
  };

  const [formData, setFormData] = useState<NotificationFormState>({
    title: '',
    message: '',
    type: 'IN_APP',
    targetType: 'USER',
  });

  const availableChannels = useMemo(
    () =>
      [
        emailChannelAvailable ? 'E-posta' : null,
        smsChannelAvailable ? 'SMS' : null,
        'Uygulama İçi',
      ].filter(Boolean) as string[],
    [emailChannelAvailable, smsChannelAvailable],
  );

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const isRead = tab === 1 ? false : tab === 2 ? true : undefined;
      const category = categoryFilter !== 'ALL' ? categoryFilter : undefined;
      const result = await getMyNotifications({
        isRead,
        category: category as 'SYSTEM' | 'FINANCIAL' | 'ANNOUNCEMENT' | 'REMINDER' | undefined,
        limit: 100,
        offset: 0,
      });
      setNotifications(result.data);
    } catch (loadError: unknown) {
      console.error('Bildirimler yüklenirken hata:', loadError);
      toast.error(getApiErrorMessage(loadError, 'Bildirimler yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const loadSentNotifications = async () => {
    if (!canSend) { setSentNotifications([]); return; }
    setSentLoading(true);
    try {
      const data = await getNotifications();
      setSentNotifications(data);
    } catch (loadError: unknown) {
      console.error('Gönderilen bildirimler yüklenirken hata:', loadError);
      toast.error(getApiErrorMessage(loadError, 'Gönderilen bildirimler yüklenirken bir hata oluştu'));
    } finally {
      setSentLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!canSend || users.length > 0) return;
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (loadError: unknown) {
      console.error('Kullanıcılar yüklenirken hata:', loadError);
      toast.error(getApiErrorMessage(loadError, 'Kullanıcılar yüklenirken bir hata oluştu'));
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadProvinces = async () => {
    if ((!canNotifyRegion && !canNotifyScope) || provinces.length > 0) return;
    try {
      const data = await getProvinces();
      setProvinces(data);
    } catch (loadError: unknown) {
      console.error('İller yüklenirken hata:', loadError);
      toast.error(getApiErrorMessage(loadError, 'İller alınırken bir hata oluştu.'));
    }
  };

  useEffect(() => {
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, categoryFilter]);

  useEffect(() => {
    void loadSentNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSend]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setSelectedIds([]);
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.notificationId);
        setNotifications((prev) =>
          prev.map((item) => item.id === notification.id ? { ...item, isRead: true } : item),
        );
      } catch (readError) {
        console.error('Failed to mark as read:', readError);
      }
    }
    if (notification.notification.actionUrl) {
      navigate(notification.notification.actionUrl);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleMarkSelectedAsRead = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const notification = notifications.find((item) => item.id === id);
          if (notification && !notification.isRead) {
            return markNotificationAsRead(notification.notificationId);
          }
          return Promise.resolve();
        }),
      );
      toast.success(`${selectedIds.length} bildirim okundu işaretlendi`);
      setSelectedIds([]);
      await loadNotifications();
      notificationContext?.loadUnreadCount();
    } catch (markError) {
      console.error('Bildirimler güncellenirken hata:', markError);
      toast.error('Bildirimler güncellenirken hata oluştu');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      toast.success('Tüm bildirimler okundu işaretlendi');
      await loadNotifications();
      notificationContext?.loadUnreadCount();
    } catch (markError) {
      console.error('Tüm bildirimleri okundu işaretlerken hata:', markError);
      toast.error('Bildirimler güncellenirken hata oluştu');
    }
  };

  const handleOpenDialog = async () => {
    setFormData({ title: '', message: '', type: getDefaultNotificationType(), targetType: 'USER' });
    setSelectedProvince(null);
    setSelectedUsers([]);
    setError(null);
    await Promise.all([
      loadUsers(),
      canNotifyRegion || canNotifyScope ? loadProvinces() : Promise.resolve(),
    ]);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => { setDialogOpen(false); setError(null); };

  const handleSend = async () => {
    setError(null);
    if (!formData.title.trim() || !formData.message.trim()) { setError('Başlık ve mesaj gereklidir'); return; }
    if (formData.targetType === 'REGION' && !selectedProvince?.id) { setError('Geçerli bir il seçiniz'); return; }
    if (formData.targetType === 'SCOPE' && canNotifyRegion && !selectedProvince?.id) { setError('Kapsam seçimi gereklidir'); return; }
    if (formData.targetType === 'USER' && selectedUsers.length === 0) { setError('En az bir kullanıcı seçmelisiniz'); return; }

    setSending(true);
    try {
      if (formData.targetType === 'USER') {
        await sendNotification({
          title: formData.title, message: formData.message, type: formData.type,
          targetType: 'USER', targetId: selectedUsers[0].id,
          metadata: {
            userIds: selectedUsers.map((u) => u.id),
            userNames: selectedUsers.map((u) => `${u.firstName} ${u.lastName}`),
          },
        });
        toast.success(`${selectedUsers.length} kullanıcıya bildirim başarıyla gönderildi`);
      } else {
        const payload: NotificationFormState & { targetId?: string } = { ...formData };
        if (
          !(formData.targetType === 'SCOPE' && canNotifyScope && !canNotifyAll && !canNotifyRegion) &&
          formData.targetType !== 'ALL_MEMBERS' && selectedProvince?.id
        ) {
          payload.targetId = selectedProvince.id;
        }
        await sendNotification(payload);
        toast.success('Bildirim başarıyla gönderildi');
      }
      handleCloseDialog();
      await loadSentNotifications();
    } catch (sendError: unknown) {
      console.error('Bildirim gönderilirken hata:', sendError);
      const msg = getApiErrorMessage(sendError, 'Bildirim gönderilirken bir hata oluştu');
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  const sentColumns = useMemo<GridColDef<Notification>[]>(
    () => [
      {
        field: 'title',
        headerName: 'Başlık',
        flex: 1.5,
        minWidth: 200,
        renderCell: (params) => (
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" fontWeight={600}>{String(params.value ?? '-')}</Typography>
          </Box>
        ),
      },
      {
        field: 'type',
        headerName: 'Tür',
        width: 130,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
          const labels: Record<string, string> = { EMAIL: 'E-posta', SMS: 'SMS', IN_APP: 'Uygulama İçi' };
          return <Chip label={labels[String(params.value)] || String(params.value ?? '-')} size="small" variant="outlined" />;
        },
      },
      {
        field: 'targetType',
        headerName: 'Hedef',
        width: 160,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
          const labels: Record<string, string> = {
            ALL_MEMBERS: 'Tüm Üyeler', REGION: 'Bölge', SCOPE: 'Kapsam', USER: 'Panel Kullanıcıları',
          };
          return (
            <Chip
              label={labels[String(params.value)] || String(params.value ?? '-')}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 600,
              }}
            />
          );
        },
      },
      {
        field: 'status',
        headerName: 'Durum',
        width: 130,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
          const map: Record<string, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
            PENDING: { label: 'Bekliyor', color: 'warning' },
            SENDING: { label: 'Gönderiliyor', color: 'warning' },
            SENT: { label: 'Gönderildi', color: 'success' },
            FAILED: { label: 'Başarısız', color: 'error' },
            PARTIALLY_SENT: { label: 'Kısmi', color: 'warning' },
          };
          const entry = map[String(params.value)] ?? { label: String(params.value ?? '-'), color: 'default' as const };
          return <Chip label={entry.label} color={entry.color} size="small" sx={{ fontWeight: 600 }} />;
        },
      },
      {
        field: 'recipients',
        headerName: 'Alıcılar',
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: (params) => {
          const notification = params.row;
          const userNames = notification.metadata?.userNames;
          if (Array.isArray(userNames) && userNames.length > 0) {
            const visible = userNames.slice(0, 3);
            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                {visible.map((name) => (
                  <Chip key={name} label={name} size="small"
                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main, fontWeight: 600, height: 22, fontSize: '0.7rem' }}
                  />
                ))}
                {userNames.length > visible.length && (
                  <Chip label={`+${userNames.length - visible.length}`} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                )}
              </Box>
            );
          }
          return (
            <Typography variant="body2" color="text.secondary">
              {notification.recipientCount > 0 ? `${notification.recipientCount} alıcı` : '-'}
            </Typography>
          );
        },
      },
      {
        field: 'sentAt',
        headerName: 'Tarih',
        width: 160,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
          if (!params.value) return <Typography variant="caption" color="text.secondary">—</Typography>;
          return (
            <Typography variant="caption" color="text.secondary">
              {new Date(String(params.value)).toLocaleString('tr-TR')}
            </Typography>
          );
        },
      },
    ],
    [theme],
  );

  // DataGrid ortak stil – UsersListPage ile aynı dil
  const dataGridSx = {
    border: 'none',
    '& .MuiDataGrid-cell': {
      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
      display: 'flex',
      alignItems: 'center',
      '&:focus, &:focus-within': { outline: 'none' },
    },
    '& .MuiDataGrid-columnHeaders': {
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
    },
    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: '0.85rem' },
    '& .MuiDataGrid-row': {
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.03),
        boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
      },
      '&:nth-of-type(even)': { backgroundColor: alpha(theme.palette.grey[50], 0.3) },
    },
    '& .MuiDataGrid-footerContainer': {
      borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
      backgroundColor: alpha(theme.palette.grey[50], 0.5),
    },
  };

  return (
    <PageLayout>
      {/* ── Sayfa Başlığı ── */}
      <PageHeader
        icon={<NotificationsActiveIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Bildirimler"
        description={
          canSend
            ? 'Bildirimlerinizi yönetin ve yeni bildirimler oluşturun'
            : unreadCount > 0
              ? `${unreadCount} okunmamış bildiriminiz var`
              : 'Tüm bildirimler okundu'
        }
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
      />

      <Stack spacing={3}>

        {/* ── Özet Sayaçlar ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {[
            { label: 'Toplam Bildirim', value: notifications.length, color: theme.palette.primary.main },
            { label: 'Okunmamış', value: unreadCount, color: theme.palette.error.main },
            { label: 'Okundu', value: readCount, color: theme.palette.success.main },
            ...(canSend ? [{ label: 'Gönderilmiş', value: sentNotifications.length, color: theme.palette.info.main }] : []),
          ].map(({ label, value, color }) => (
            <Card
              key={label}
              elevation={0}
              sx={{
                flex: 1,
                borderRadius: 3,
                border: `1px solid ${alpha(color, 0.18)}`,
                background: `linear-gradient(135deg, ${alpha(color, 0.07)} 0%, ${alpha(color, 0.03)} 100%)`,
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: 2.5,
                  bgcolor: alpha(color, 0.12),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <NotificationsIcon sx={{ color, fontSize: '1.35rem' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ color, lineHeight: 1.1 }}>
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {label}
                </Typography>
              </Box>
            </Card>
          ))}
        </Stack>

        {/* ── Bildirim Gönder Kartı (yalnızca yetkili kullanıcılar) ── */}
        {canSend && (
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.05)}`,
              overflow: 'hidden',
            }}
          >
            {/* Kart Başlığı */}
            <Box
              sx={{
                p: { xs: 3, sm: 4 },
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: 3,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                      flexShrink: 0,
                    }}
                  >
                    <SendIcon sx={{ color: '#fff', fontSize: '1.4rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                      Bildirim Gönder
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      Panel kullanıcılarına hızlıca bildirim oluşturun
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleOpenDialog}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    minWidth: { xs: '100%', md: 'auto' },
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  Yeni Bildirim Oluştur
                </Button>
              </Stack>

              {/* Kanal bilgi etiketleri */}
              <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1 }}>
                {availableChannels.map((ch) => (
                  <Chip
                    key={ch} label={ch} size="small" variant="outlined"
                    sx={{ borderColor: alpha(theme.palette.primary.main, 0.3), color: theme.palette.primary.main, fontWeight: 600 }}
                  />
                ))}
                <Chip
                  label="Hedef: Panel Kullanıcıları" size="small"
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main, fontWeight: 600 }}
                />
              </Stack>
            </Box>

            {/* Gönderim Geçmişi */}
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                <Box
                  sx={{
                    width: 6, height: 24, borderRadius: 3,
                    background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                  }}
                />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Gönderim Geçmişi</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Oluşturulan bildirimlerin durumunu takip edin
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                }}
              >
                <DataGrid
                  rows={sentNotifications}
                  columns={sentColumns}
                  loading={sentLoading}
                  autoHeight
                  disableRowSelectionOnClick
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                  localeText={{ noRowsLabel: 'Henüz gönderilmiş bildirim bulunmuyor' }}
                  sx={dataGridSx}
                />
              </Box>
            </Box>
          </Card>
        )}

        {/* ── Bildirimlerim Kartı ── */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          {/* Filtre Bölümü */}
          <Box
            sx={{
              px: { xs: 3, sm: 4 },
              pt: { xs: 2.5, sm: 3 },
              pb: { xs: 2, sm: 2.5 },
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
              borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              {/* Tab'lar */}
              <Tabs
                value={tab}
                onChange={handleTabChange}
                sx={{
                  '& .MuiTabs-indicator': { borderRadius: 2, height: 3 },
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 42, fontSize: '0.88rem' },
                }}
              >
                <Tab label="Tümü" />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <span>Okunmamış</span>
                      {unreadCount > 0 && (
                        <Chip
                          label={unreadCount}
                          size="small"
                          color="error"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, '& .MuiChip-label': { px: 1 } }}
                        />
                      )}
                    </Stack>
                  }
                />
                <Tab label="Okundu" />
              </Tabs>

              {/* Sağ Kontroller */}
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <FormControl
                  size="small"
                  sx={{
                    minWidth: 160,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#fff', borderRadius: 2,
                      '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}` },
                    },
                  }}
                >
                  <InputLabel sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FilterListIcon sx={{ fontSize: '0.9rem' }} /> Kategori
                  </InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Kategori"
                  >
                    <MenuItem value="ALL">Tümü</MenuItem>
                    <MenuItem value="SYSTEM">Sistem</MenuItem>
                    <MenuItem value="FINANCIAL">Mali</MenuItem>
                    <MenuItem value="ANNOUNCEMENT">Duyuru</MenuItem>
                    <MenuItem value="REMINDER">Hatırlatma</MenuItem>
                  </Select>
                </FormControl>

                {selectedIds.length > 0 && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<MarkAsReadIcon />}
                    onClick={handleMarkSelectedAsRead}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    Okundu İşaretle ({selectedIds.length})
                  </Button>
                )}
                {unreadCount > 0 && selectedIds.length === 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<MarkAsReadIcon />}
                    onClick={handleMarkAllAsRead}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    Tümünü Okundu İşaretle
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* İçerik */}
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2 }}>
              <CircularProgress size={40} thickness={4} />
              <Typography variant="body2" color="text.secondary">Bildirimler yükleniyor…</Typography>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
              <Box
                sx={{
                  width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.07),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <InboxIcon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.4) }} />
              </Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Bildirim bulunamadı
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tab === 1
                  ? 'Okunmamış bildirim bulunmuyor. Harika iş!'
                  : 'Seçilen filtreye uygun bildirim yok.'}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification, index) => {
                const chipColor = getCategoryColor(notification.notification.category);
                const categoryHex = chipColorToHex(chipColor);
                const isUnread = !notification.isRead;
                const isSelected = selectedIds.includes(notification.id);

                return (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      disablePadding
                      sx={{
                        borderLeft: `4px solid ${isUnread ? categoryHex : 'transparent'}`,
                        bgcolor: isUnread ? alpha(categoryHex, 0.03) : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isUnread
                            ? alpha(categoryHex, 0.07)
                            : alpha(theme.palette.action.hover, 0.04),
                        },
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleNotificationClick(notification)}
                        sx={{ py: 2, px: 2.5, gap: 2, alignItems: 'flex-start' }}
                      >
                        {/* Checkbox */}
                        <Tooltip title={isSelected ? 'Seçimi kaldır' : 'Seç'} placement="top">
                          <Checkbox
                            checked={isSelected}
                            onClick={(e) => handleToggleSelect(notification.id, e)}
                            size="small"
                            sx={{ mt: 0.25, flexShrink: 0 }}
                          />
                        </Tooltip>

                        {/* Kategori Avatar */}
                        <Avatar
                          sx={{
                            width: 44, height: 44, borderRadius: 2.5, flexShrink: 0,
                            bgcolor: alpha(categoryHex, 0.12),
                            color: categoryHex,
                            mt: 0.25,
                          }}
                        >
                          {getCategoryIcon(notification.notification.category)}
                        </Avatar>

                        {/* İçerik */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 0.5 }}>
                            <Typography
                              variant="subtitle2"
                              fontWeight={isUnread ? 700 : 500}
                              sx={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: isUnread ? theme.palette.text.primary : theme.palette.text.secondary,
                              }}
                            >
                              {notification.notification.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ flexShrink: 0, fontSize: '0.72rem' }}
                            >
                              {formatTimeAgo(notification.createdAt)}
                            </Typography>
                          </Stack>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.5,
                              fontSize: '0.83rem',
                            }}
                          >
                            {notification.notification.message}
                          </Typography>

                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Chip
                              label={getCategoryLabel(notification.notification.category)}
                              size="small"
                              sx={{
                                height: 22, fontSize: '0.7rem', fontWeight: 700,
                                bgcolor: alpha(categoryHex, 0.1),
                                color: categoryHex,
                                '& .MuiChip-label': { px: 1 },
                              }}
                            />
                            {notification.notification.actionLabel && (
                              <Chip
                                label={notification.notification.actionLabel}
                                size="small"
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.7rem', '& .MuiChip-label': { px: 1 } }}
                              />
                            )}
                          </Stack>
                        </Box>

                        {/* Okundu / Okunmamış Göstergesi */}
                        {isUnread ? (
                          <Box
                            sx={{
                              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                              bgcolor: categoryHex,
                              mt: 1,
                              boxShadow: `0 0 6px ${alpha(categoryHex, 0.6)}`,
                            }}
                          />
                        ) : (
                          <CheckCircleIcon
                            fontSize="small"
                            sx={{ color: theme.palette.text.disabled, flexShrink: 0, mt: 0.5 }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                    {index < notifications.length - 1 && (
                      <Divider sx={{ ml: '108px', opacity: 0.5 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Card>
      </Stack>

      {/* ── Yeni Bildirim Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
        TransitionProps={{ onEntered: () => { firstDialogInputRef.current?.focus(); } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SendIcon sx={{ color: theme.palette.primary.main, fontSize: '1.1rem' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Yeni Bildirim Gönder</Typography>
          </Stack>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              inputRef={firstDialogInputRef}
              label="Başlık"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required fullWidth autoFocus
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              label="Mesaj"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required multiline rows={5} fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Tür</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'EMAIL' | 'SMS' | 'IN_APP' })}
                  label="Tür"
                  sx={{ borderRadius: 2 }}
                >
                  {emailChannelAvailable && <MenuItem value="EMAIL">E-posta</MenuItem>}
                  {smsChannelAvailable && <MenuItem value="SMS">SMS</MenuItem>}
                  <MenuItem value="IN_APP">Uygulama İçi</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Hedef Tip</InputLabel>
                <Select
                  value={formData.targetType}
                  onChange={(e) => {
                    const next = e.target.value as 'ALL_MEMBERS' | 'REGION' | 'SCOPE' | 'USER';
                    setFormData({ ...formData, targetType: next });
                    if (next !== 'USER') setSelectedUsers([]);
                    if (next !== 'REGION' && next !== 'SCOPE') setSelectedProvince(null);
                  }}
                  label="Hedef Tip"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="USER">Panel Kullanıcıları</MenuItem>
                  <MenuItem value="ALL_MEMBERS" disabled>Tüm Üyeler (şu an devre dışı)</MenuItem>
                  <MenuItem value="REGION" disabled>Bölge (şu an devre dışı)</MenuItem>
                  <MenuItem value="SCOPE" disabled>Kapsam (şu an devre dışı)</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {formData.targetType === 'USER' && (
              <Autocomplete
                multiple options={users} loading={loadingUsers}
                getOptionLabel={(opt) => `${opt.firstName} ${opt.lastName}${opt.email ? ` (${opt.email})` : ''}`}
                value={selectedUsers}
                onChange={(_, newValue) => setSelectedUsers(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params} label="Kullanıcı Seçin" placeholder="Kullanıcıları seçin…" required
                    helperText={selectedUsers.length > 0 ? `${selectedUsers.length} kullanıcı seçildi` : 'Bildirim göndermek istediğiniz kullanıcıları seçin'}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((opt, index) => (
                    <Chip {...getTagProps({ index })} key={opt.id} label={`${opt.firstName} ${opt.lastName}`} size="small"
                      sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, fontWeight: 600 }}
                    />
                  ))
                }
              />
            )}

            {formData.targetType === 'REGION' && (
              <Autocomplete
                options={provinces}
                getOptionLabel={(opt) => `${opt.name}${opt.code ? ` (${opt.code})` : ''}`}
                value={selectedProvince} onChange={(_, v) => setSelectedProvince(v)}
                renderInput={(params) => (
                  <TextField {...params} label="İl Seçimi" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                )}
              />
            )}

            {formData.targetType === 'SCOPE' && (
              <>
                {canNotifyScope && !canNotifyAll && !canNotifyRegion ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Bildirim, yetki alanınızdaki üyelere otomatik gönderilir. İl seçimi gerekmez.
                  </Alert>
                ) : (
                  <Autocomplete
                    options={provinces}
                    getOptionLabel={(opt) => `${opt.name}${opt.code ? ` (${opt.code})` : ''}`}
                    value={selectedProvince} onChange={(_, v) => setSelectedProvince(v)}
                    renderInput={(params) => (
                      <TextField {...params} label="İl Seçimi" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )}
                  />
                )}
              </>
            )}
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={handleCloseDialog} disabled={sending} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            İptal
          </Button>
          <Button
            onClick={handleSend} variant="contained" disabled={sending}
            startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` }}
          >
            {sending ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default MyNotificationsPage;
