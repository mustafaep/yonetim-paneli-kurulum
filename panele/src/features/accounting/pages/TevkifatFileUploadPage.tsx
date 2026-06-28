// src/pages/accounting/TevkifatFileUploadPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Stack,
  useTheme,
  alpha,
  Grid,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { uploadTevkifatFile, getTevkifatFiles, approveTevkifatFile, rejectTevkifatFile } from '../services/accountingApi';
import type { TevkifatFile } from '../services/accountingApi';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const TevkifatFileUploadPage: React.FC = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canUpload = hasPermission('TEVKIFAT_FILE_UPLOAD');
  const canApprove = hasPermission('TEVKIFAT_FILE_APPROVE');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<TevkifatFile[]>([]);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);

  const [formData, setFormData] = useState({
    tevkifatCenterId: '',
    totalAmount: '',
    memberCount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    positionTitle: ' as ' | 'KADRO_657' | 'SOZLESMELI_4B' | 'KADRO_663' | 'AILE_HEKIMLIGI' | 'UNVAN_4924' | 'DIGER_SAGLIK_PERSONELI',
    file: null as File | null,
  });

  useEffect(() => {
    loadFiles();
  }, [yearFilter, monthFilter]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await getTevkifatFiles({
        year: yearFilter,
        month: monthFilter,
      });
      setFiles(data);
    } catch (e: unknown) {
      console.error('Tevkifat dosyaları yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Dosyalar yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.showError('Sadece PDF dosyaları yüklenebilir');
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async () => {
    if (!formData.file) {
      toast.showError('Lütfen bir dosya seçin');
      return;
    }
    if (!formData.tevkifatCenterId) {
      toast.showError('Tevkifat kurumu seçilmelidir');
      return;
    }
    if (!formData.totalAmount || !formData.memberCount) {
      toast.showError('Tutar ve üye sayısı girilmelidir');
      return;
    }

    setUploading(true);
    try {
      // TODO: File upload işlemi burada yapılacak
      // Şimdilik fileUrl'i placeholder olarak gönderiyoruz
      await uploadTevkifatFile({
        tevkifatCenterId: formData.tevkifatCenterId,
        totalAmount: parseFloat(formData.totalAmount),
        memberCount: parseInt(formData.memberCount),
        month: formData.month,
        year: formData.year,
        positionTitle: formData.positionTitle || undefined,
        fileName: formData.file.name,
        fileUrl: `uploads/tevkifat/${formData.file.name}`, // TODO: Gerçek upload
        fileSize: formData.file.size,
      });
      toast.showSuccess('Dosya yüklendi (Admin onayı bekliyor)');
      setFormData({
        tevkifatCenterId: '',
        totalAmount: '',
        memberCount: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        positionTitle: '',
        file: null,
      });
      loadFiles();
    } catch (e: unknown) {
      console.error('Dosya yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Dosya yüklenirken bir hata oluştu'));
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveTevkifatFile(id);
      toast.showSuccess('Dosya onaylandı');
      loadFiles();
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Onaylama işlemi başarısız'));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectTevkifatFile(id);
      toast.showSuccess('Dosya reddedildi');
      loadFiles();
    } catch (e: unknown) {
      toast.showError(getApiErrorMessage(e, 'Reddetme işlemi başarısız'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Onaylandı';
      case 'REJECTED':
        return 'Reddedildi';
      case 'PENDING':
        return 'Onay Bekliyor';
      default:
        return status;
    }
  };

  // TODO: TevkifatCenter listesi API'den gelecek
  const tevkifatCenters = [
    { id: '1', name: 'Tevkifat Merkezi 1' },
    { id: '2', name: 'Tevkifat Merkezi 2' },
  ];

  return (
    <PageLayout>
      <PageHeader
        icon={<CloudUploadIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Tevkifat Dosya Yükleme"
        description="Tevkifat dosyalarını yükleyin, admin onayı bekler"
        color={theme.palette.info.main}
        darkColor={theme.palette.info.dark}
        lightColor={theme.palette.info.light}
      />
      {canUpload && (
        <Card 
          elevation={0}
          sx={{ 
            mb: 3, 
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
            background: '#fff',
          }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.3)}`,
                }}
              >
                <UploadFileIcon sx={{ color: 'white', fontSize: '1.25rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Yeni Dosya Yükle
              </Typography>
            </Box>
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <FormControl 
                  fullWidth 
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                >
                  <InputLabel>Tevkifat Kurumu</InputLabel>
                  <Select
                    value={formData.tevkifatCenterId}
                    label="Tevkifat Kurumu"
                    onChange={(e) => setFormData({ ...formData, tevkifatCenterId: e.target.value })}
                  >
                    {tevkifatCenters.map((center) => (
                      <MenuItem key={center.id} value={center.id}>
                        {center.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  label="Gelen Tutar Toplamı"
                  type="number"
                  required
                  fullWidth
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  label="Üye Sayısı"
                  type="number"
                  required
                  fullWidth
                  value={formData.memberCount}
                  onChange={(e) => setFormData({ ...formData, memberCount: e.target.value })}
                  inputProps={{ min: 1 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <FormControl 
                  fullWidth 
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                >
                  <InputLabel>Ay</InputLabel>
                  <Select
                    value={formData.month}
                    label="Ay"
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
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
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  label="Yıl"
                  type="number"
                  required
                  fullWidth
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  inputProps={{ min: 2020, max: 2100 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>

              <Grid size={12}>
                <FormControl 
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                >
                  <InputLabel>Kadro (Seçmeli)</InputLabel>
                  <Select
                    value={formData.positionTitle}
                    label="Kadro (Seçmeli)"
                    onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value as any })}
                  >
                    <MenuItem value="">Seçilmemiş</MenuItem>
                    <MenuItem value="KADRO_657">657 Kadrolu</MenuItem>
                    <MenuItem value="SOZLESMELI_4B">4B Sözleşmeli</MenuItem>
                    <MenuItem value="KADRO_663">663 Kadro Karşılığı</MenuItem>
                    <MenuItem value="AILE_HEKIMLIGI">Aile Hekimliği</MenuItem>
                    <MenuItem value="UNVAN_4924">4924 Unvanlı</MenuItem>
                    <MenuItem value="DIGER_SAGLIK_PERSONELI">Diğer Sağlık Personeli</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={12}>
                <Box>
                  <input
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<DescriptionIcon />}
                      fullWidth
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
                      {formData.file ? formData.file.name : 'PDF Dosyası Seç'}
                    </Button>
                  </label>
                </Box>
              </Grid>

              <Grid size={12}>
                <Button
                  variant="contained"
                  color="info"
                  onClick={handleSubmit}
                  disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.3)}`,
                    },
                  }}
                >
                  {uploading ? 'Yükleniyor...' : 'Yükle (Admin Onayı Bekler)'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Card>
      )}
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
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fff',
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel>Yıl</InputLabel>
              <Select
                value={yearFilter}
                label="Yıl"
                onChange={(e) => setYearFilter(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fff',
                  borderRadius: 2,
                },
              }}
            >
              <InputLabel>Ay</InputLabel>
              <Select
                value={monthFilter}
                label="Ay"
                onChange={(e) => setMonthFilter(Number(e.target.value))}
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
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : files.length === 0 ? (
            <Alert 
              severity="info"
              sx={{
                borderRadius: 2,
              }}
            >
              Bu ay/yıl için dosya bulunmuyor.
            </Alert>
          ) : (
            <Box sx={{ overflow: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
                    <TableCell sx={{ fontWeight: 700 }}>Tevkifat Kurumu</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Toplam Tutar</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Üye Sayısı</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ay/Yıl</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Kadro</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Yükleyen</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map((file) => (
                    <TableRow 
                      key={file.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.02),
                        },
                      }}
                    >
                      <TableCell>{file.tevkifatCenter?.name || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                        {typeof file.totalAmount === 'string'
                          ? parseFloat(file.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
                          : file.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                        TL
                      </TableCell>
                      <TableCell>{file.memberCount}</TableCell>
                      <TableCell>
                        {file.month}/{file.year}
                      </TableCell>
                      <TableCell>{file.positionTitle || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(file.status)}
                          size="small"
                          color={getStatusColor(file.status) as any}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            borderRadius: 1.5,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {file.uploadedByUser
                          ? `${file.uploadedByUser.firstName} ${file.uploadedByUser.lastName}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {canApprove && file.status === 'PENDING' && (
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(file.id)}
                              sx={{
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                                },
                              }}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(file.id)}
                              sx={{
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                                },
                              }}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Card>
    </PageLayout>
  );
};

export default TevkifatFileUploadPage;
