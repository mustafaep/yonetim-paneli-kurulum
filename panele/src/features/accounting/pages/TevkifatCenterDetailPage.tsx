// src/pages/accounting/TevkifatCenterDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  useTheme,
  alpha,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import {
  getTevkifatCenterById,
  getTevkifatFiles,
  getTevkifatCenters,
  uploadTevkifatCenterDocument,
  getTevkifatTitles,
  downloadTevkifatFile,
  type TevkifatCenterDetail,
  type TevkifatFile,
  type TevkifatCenter,
} from '../services/accountingApi';
import DeleteTevkifatCenterDialog from '../components/DeleteTevkifatCenterDialog';
import { getMembers } from '../../members/services/membersApi';
import { DataGrid } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DownloadIcon from '@mui/icons-material/Download';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const TevkifatCenterDetailPage: React.FC = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [center, setCenter] = useState<TevkifatCenterDetail | null>(null);
  const [files, setFiles] = useState<TevkifatFile[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const membersSectionRef = React.useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [availableCenters, setAvailableCenters] = useState<TevkifatCenter[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    tevkifatTitleId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    description: '',
  });
  const [tevkifatTitles, setTevkifatTitles] = useState<any[]>([]);

  const canView =
    hasPermission('TEVKIFAT_CENTER_VIEW') ||
    hasPermission('TEVKIFAT_CENTER_UPDATE') ||
    hasPermission('TEVKIFAT_CENTER_DELETE');
  const canUpdate = hasPermission('TEVKIFAT_CENTER_UPDATE');
  const canDelete = hasPermission('TEVKIFAT_CENTER_DELETE');
  const canUploadDocument = canUpdate;

  useEffect(() => {
    if (id && canView) {
      loadCenter();
      loadFiles();
      loadMembers();
      loadAvailableCenters();
      loadTevkifatTitles();
    }
  }, [id, canView]);

  const loadTevkifatTitles = async () => {
    try {
      const data = await getTevkifatTitles();
      setTevkifatTitles(data.filter((t: any) => t.isActive));
    } catch (e: unknown) {
      console.error('Tevkifat ünvanları yüklenirken hata:', e);
    }
  };

  const loadAvailableCenters = async () => {
    try {
      const data = await getTevkifatCenters();
      setAvailableCenters(data);
    } catch (e: unknown) {
      console.error('Tevkifat merkezleri yüklenirken hata:', e);
    }
  };

  const loadCenter = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTevkifatCenterById(id);
      setCenter(data);
    } catch (e: unknown) {
      console.error('Tevkifat merkezi detayı alınırken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Tevkifat merkezi detayı alınamadı'));
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!id) return;
    setLoadingFiles(true);
    try {
      const data = await getTevkifatFiles({ tevkifatCenterId: id });
      setFiles(data);
    } catch (e: unknown) {
      console.error('Tevkifat dosyaları yüklenirken hata:', e);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadMembers = async () => {
    if (!id) return;
    setLoadingMembers(true);
    try {
      const allMembers = await getMembers();
      // Bu tevkifat merkezine bağlı üyeleri filtrele
      const centerMembers = allMembers.filter(
        (member: any) => member.tevkifatCenter?.id === id
      );
      setMembers(centerMembers);
    } catch (e: unknown) {
      console.error('Üyeler yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Üyeler yüklenirken bir hata oluştu'));
    } finally {
      setLoadingMembers(false);
    }
  };


  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Onay Bekliyor';
      case 'APPROVED':
        return 'Onaylandı';
      case 'REJECTED':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): 'warning' | 'success' | 'error' => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      default:
        return 'warning';
    }
  };

  const handleDeleteSuccess = () => {
    navigate('/accounting/tevkifat-centers');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.showError('Sadece PDF dosyaları yüklenebilir');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadDocument = async () => {
    if (!canUploadDocument) {
      toast.showError('Tevkifat merkezi evrakı yükleme yetkiniz bulunmuyor');
      return;
    }
    if (!id || !selectedFile) {
      toast.showError('Lütfen bir PDF dosyası seçin');
      return;
    }

    setUploading(true);
    try {
      const fileName = customFileName.trim() || selectedFile.name.replace(/\.pdf$/i, '');
      await uploadTevkifatCenterDocument(
        id,
        selectedFile,
        fileName,
        uploadForm.description,
        uploadForm.tevkifatTitleId || undefined,
        uploadForm.month,
        uploadForm.year
      );
      toast.showSuccess('Evrak başarıyla yüklendi');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setCustomFileName('');
      setUploadForm({
        tevkifatTitleId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        description: '',
      });
      loadFiles();
      loadCenter(); // Refresh statistics
    } catch (e: unknown) {
      console.error('Evrak yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Evrak yüklenirken bir hata oluştu'));
    } finally {
      setUploading(false);
    }
  };

  const monthNames = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];

  if (!canView) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            borderRadius: 3,
            boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.15)}`,
          }}
        >
          <BusinessIcon sx={{ fontSize: 64, color: theme.palette.error.main, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            Yetkisiz İşlem
          </Typography>
          <Typography color="text.secondary">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!center) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert 
          severity="error"
          sx={{
            borderRadius: 2.5,
            boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.15)}`,
          }}
        >
          Tevkifat merkezi bulunamadı
        </Alert>
      </Box>
    );
  }

  return (
    <PageLayout>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/accounting/tevkifat-centers')}
          sx={{ 
            mb: 3,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 2,
          }}
        >
          Geri Dön
        </Button>

        <PageHeader
          icon={<BusinessIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
          title={center.name}
          description="Tevkifat Merkezi Detayları"
          color={theme.palette.primary.main}
          darkColor={theme.palette.primary.dark}
          lightColor={theme.palette.primary.light}
          rightContent={
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={center.isActive ? 'Aktif' : 'Pasif'}
                color={center.isActive ? 'success' : 'default'}
                sx={{
                  height: 36,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  backgroundColor: 'white',
                  color: center.isActive ? theme.palette.success.main : theme.palette.text.secondary,
                }}
              />
              {(canUpdate || canDelete) && (
                <>
                    {canUpdate && (
                      <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/accounting/tevkifat-centers/${id}/edit`)}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          backgroundColor: 'white',
                          color: theme.palette.primary.main,
                          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.9),
                            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                          },
                        }}
                      >
                        Düzenle
                      </Button>
                    )}
                    {canDelete && center.isActive && (
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<BlockIcon />}
                        onClick={() => {
                          setDeleteDialogOpen(true);
                        }}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          backgroundColor: 'white',
                          borderColor: 'white',
                          color: theme.palette.warning.main,
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.warning.main, 0.1),
                            borderColor: 'white',
                          },
                        }}
                      >
                        Kaldır
                      </Button>
                    )}
                  </>
                )}
              </Box>
          }
        />
      </Box>

      <Grid container spacing={3}>
        {/* Genel Bilgiler */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              p: { xs: 2, md: 3 },
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.15)}`,
                transform: 'translateY(-4px)',
                borderColor: 'primary.main',
              }
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon sx={{ color: theme.palette.primary.main }} />
              Genel Bilgiler
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {(center as any).title && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                    Tevkifat Ünvanı
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {(center as any).title}
                  </Typography>
                </Box>
              )}
              {(center as any).address && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                    Adres
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {(center as any).address}
                  </Typography>
                </Box>
              )}
              {(center as any).description && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                    Açıklama
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {(center as any).description}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                  Toplam Üye Sayısı
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: theme.palette.primary.main,
                      transform: 'translateX(4px)',
                    },
                  }}
                  onClick={() => {
                    membersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <Typography variant="h5" fontWeight={700} color="primary">
                    {members.length || center._count.members}
                  </Typography>
                  <LinkIcon fontSize="small" sx={{ opacity: 0.6 }} />
                </Box>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* İstatistikler */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              p: { xs: 2, md: 3 },
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.info.main, 0.15)}`,
                transform: 'translateY(-4px)',
                borderColor: 'info.main',
              }
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon sx={{ color: theme.palette.info.main }} />
              İstatistikler
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                  Toplam Dosya Sayısı
                </Typography>
                <Typography variant="h5" fontWeight={700} color="info.main">
                  {center._count.files}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                  Toplam Kesinti Sayısı
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {center._count.payments}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Yıllık Özet */}
        {center.yearlySummary && center.yearlySummary.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: `0 12px 28px ${alpha(theme.palette.warning.main, 0.15)}`,
                  transform: 'translateY(-4px)',
                  borderColor: 'warning.main',
                }
              }}
            >
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                  Yıllık Özet
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(theme.palette.warning.main, 0.06) }}>
                        <TableCell sx={{ fontWeight: 700 }}>Yıl</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Toplam Gelir</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Ortalama Aylık Gelir</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Kesinti Yapan Üye Sayısı</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {center.yearlySummary.map((summary) => (
                        <TableRow key={summary.year} sx={{ '&:hover': { backgroundColor: alpha(theme.palette.warning.main, 0.02) } }}>
                          <TableCell sx={{ fontWeight: 600 }}>{summary.year}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                            {new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: 'TRY',
                            }).format(summary.totalAmount)}
                          </TableCell>
                          <TableCell align="right">
                            {new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: 'TRY',
                            }).format(summary.averageMonthlyAmount)}
                          </TableCell>
                          <TableCell align="right">{summary.memberCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Card>
          </Grid>
        )}

        {/* Aylık Özet */}
        {center.monthlySummary && center.monthlySummary.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: `0 12px 28px ${alpha(theme.palette.info.main, 0.15)}`,
                  transform: 'translateY(-4px)',
                  borderColor: 'info.main',
                }
              }}
            >
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                  Aylık Özet (Son 12 Ay)
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(theme.palette.info.main, 0.06) }}>
                        <TableCell sx={{ fontWeight: 700 }}>Ay</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Yıl</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Gelen Toplam Tutar</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Kesinti Yapan Üye Sayısı</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {center.monthlySummary.map((summary, index) => (
                        <TableRow key={index} sx={{ '&:hover': { backgroundColor: alpha(theme.palette.info.main, 0.02) } }}>
                          <TableCell sx={{ fontWeight: 600 }}>{monthNames[summary.month - 1]}</TableCell>
                          <TableCell>{summary.year}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                            {new Intl.NumberFormat('tr-TR', {
                              style: 'currency',
                              currency: 'TRY',
                            }).format(summary.totalAmount)}
                          </TableCell>
                          <TableCell align="right">{summary.memberCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Card>
          </Grid>
        )}

        {/* Tevkifat Gelir İstatistikleri Grafiği */}
        {center.monthlySummary && center.monthlySummary.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.15)}`,
                  transform: 'translateY(-4px)',
                  borderColor: 'primary.main',
                }
              }}
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShowChartIcon sx={{ color: theme.palette.primary.main, fontSize: '1.25rem' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Aylık Tevkifat Gelir Dağılımı
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Gelen tevkifat Kesintisi, şube payı (%40) ve genel merkeze giden tutar
                </Typography>

                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={center.monthlySummary.map((summary) => ({
                      name: `${monthNames[summary.month - 1]} ${summary.year}`,
                      'Gelen Tevkifat': summary.totalAmount,
                      'Şube Payı (40%)': summary.totalAmount * 0.4,
                      'Genel Merkez (60%)': summary.totalAmount * 0.6,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12 }}
                      stroke={theme.palette.text.secondary}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke={theme.palette.text.secondary}
                      tickFormatter={(value) => 
                        new Intl.NumberFormat('tr-TR', {
                          notation: 'compact',
                          compactDisplay: 'short',
                        }).format(value)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                        borderRadius: 8,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                      }}
                      formatter={(value: any) =>
                        new Intl.NumberFormat('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        }).format(value)
                      }
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="rect"
                    />
                    <Bar 
                      dataKey="Gelen Tevkifat" 
                      fill={theme.palette.primary.main}
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar 
                      dataKey="Şube Payı (40%)" 
                      fill={theme.palette.success.main}
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar 
                      dataKey="Genel Merkez (60%)" 
                      fill={theme.palette.warning.main}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {/* İstatistik Özeti */}
                <Box 
                  sx={{ 
                    mt: 4, 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 2,
                  }}
                >
                  <Box 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Toplam Gelen Tevkifat
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                      {new Intl.NumberFormat('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                      }).format(center.monthlySummary.reduce((acc, s) => acc + s.totalAmount, 0))}
                    </Typography>
                  </Box>

                  <Box 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.success.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Toplam Şube Payı (40%)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                      {new Intl.NumberFormat('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                      }).format(center.monthlySummary.reduce((acc, s) => acc + s.totalAmount * 0.4, 0))}
                    </Typography>
                  </Box>

                  <Box 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      bgcolor: alpha(theme.palette.warning.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Toplam Genel Merkez (60%)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                      {new Intl.NumberFormat('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                      }).format(center.monthlySummary.reduce((acc, s) => acc + s.totalAmount * 0.6, 0))}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        )}

        {/* Bağlı Üyeler */}
        <Grid size={{ xs: 12 }}>
          <Card
            ref={membersSectionRef}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.15)}`,
                transform: 'translateY(-4px)',
                borderColor: 'primary.main',
              }
            }}
          >
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PeopleIcon sx={{ color: theme.palette.primary.main, fontSize: '1.25rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Bağlı Üyeler ({members.length})
                </Typography>
              </Box>
              {loadingMembers ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : members.length === 0 ? (
                <Alert 
                  severity="info"
                  sx={{
                    borderRadius: 2,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.1)}`,
                  }}
                >
                  Bu merkeze bağlı üye bulunmamaktadır
                </Alert>
              ) : (
                <Box
                  sx={{
                    height: 500,
                    '& .MuiDataGrid-root': {
                      border: 'none',
                      borderRadius: 2,
                    },
                    '& .MuiDataGrid-cell': {
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
                      fontSize: '0.875rem',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.06),
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    },
                    '& .MuiDataGrid-row': {
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      },
                    },
                  }}
                >
                  <DataGrid
                    rows={members}
                    columns={[
                      {
                        field: 'registrationNumber',
                        headerName: 'Kayıt No',
                        width: 130,
                        valueGetter: (value) => value || '-',
                      },
                      {
                        field: 'fullName',
                        headerName: 'Ad Soyad',
                        flex: 1,
                        minWidth: 200,
                        valueGetter: (_value, row) => `${row.firstName} ${row.lastName}`,
                      },
                      {
                        field: 'institution',
                        headerName: 'Kurum',
                        flex: 1,
                        minWidth: 200,
                        valueGetter: (_value, row) => row.institution?.name || '-',
                      },
                      {
                        field: 'branch',
                        headerName: 'Şube',
                        flex: 1,
                        minWidth: 150,
                        valueGetter: (_value, row) => row.branch?.name || '-',
                      },
                      {
                        field: 'actions',
                        headerName: 'İşlemler',
                        width: 100,
                        sortable: false,
                        renderCell: (params) => (
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/members/${params.row.id}`)}
                            sx={{ 
                              color: theme.palette.info.main,
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.info.main, 0.1),
                              },
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        ),
                      },
                    ]}
                    loading={loadingMembers}
                    getRowId={(row) => row.id}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    disableRowSelectionOnClick
                  />
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Bağlı Dosyalar */}
        <Grid size={{ xs: 12 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: `0 12px 28px ${alpha(theme.palette.success.main, 0.15)}`,
                transform: 'translateY(-4px)',
                borderColor: 'success.main',
              }
            }}
          >
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <DescriptionIcon sx={{ color: theme.palette.success.main, fontSize: '1.25rem' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Bağlı Dosyalar
                  </Typography>
                </Box>
                {canUploadDocument && (
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setUploadDialogOpen(true)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
                      '&:hover': {
                        boxShadow: `0 6px 16px ${alpha(theme.palette.success.main, 0.4)}`,
                      },
                    }}
                    color="success"
                  >
                    Evrak Yükle
                  </Button>
                )}
              </Box>
              {loadingFiles ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : files.length === 0 ? (
                <Alert 
                  severity="info"
                  sx={{
                    borderRadius: 2,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.1)}`,
                  }}
                >
                  Henüz dosya yüklenmemiş
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(theme.palette.success.main, 0.06) }}>
                        <TableCell sx={{ fontWeight: 700 }}>Dosya Adı</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Ay</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Yıl</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Tevkifat Ünvanı</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Onay Durumu</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>İşlem</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id} sx={{ '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.02) } }}>
                          <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 220,
                              }}
                              title={file.fileName}
                            >
                              {file.fileName || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{monthNames[file.month - 1]}</TableCell>
                          <TableCell>{file.year}</TableCell>
                          <TableCell>
                            {file.tevkifatTitle?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(file.status)}
                              color={getStatusColor(file.status)}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                borderRadius: 1.5,
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => {
                                downloadTevkifatFile(file.id, file.fileName || undefined)
                                  .then(() => toast.showSuccess('Dosya indiriliyor'))
                                  .catch((e) => toast.showError(getApiErrorMessage(e, 'Dosya indirilemedi')));
                              }}
                              sx={{
                                color: theme.palette.primary.main,
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                },
                              }}
                              title="İndir"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Tevkifat Merkezi Kaldırma Dialog */}
      {center && (
        <DeleteTevkifatCenterDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          center={{
            id: center.id,
            name: center.name,
            memberCount: center._count.members,
          }}
          availableCenters={availableCenters}
          loadingCenters={false}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Evrak Yükleme Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => {
          if (!uploading) {
            setUploadDialogOpen(false);
            setSelectedFile(null);
            setCustomFileName('');
            setUploadForm({
              tevkifatTitleId: '',
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              description: '',
            });
          }
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 2,
            pt: 3,
            px: 3,
            fontWeight: 700,
            fontSize: '1.25rem',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
              }}
            >
              <UploadFileIcon sx={{ color: 'white', fontSize: '1.25rem' }} />
            </Box>
            PDF Evrak Yükle
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {/* Tevkifat Ünvanı (Opsiyonel) */}
            <FormControl 
              fullWidth 
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel>Tevkifat Ünvanı (Opsiyonel)</InputLabel>
              <Select
                value={uploadForm.tevkifatTitleId}
                label="Tevkifat Ünvanı (Opsiyonel)"
                onChange={(e) => setUploadForm({ ...uploadForm, tevkifatTitleId: e.target.value })}
                disabled={uploading}
              >
                <MenuItem value="">
                  <em>Seçiniz</em>
                </MenuItem>
                {tevkifatTitles.map((title: any) => (
                  <MenuItem key={title.id} value={title.id}>
                    {title.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Yıl ve Ay */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl 
                fullWidth 
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              >
                <InputLabel>Yıl *</InputLabel>
                <Select
                  value={uploadForm.year}
                  label="Yıl *"
                  onChange={(e) => setUploadForm({ ...uploadForm, year: Number(e.target.value) })}
                  disabled={uploading}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl 
                fullWidth 
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              >
                <InputLabel>Ay *</InputLabel>
                <Select
                  value={uploadForm.month}
                  label="Ay *"
                  onChange={(e) => setUploadForm({ ...uploadForm, month: Number(e.target.value) })}
                  disabled={uploading}
                >
                  {[
                    { value: 1, label: 'Ocak' },
                    { value: 2, label: 'Şubat' },
                    { value: 3, label: 'Mart' },
                    { value: 4, label: 'Nisan' },
                    { value: 5, label: 'Mayıs' },
                    { value: 6, label: 'Haziran' },
                    { value: 7, label: 'Temmuz' },
                    { value: 8, label: 'Ağustos' },
                    { value: 9, label: 'Eylül' },
                    { value: 10, label: 'Ekim' },
                    { value: 11, label: 'Kasım' },
                    { value: 12, label: 'Aralık' },
                  ].map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Açıklama */}
            <TextField
              fullWidth
              label="Açıklama"
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              placeholder="Dosya hakkında açıklama girin"
              multiline
              rows={3}
              disabled={uploading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            {/* Dosya Seçimi */}
            <Box
              sx={{
                border: `2px dashed ${alpha(theme.palette.success.main, 0.3)}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: alpha(theme.palette.success.main, 0.02),
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: theme.palette.success.main,
                  bgcolor: alpha(theme.palette.success.main, 0.05),
                },
              }}
            >
              <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="tevkifat-file-upload"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <label htmlFor="tevkifat-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  disabled={uploading}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    '&:hover': {
                      borderWidth: 2,
                      borderStyle: 'dashed',
                    },
                  }}
                >
                  {selectedFile ? selectedFile.name : 'PDF Dosyası Seç *'}
                </Button>
              </label>
              {selectedFile && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1.5, display: 'block' }}
                >
                  Dosya boyutu: {(selectedFile.size / 1024).toFixed(2)} KB
                </Typography>
              )}
            </Box>

            {selectedFile && (
              <Alert
                severity="info"
                sx={{
                  borderRadius: 2,
                  '& .MuiAlert-message': { width: '100%' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Seçilen dosya:
                </Typography>
                <Typography variant="body2">{selectedFile.name}</Typography>
              </Alert>
            )}

            <TextField
              fullWidth
              label="Dosya Adı (Opsiyonel)"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="Özel dosya adı girin"
              helperText="Boş bırakılırsa orijinal dosya adı kullanılır. PDF uzantısı otomatik eklenir."
              disabled={uploading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button
            onClick={() => {
              setUploadDialogOpen(false);
              setSelectedFile(null);
              setCustomFileName('');
              setUploadForm({
                tevkifatTitleId: '',
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                description: '',
              });
            }}
            disabled={uploading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleUploadDocument}
            variant="contained"
            color="success"
            disabled={!selectedFile || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
              },
            }}
          >
            {uploading ? 'Yükleniyor...' : 'Yükle'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default TevkifatCenterDetailPage;
