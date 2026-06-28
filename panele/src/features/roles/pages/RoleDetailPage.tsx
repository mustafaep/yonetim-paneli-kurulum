// src/features/roles/pages/RoleDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Chip,
  CircularProgress,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Link,
  useTheme,
  alpha,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DescriptionIcon from '@mui/icons-material/Description';
import VerifiedIcon from '@mui/icons-material/Verified';

import type { CustomRole } from '../../../types/role';
import { getRoleById } from '../services/rolesApi';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../../../types/role';
import { getUserById } from '../../users/services/usersApi';
import { useToast } from '../../../shared/hooks/useToast';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { useAuth } from '../../../app/providers/AuthContext';

const RoleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canEdit =
    hasPermission('ROLE_UPDATE') && hasPermission('ROLE_MANAGE_PERMISSIONS');

  const [role, setRole] = useState<CustomRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRole = async () => {
      try {
        const data = await getRoleById(id);
        setRole(data);
      } catch (e) {
        console.error('Rol alınırken hata:', e);
        setError('Rol bilgileri alınamadı');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error || !role) {
    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <Box sx={{ p: 3 }}>
          <Alert 
            severity="error"
            sx={{ 
              borderRadius: 2,
              mb: 3,
            }}
          >
            {error || 'Rol bulunamadı'}
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/roles')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Rollere Geri Dön
          </Button>
        </Box>
      </Card>
    );
  }

  // İzinleri gruplara göre organize et
  const permissionsByGroup = Object.entries(PERMISSION_GROUPS).map(
    ([groupKey, permissions]) => {
      const groupLabels: Record<string, string> = {
        USER_MANAGEMENT: 'Kullanıcı Yönetimi',
        ROLE_MANAGEMENT: 'Rol Yönetimi',
        MEMBER_MANAGEMENT: 'Üye Yönetimi',
        REGION_MANAGEMENT: 'Bölge Yönetimi',
        CONTENT_MANAGEMENT: 'İçerik Yönetimi',
        DOCUMENT_MANAGEMENT: 'Doküman Yönetimi',
        REPORTS: 'Raporlar',
        NOTIFICATIONS: 'Bildirimler',
        SYSTEM: 'Sistem',
        INSTITUTION_MANAGEMENT: 'Kurum Yönetimi',
        PROFESSION_MANAGEMENT: 'Meslek Yönetimi',
        ACCOUNTING: 'Muhasebe',
        MEMBER_PAYMENTS: 'Üye Kesintileri',
        APPROVALS: 'Onay Süreçleri',
        PANEL_USER_APPLICATIONS: 'Panel Kullanıcı Başvuruları',
        ADVANCES: 'Avanslar',
        INVOICES: 'Faturalar',
      };

      const rolePermissionsInGroup = permissions.filter((p) =>
        role.permissions.includes(p),
      );

      return {
        groupKey,
        groupLabel: groupLabels[groupKey] ?? groupKey,
        permissions: rolePermissionsInGroup,
      };
    },
  ).filter((group) => group.permissions.length > 0);

  return (
    <PageLayout>
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/roles')}
          sx={{
            mb: 2,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
            },
          }}
        >
          Rollere Geri Dön
        </Button>
      </Box>
      <PageHeader
        icon={<AdminPanelSettingsIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {role.name}
            {role.name === 'ADMIN' && (
              <Chip
                label="Sistem Rolü"
                size="small"
                color="warning"
                icon={<VerifiedIcon />}
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        }
        description="Rol detaylarını ve izinlerini görüntüleyin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          role.name !== 'ADMIN' && canEdit ? (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/roles/${role.id}/edit`)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                },
              }}
            >
              Düzenle
            </Button>
          ) : undefined
        }
      />
      {/* İstatistik Kartları */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 4
          }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SecurityIcon sx={{ color: theme.palette.primary.main, fontSize: '1.5rem' }} />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Toplam İzin
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {role.permissions.length}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 4
          }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.light, 0.02)} 100%)`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.15)}`,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PeopleIcon sx={{ color: theme.palette.success.main, fontSize: '1.5rem' }} />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Kullanıcı Sayısı
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {role.users?.length || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 4
          }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.light, 0.02)} 100%)`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${alpha(theme.palette.info.main, 0.15)}`,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: alpha(role.isActive ? theme.palette.success.main : theme.palette.grey[500], 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VerifiedIcon sx={{ color: role.isActive ? theme.palette.success.main : theme.palette.grey[500], fontSize: '1.5rem' }} />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Durum
                </Typography>
                <Chip
                  label={role.isActive ? 'Aktif' : 'Pasif'}
                  color={role.isActive ? 'success' : 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      {/* Rol Bilgileri Kartı */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DescriptionIcon sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Rol Bilgileri
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
              Açıklama
            </Typography>
            <Typography variant="body1">
              {role.description || '-'}
            </Typography>
          </Box>
          {role.hasScopeRestriction && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                Yetki Alanı Kısıtlaması
              </Typography>
              <Chip
                label="Bu rol yetki alanı gerektirir"
                color="info"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Bu role sahip kullanıcılara rol atanırken (panel kullanıcı başvurusu oluşturulurken veya onaylanırken) 
                yetki alanı (il/ilçe) seçimi zorunludur.
              </Typography>
            </Box>
          )}
        </Box>
      </Card>
      {/* Kullanıcılar Kartı */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.success.main, 0.02),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PeopleIcon sx={{ color: theme.palette.success.main }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Bu Role Atanmış Kullanıcılar
            </Typography>
            <Chip
              label={`${role.users?.length || 0} Kullanıcı`}
              size="small"
              color="success"
              sx={{ ml: 'auto', fontWeight: 600 }}
            />
          </Box>
        </Box>
        <Box sx={{ p: 3 }}>
          {role.users && role.users.length > 0 ? (
            <Paper
              elevation={0}
              sx={{
                overflow: 'hidden',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                borderRadius: 2,
              }}
            >
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>Kullanıcı</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>E-posta</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ad Soyad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {role.users.map((user, index) => (
                    <TableRow
                      key={user.id}
                      hover
                      sx={{
                        '&:last-child td': { border: 0 },
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.02),
                        },
                      }}
                      onClick={async () => {
                        try {
                          // Kullanıcı detayını çek ve member bilgisini kontrol et
                          const userDetail = await getUserById(user.id);
                          if (userDetail.member?.id) {
                            // Üye varsa üye detay sayfasına yönlendir
                            navigate(`/members/${userDetail.member.id}`);
                          } else {
                            // Admin kullanıcı veya üye bilgisi yok
                            toast.showWarning('Bu kullanıcının üye bilgisi bulunmuyor. Admin kullanıcılar üye detay sayfasına sahip değildir.');
                          }
                        } catch (error) {
                          console.error('Kullanıcı detayı alınırken hata:', error);
                          toast.showError('Kullanıcı bilgileri alınırken bir hata oluştu.');
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: theme.palette.primary.main,
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </Avatar>
                          <Link
                            component="span"
                            sx={{
                              cursor: 'pointer',
                              textDecoration: 'none',
                              color: theme.palette.primary.main,
                              fontWeight: 500,
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            {user.firstName} {user.lastName}
                          </Link>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.firstName} {user.lastName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                backgroundColor: alpha(theme.palette.grey[500], 0.05),
                borderRadius: 2,
                border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
              }}
            >
              <PeopleIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Bu role henüz hiçbir kullanıcı atanmamış.
              </Typography>
            </Box>
          )}
        </Box>
      </Card>
      {/* İzinler Kartı */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 3,
            backgroundColor: alpha(theme.palette.info.main, 0.02),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SecurityIcon sx={{ color: theme.palette.info.main }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              İzinler
            </Typography>
            <Chip
              label={`${role.permissions.length} İzin`}
              size="small"
              color="info"
              sx={{ ml: 'auto', fontWeight: 600 }}
            />
          </Box>
        </Box>
        <Box sx={{ p: 3 }}>
          {permissionsByGroup.map((group, index) => (
            <Box
              key={group.groupKey}
              sx={{
                mb: index < permissionsByGroup.length - 1 ? 3 : 0,
                p: 2.5,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: theme.palette.primary.main,
                }}
              >
                {group.groupLabel}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {group.permissions.map((permission) => (
                  <Chip
                    key={permission}
                    label={PERMISSION_LABELS[permission]}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{
                      fontWeight: 500,
                      borderRadius: 1.5,
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Card>
    </PageLayout>
  );
};

export default RoleDetailPage;
