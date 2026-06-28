// src/pages/accounting/MemberPaymentsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  useTheme,
  alpha,
  Grid,
  Paper,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { getPaymentsForAccounting } from '../../payments/services/paymentsApi';
import type { MemberPayment } from '../../payments/services/paymentsApi';
import { getBranches } from '../../regions/services/branchesApi';
import { exportToExcel, exportToPDF, type ExportColumn } from '../../../shared/utils/exportUtils';

const MemberPaymentsPage: React.FC = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canExport = hasPermission('TEVKIFAT_EXPORT');

  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadBranches();
    loadPayments();
  }, [branchFilter, yearFilter, monthFilter]);

  const loadBranches = async () => {
    try {
      const data = await getBranches({ isActive: true });
      setBranches(data.map(b => ({ id: b.id, name: b.name })));
    } catch (e) {
      console.error('Şubeler yüklenirken hata:', e);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const filters: any = {
        year: yearFilter,
        month: monthFilter,
        isApproved: true, // Sadece onaylı Kesintileri göster
      };
      if (branchFilter !== 'ALL') {
        filters.branchId = branchFilter;
      }
      const data = await getPaymentsForAccounting(filters);
      setPayments(data);
    } catch (e: unknown) {
      console.error('Kesintiler yüklenirken hata:', e);
      toast.showError(getApiErrorMessage(e, 'Kesintiler yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const exportColumns: ExportColumn[] = columns.map((col) => ({
        field: col.field,
        headerName: col.headerName || col.field,
        width: col.width || col.flex ? (col.flex as number) * 10 : 15,
        valueGetter: col.valueGetter,
      }));
      const filename = `uye-odemeleri-${yearFilter}-${monthNames[monthFilter - 1]}-${new Date().getTime()}`;
      exportToExcel(payments, exportColumns, filename);
      toast.showSuccess('Excel dosyası indirildi');
    } catch (error: unknown) {
      console.error('Excel export hatası:', error);
      toast.showError(getApiErrorMessage(error, 'Excel export sırasında bir hata oluştu'));
    }
  };

  const handleExportPDF = () => {
    try {
      const exportColumns: ExportColumn[] = columns.map((col) => ({
        field: col.field,
        headerName: col.headerName || col.field,
        width: col.width || col.flex ? (col.flex as number) * 10 : 15,
        valueGetter: col.valueGetter,
      }));
      const filename = `uye-odemeleri-${yearFilter}-${monthNames[monthFilter - 1]}-${new Date().getTime()}`;
      const title = `Üye Kesintileri - ${monthNames[monthFilter - 1]} ${yearFilter}`;
      exportToPDF(payments, exportColumns, filename, title, toast.showInfo);
    } catch (error: unknown) {
      console.error('PDF export hatası:', error);
      toast.showError(getApiErrorMessage(error, 'PDF export sırasında bir hata oluştu'));
    }
  };

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const paymentTypeLabels = {
    TEVKIFAT: 'Tevkifat',
    ELDEN: 'Elden',
    HAVALE: 'Havale',
  };

  const columns: GridColDef<MemberPayment>[] = [
    {
      field: 'registrationNumber',
      headerName: 'Üye Kayıt No',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value, row) => row.registrationNumber ?? row.member?.registrationNumber ?? '-',
    },
    {
      field: 'firstName',
      headerName: 'Ad',
      flex: 1,
      minWidth: 120,
      valueGetter: (_value, row) => row.member?.firstName ?? '-',
    },
    {
      field: 'lastName',
      headerName: 'Soyad',
      flex: 1,
      minWidth: 120,
      valueGetter: (_value, row) => row.member?.lastName ?? '-',
    },
    {
      field: 'institution',
      headerName: 'Kurum',
      flex: 1.5,
      minWidth: 180,
      valueGetter: (_value, row) => row.member?.institution?.name ?? '-',
    },
    {
      field: 'tevkifatCenter',
      headerName: 'Tevkifat Kurumu',
      flex: 1.5,
      minWidth: 180,
      valueGetter: (_value, row) => 
        row.tevkifatCenter?.name ?? row.member?.tevkifatCenter?.name ?? '-',
    },
    {
      field: 'month',
      headerName: 'Ay',
      flex: 0.8,
      minWidth: 100,
      valueGetter: (_value, row) => monthNames[row.paymentPeriodMonth - 1] ?? row.paymentPeriodMonth,
    },
    {
      field: 'year',
      headerName: 'Yıl',
      flex: 0.8,
      minWidth: 100,
      valueGetter: (_value, row) => row.paymentPeriodYear,
    },
    {
      field: 'amount',
      headerName: 'Ödenen Tutar',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value, row) => 
        parseFloat(row.amount).toLocaleString('tr-TR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + ' TL',
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'paymentType',
      headerName: 'Kesinti Türü',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Chip
          label={paymentTypeLabels[params.row.paymentType]}
          size="small"
          color={
            params.row.paymentType === 'TEVKIFAT' ? 'primary' :
            params.row.paymentType === 'ELDEN' ? 'secondary' : 'default'
          }
          sx={{
            fontWeight: 600,
            fontSize: '0.75rem',
            borderRadius: 1.5,
          }}
        />
      ),
    },
    {
      field: 'isApproved',
      headerName: 'Onay Durumu',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        params.row.isApproved ? (
          <Chip
            icon={<CheckCircleIcon />}
            label="Onaylı"
            color="success"
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: 1.5,
            }}
          />
        ) : (
          <Chip
            icon={<WarningIcon />}
            label="Beklemede"
            color="warning"
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: 1.5,
            }}
          />
        )
      ),
    },
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: (theme) => 
        theme.palette.mode === 'light' 
          ? `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.05)} 0%, ${alpha(theme.palette.background.default, 1)} 100%)`
          : theme.palette.background.default,
      pb: 4,
    }}>
      {/* Modern Header */}
      <Box sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 3, md: 4 } }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            color: 'white',
            overflow: 'visible',
            position: 'relative',
            boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.3)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 4,
              padding: '2px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }
          }}
        >
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>
              <Box
                sx={{
                  width: { xs: 60, md: 80 },
                  height: { xs: 60, md: 80 },
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}
              >
                <PaymentIcon sx={{ fontSize: { xs: 32, md: 40 }, color: 'white' }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
                    mb: 1,
                  }}
                >
                  Üye Kesintileri
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    opacity: 0.95,
                    fontSize: { xs: '0.875rem', md: '1rem' },
                  }}
                >
                  Muhasebe için Kesinti listesi - Excel ve PDF export mevcut
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
      {/* Ana Kart */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: `0 12px 28px ${alpha(theme.palette.success.main, 0.12)}`,
            transform: 'translateY(-2px)',
          }
        }}
      >
        {/* Filtre Bölümü */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            backgroundColor: alpha(theme.palette.success.main, 0.02),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Grid container spacing={2.5} alignItems="center">
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 3
              }}>
              <FormControl 
                size="small" 
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff',
                    borderRadius: 2,
                  },
                }}
              >
                <InputLabel>Şube</InputLabel>
                <Select
                  value={branchFilter}
                  label="Şube"
                  onChange={(e) => setBranchFilter(e.target.value)}
                  MenuProps={{
                    disablePortal: false,
                    disableScrollLock: true,
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        borderRadius: 12,
                      },
                    },
                  }}
                >
                  <MenuItem value="ALL">Tümü</MenuItem>
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 2
              }}>
              <FormControl 
                size="small" 
                fullWidth
                sx={{ 
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
            </Grid>

            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 2
              }}>
              <FormControl 
                size="small" 
                fullWidth
                sx={{ 
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
            </Grid>

            {canExport && (
              <Grid
                size={{
                  xs: 12,
                  md: 5
                }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportExcel}
                    fullWidth={true}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      fontWeight: 600,
                      py: 1,
                      borderWidth: 1.5,
                      display: { xs: 'flex', sm: 'inline-flex' },
                      '&:hover': {
                        borderWidth: 1.5,
                      },
                    }}
                  >
                    Excel İndir
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={handleExportPDF}
                    fullWidth={true}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      fontWeight: 600,
                      py: 1,
                      borderWidth: 1.5,
                      display: { xs: 'flex', sm: 'inline-flex' },
                      '&:hover': {
                        borderWidth: 1.5,
                      },
                    }}
                  >
                    PDF İndir
                  </Button>
                </Stack>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* İçerik Bölümü */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Sonuç Sayısı */}
          {!loading && (
            <Box sx={{ mb: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.info.main,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <ReceiptIcon fontSize="small" />
                  Toplam {payments.length} Kesinti bulundu
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Tablo */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                height: { xs: 400, sm: 500, md: 600 },
                minHeight: { xs: 400, sm: 500, md: 600 },
                '& .MuiDataGrid-root': {
                  border: 'none',
                  borderRadius: 2,
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: alpha(theme.palette.success.main, 0.04),
                  borderBottom: `2px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  borderRadius: 0,
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 700,
                  fontSize: '0.875rem',
                },
                '& .MuiDataGrid-row': {
                  cursor: 'default',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.success.main, 0.02),
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  backgroundColor: alpha(theme.palette.background.default, 0.5),
                },
                '& .MuiDataGrid-virtualScroller': {
                  minHeight: '200px',
                },
              }}
            >
              <DataGrid
                rows={payments}
                columns={columns}
                getRowId={(row) => row.id}
                loading={loading}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25, page: 0 } },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
              />
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default MemberPaymentsPage;
