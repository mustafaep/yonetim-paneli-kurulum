// src/pages/notifications/NotificationsPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme,
  alpha,
  Chip,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SendIcon from '@mui/icons-material/Send';

import type { Notification } from '../services/notificationsApi';
import { sendNotification, getNotifications } from '../services/notificationsApi';
import { getProvinces } from '../../regions/services/regionsApi';
import { getUsers } from '../../users/services/usersApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useSystemSettings } from '../../../app/providers/SystemSettingsContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import type { Province } from '../../../types/region';
import type { UserListItem } from '../../../types/user';
import PageLayout from '../../../shared/components/layout/PageLayout';
import PageHeader from '../../../shared/components/layout/PageHeader';

const NotificationsPage: React.FC = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const { getSettingValue } = useSystemSettings();
  const toast = useToast();

  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'IN_APP' as 'EMAIL' | 'SMS' | 'IN_APP',
    targetType: 'USER' as 'ALL_MEMBERS' | 'REGION' | 'SCOPE' | 'USER',
  });

  const firstDialogInputRef = useRef<HTMLInputElement>(null);

  const canNotifyAll = hasPermission('NOTIFY_ALL_MEMBERS');
  const canNotifyRegion = hasPermission('NOTIFY_REGION');
  const canNotifyScope = hasPermission('NOTIFY_OWN_SCOPE');

  const canSend = canNotifyAll || canNotifyRegion || canNotifyScope;

  // Sistem ayarlarına göre entegrasyon ve bildirim kanalları kontrolü
  const integrationEmailEnabled = getSettingValue('INTEGRATION_EMAIL_ENABLED') === 'true';
  const integrationSmsEnabled = getSettingValue('INTEGRATION_SMS_ENABLED') === 'true';
  const notificationEmailEnabled = getSettingValue('NOTIFICATION_EMAIL_ENABLED') === 'true';
  const notificationSmsEnabled = getSettingValue('NOTIFICATION_SMS_ENABLED') === 'true';

  // E-posta kanalı: Hem entegrasyon hem de bildirim kanalı aktif olmalı
  const emailChannelAvailable = integrationEmailEnabled && notificationEmailEnabled;
  // SMS kanalı: Hem entegrasyon hem de bildirim kanalı aktif olmalı
  const smsChannelAvailable = integrationSmsEnabled && notificationSmsEnabled;

  useEffect(() => {
    loadNotifications();
    loadUsers();
    if (canNotifyRegion || canNotifyScope) {
      loadProvinces();
    }
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setRows(data);
    } catch (e: unknown) {
      console.error('Bildirimler yüklenirken hata:', e);
      toast.error(getApiErrorMessage(e, 'Bildirimler yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const loadProvinces = async () => {
    try {
      const data = await getProvinces();
      setProvinces(data);
    } catch (e: unknown) {
      console.error('İller yüklenirken hata:', e);
      toast.error(getApiErrorMessage(e, 'İller alınırken bir hata oluştu.'));
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e: unknown) {
      console.error('Kullanıcılar yüklenirken hata:', e);
      toast.error(getApiErrorMessage(e, 'Kullanıcılar yüklenirken bir hata oluştu'));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenDialog = () => {
    // Varsayılan tip: İlk mevcut kanalı seç, yoksa IN_APP
    let defaultType: 'EMAIL' | 'SMS' | 'IN_APP' = 'IN_APP';
    if (emailChannelAvailable) {
      defaultType = 'EMAIL';
    } else if (smsChannelAvailable) {
      defaultType = 'SMS';
    }

    // Şu an sadece Panel Kullanıcıları hedef tipi kullanılıyor
    const defaultTargetType: 'ALL_MEMBERS' | 'REGION' | 'SCOPE' | 'USER' = 'USER';

    setFormData({
        title: '',
        message: '',
      type: defaultType,
      targetType: defaultTargetType,
    });
    setSelectedProvince(null);
    setSelectedUsers([]);
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError(null);
  };

  const handleSend = async () => {
    setError(null);

    // Başlık ve mesaj kontrolü
    if (!formData.title.trim() || !formData.message.trim()) {
      setError('Başlık ve mesaj gereklidir');
      return;
    }

    // Hedef kontrolü
    if (formData.targetType === 'REGION') {
      if (!selectedProvince) {
        setError('Bölge seçimi gereklidir');
        return;
      }
      if (!selectedProvince.id) {
        setError('Geçerli bir il seçiniz');
        return;
      }
    }
    
    // SCOPE için: Eğer sadece NOTIFY_OWN_SCOPE izni varsa, il seçimi gerekmez (backend otomatik yapıyor)
    // Ama eğer NOTIFY_REGION da varsa, kullanıcı manuel seçim yapabilir
    if (formData.targetType === 'SCOPE' && canNotifyRegion) {
      if (!selectedProvince) {
        setError('Kapsam seçimi gereklidir');
        return;
      }
      if (!selectedProvince.id) {
        setError('Geçerli bir il seçiniz');
        return;
      }
    }

    if (formData.targetType === 'USER') {
      if (selectedUsers.length === 0) {
        setError('En az bir kullanıcı seçmelisiniz');
        return;
      }
    }

    // Birden fazla kullanıcı seçildiyse tek bildirim gönder (metadata içinde userIds array'i ile)
    if (formData.targetType === 'USER' && selectedUsers.length > 0) {
      setSending(true);

      try {
        // Tek bir bildirim oluştur, metadata içinde tüm kullanıcı ID'lerini gönder
        const payload: any = {
          title: formData.title,
          message: formData.message,
          type: formData.type,
          targetType: 'USER',
          targetId: selectedUsers[0].id, // İlk kullanıcı ID'si (geriye dönük uyumluluk için)
          metadata: {
            userIds: selectedUsers.map((u) => u.id),
            userNames: selectedUsers.map((u) => `${u.firstName} ${u.lastName}`),
          },
        };

        await sendNotification(payload);
        toast.success(`${selectedUsers.length} kullanıcıya bildirim başarıyla gönderildi`);
        handleCloseDialog();
        await loadNotifications();
      } catch (e: unknown) {
        console.error('Bildirim gönderilirken hata:', e);
        const errorMessage = getApiErrorMessage(e, 'Bildirim gönderilirken bir hata oluştu');
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setSending(false);
      }
      return;
    }

    // Diğer hedef tipleri için normal gönderim
    const payload: any = {
      ...formData,
    };

    // SCOPE için: Eğer sadece NOTIFY_OWN_SCOPE izni varsa, targetId gönderme (backend otomatik scope kullanacak)
    // Ama eğer NOTIFY_REGION da varsa ve kullanıcı manuel seçim yaptıysa, targetId gönder
    if (formData.targetType === 'SCOPE' && canNotifyScope && !canNotifyAll && !canNotifyRegion) {
      // Backend otomatik olarak kullanıcının scope'unu kullanacak, targetId gerekmez
    } else if (formData.targetType !== 'ALL_MEMBERS' && selectedProvince?.id) {
      payload.targetId = selectedProvince.id;
    }

    setSending(true);

    try {
      await sendNotification(payload);
      toast.success('Bildirim başarıyla gönderildi');
      handleCloseDialog();
      await loadNotifications();
    } catch (e: unknown) {
      console.error('Bildirim gönderilirken hata:', e);
      const errorMessage = getApiErrorMessage(e, 'Bildirim gönderilirken bir hata oluştu');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'title',
      headerName: 'Başlık',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'type',
      headerName: 'Tür',
      width: 120,
      renderCell: (params) => {
        const typeLabels: Record<string, string> = {
          EMAIL: 'E-posta',
          SMS: 'SMS',
          IN_APP: 'Uygulama İçi',
        };
        return <Chip label={typeLabels[params.value] || params.value} size="small" />;
      },
    },
    {
      field: 'targetType',
      headerName: 'Hedef',
      width: 150,
      renderCell: (params) => {
        const targetLabels: Record<string, string> = {
                  ALL_MEMBERS: 'Tüm Üyeler',
                  REGION: 'Bölge',
                  SCOPE: 'Kapsam',
                  USER: 'Panel Kullanıcıları',
                };
                return <Chip label={targetLabels[params.value] || params.value} size="small" color="primary" />;
              },
            },
    {
      field: 'status',
      headerName: 'Durum',
      width: 120,
      renderCell: (params) => {
        const statusColors: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
          PENDING: 'warning',
          SENT: 'success',
          FAILED: 'error',
        };
        return (
          <Chip
            label={params.value}
            color={statusColors[params.value] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'recipientCount',
      headerName: 'Alıcı Sayısı',
      width: 120,
    },
    {
      field: 'recipients',
      headerName: 'Alıcılar',
      width: 250,
      flex: 1,
      renderCell: (params) => {
        const notification = params.row as Notification;
        const cellContent = (() => {
          // Metadata içinde userNames varsa göster
          if (notification.metadata && typeof notification.metadata === 'object' && 'userNames' in notification.metadata) {
            const userNames = (notification.metadata as any).userNames;
            if (Array.isArray(userNames) && userNames.length > 0) {
              const maxVisible = 5; // Maksimum gösterilecek isim sayısı
              if (userNames.length <= maxVisible) {
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {userNames.map((name: string, index: number) => (
                      <Chip key={index} label={name} size="small" variant="outlined" />
                    ))}
                  </Box>
                );
              } else {
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                    {userNames.slice(0, maxVisible).map((name: string, index: number) => (
                      <Chip key={index} label={name} size="small" variant="outlined" />
                    ))}
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                      ...
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      (+{userNames.length - maxVisible} kişi)
                    </Typography>
                  </Box>
                );
              }
            }
          }
          // Diğer durumlar için alıcı sayısını göster
          if (notification.recipientCount > 0) {
            return (
              <Typography variant="body2" color="text.secondary">
                {notification.recipientCount} alıcı
              </Typography>
            );
          }
          return '-';
        })();

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
            {cellContent}
          </Box>
        );
      },
    },
    {
      field: 'sentAt',
      headerName: 'Gönderim Tarihi',
      width: 180,
      renderCell: (params) => {
        if (!params.value) return '-';
        return new Date(params.value).toLocaleString('tr-TR');
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        icon={<NotificationsIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Bildirim Gönder"
        description="Panel kullanıcılarına ve üyelere bildirim gönderin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          canSend ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              Yeni Bildirim
            </Button>
          ) : undefined
        }
      />

      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            },
          }}
        />
      </Card>

      {/* Send Dialog - Odağı dialog içine taşıyarak aria-hidden uyarısını önler */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        TransitionProps={{
          onEntered: () => {
            firstDialogInputRef.current?.focus();
          },
        }}
      >
        <DialogTitle>Yeni Bildirim Gönder</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              inputRef={firstDialogInputRef}
              label="Başlık"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Mesaj"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              multiline
              rows={6}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Tür</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  label="Tür"
                >
                  {emailChannelAvailable && (
                    <MenuItem value="EMAIL">E-posta</MenuItem>
                  )}
                  {smsChannelAvailable && (
                    <MenuItem value="SMS">SMS</MenuItem>
                  )}
                  <MenuItem value="IN_APP">Uygulama İçi</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Hedef Tip</InputLabel>
                <Select
                  value={formData.targetType}
                  onChange={(e) => {
                    setFormData({ ...formData, targetType: e.target.value as any });
                    if (e.target.value !== 'USER') {
                      setSelectedUsers([]);
                    }
                    if (e.target.value !== 'REGION' && e.target.value !== 'SCOPE') {
                      setSelectedProvince(null);
                    }
                  }}
                  label="Hedef Tip"
                >
                  <MenuItem value="USER">Panel Kullanıcıları</MenuItem>
                  <MenuItem value="ALL_MEMBERS" disabled>
                    Tüm Üyeler (şu an devre dışı)
                  </MenuItem>
                  <MenuItem value="REGION" disabled>
                    Bölge (şu an devre dışı)
                  </MenuItem>
                  <MenuItem value="SCOPE" disabled>
                    Kapsam (şu an devre dışı)
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
            {formData.targetType === 'USER' && (
              <Autocomplete
                multiple
                options={users}
                loading={loadingUsers}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName}${option.email ? ` (${option.email})` : ''}`}
                value={selectedUsers}
                onChange={(_, newValue) => setSelectedUsers(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kullanıcı Seçin"
                    placeholder="Kullanıcıları seçin..."
                    required
                    helperText={
                      selectedUsers.length > 0
                        ? `${selectedUsers.length} kullanıcı seçildi`
                        : 'Bildirim göndermek istediğiniz kullanıcıları seçin (kendiniz dahil)'
                    }
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={`${option.firstName} ${option.lastName}`}
                      size="small"
                    />
                  ))
                }
              />
            )}
            {formData.targetType === 'REGION' && (
              <Autocomplete
                options={provinces}
                getOptionLabel={(option) => `${option.name}${option.code ? ` (${option.code})` : ''}`}
                value={selectedProvince}
                onChange={(_, newValue) => setSelectedProvince(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="İl Seçimi" required />
                )}
              />
            )}
            {formData.targetType === 'SCOPE' && (
              <>
                {canNotifyScope && !canNotifyAll && !canNotifyRegion ? (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Bildirim, sizin yetki alanınızdaki (scope) üyelere otomatik olarak gönderilecektir.
                    İl seçimi yapmanıza gerek yoktur.
                  </Alert>
                ) : (
                  <Autocomplete
                    options={provinces}
                    getOptionLabel={(option) => `${option.name}${option.code ? ` (${option.code})` : ''}`}
                    value={selectedProvince}
                    onChange={(_, newValue) => setSelectedProvince(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="İl Seçimi" required />
                    )}
                  />
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={sending}>
            İptal
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={sending}
            startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {sending ? 'Gönderiliyor...' : 'Gönder'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default NotificationsPage;

