// src/pages/regions/RegionsProvincesPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  useTheme,
  alpha,
  Paper,
  Grid,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import MapIcon from '@mui/icons-material/Map';
import PinDropIcon from '@mui/icons-material/PinDrop';
import LocationCityIcon from '@mui/icons-material/LocationCity';

import type { Province, District } from '../../../types/region';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';
import { useToast } from '../../../shared/hooks/useToast';
import {
  getProvinces,
  getDistricts,
} from '../services/regionsApi';

const RegionsProvincesPage: React.FC = () => {
  const theme = useTheme();
  const toast = useToast();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  const loadProvinces = async () => {
    setLoadingProvinces(true);
    try {
      const data = await getProvinces();
      setProvinces(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error('İller alınırken hata:', e);
      setProvinces([]);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'İller alınırken bir hata oluştu.');
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadDistricts = async (provinceId?: string) => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    try {
      const data = await getDistricts(provinceId);
      setDistricts(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      console.error('İlçeler alınırken hata:', e);
      setDistricts([]);
      const err = e as { response?: { data?: { message?: string } } };
      toast.showError(err?.response?.data?.message ?? 'İlçeler alınırken bir hata oluştu.');
    } finally {
      setLoadingDistricts(false);
    }
  };

  useEffect(() => {
    loadProvinces();
  }, []);

  useEffect(() => {
    if (selectedProvinceId) {
      loadDistricts(selectedProvinceId);
      setDistrictSearch('');
    } else {
      setDistricts([]);
      setDistrictSearch('');
    }
  }, [selectedProvinceId]);

  const provinceColumns: GridColDef<Province>[] = [
    {
      field: 'name',
      headerName: 'İl Adı',
      flex: 1,
      minWidth: 400,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
          <Typography sx={{ fontWeight: 500 }}>{params.row.name}</Typography>
        </Box>
      ),
    },
    {
      field: 'code',
      headerName: 'Plaka',
      width: 100,
      valueGetter: (params: { row?: Province }) => params?.row?.code ?? '',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.row.code && (
            <>
              <PinDropIcon sx={{ color: theme.palette.info.main, fontSize: '1.1rem' }} />
              <Typography>{params.row.code}</Typography>
            </>
          )}
        </Box>
      ),
    },
  ];

  const districtColumns: GridColDef<District>[] = [
    {
      field: 'name',
      headerName: 'İlçe Adı',
      flex: 1,
      minWidth: 400,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationCityIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
          <Typography sx={{ fontWeight: 500 }}>{params.row.name}</Typography>
        </Box>
      ),
    },
  ];

  // Filtrelenmiş iller
  const filteredProvinces = provinces.filter((province) => {
    if (!provinceSearch.trim()) return true;
    const searchLower = provinceSearch.toLowerCase();
    return (
      province.name.toLowerCase().includes(searchLower) ||
      province.code?.toLowerCase().includes(searchLower)
    );
  });

  // Filtrelenmiş ilçeler
  const filteredDistricts = districts.filter((district) => {
    if (!districtSearch.trim()) return true;
    const searchLower = districtSearch.toLowerCase();
    return district.name.toLowerCase().includes(searchLower);
  });

  // Seçili il bilgisi
  const selectedProvince = provinces.find(p => p.id === selectedProvinceId);

  return (
    <PageLayout>
      <PageHeader
        icon={<MapIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="İller ve İlçeler"
        description="İlleri seçerek ilçelerini görüntüleyin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
      />

      {/* İki Tablo - Yan Yana Grid Layout */}
      <Grid container spacing={3}>
        {/* İller Tablosu */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
              overflow: 'hidden',
              height: '100%',
              background: '#fff',
            }}
          >
            {/* Kart Başlığı */}
            <Box
              sx={{
                p: { xs: 3, sm: 4 },
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  <MapIcon />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  İller
                </Typography>
              </Box>

              {/* Arama Filtresi */}
              <TextField
                fullWidth
                size="small"
                placeholder="İl ara..."
                value={provinceSearch}
                onChange={(e) => setProvinceSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: '#fff',
                  },
                }}
              />

              {/* İl Sayısı */}
              {!loadingProvinces && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    backgroundColor: alpha(theme.palette.info.main, 0.08),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
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
                    <MapIcon fontSize="small" />
                    {provinceSearch 
                      ? `${filteredProvinces.length} / ${provinces.length} il` 
                      : `Toplam ${provinces.length} il`}
                  </Typography>
                </Paper>
              )}
            </Box>

            {/* İller Tablosu */}
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Box
                sx={{
                  height: 600,
                  '& .MuiDataGrid-root': {
                    border: 'none',
                    borderRadius: 2,
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                    borderRadius: 0,
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  },
                  '& .MuiDataGrid-row': {
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.03),
                      boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.16),
                      },
                    },
                  },
                  '& .MuiDataGrid-footerContainer': {
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                  },
                }}
              >
                <DataGrid
                  rows={filteredProvinces}
                  columns={provinceColumns}
                  getRowId={(row) => row.id}
                  loading={loadingProvinces}
                  onRowClick={(params) => {
                    setSelectedProvinceId(params.row.id as string);
                  }}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25, page: 0 } },
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                  disableRowSelectionOnClick={false}
                  sx={{
                    '& .MuiDataGrid-virtualScroller': {
                      minHeight: '200px',
                    },
                  }}
                />
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* İlçeler Tablosu */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
              overflow: 'hidden',
              height: '100%',
              background: '#fff',
            }}
          >
            {/* Kart Başlığı */}
            <Box
              sx={{
                p: { xs: 3, sm: 4 },
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.02)} 0%, ${alpha(theme.palette.success.light, 0.01)} 100%)`,
                borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
                  }}
                >
                  <LocationCityIcon />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    İlçeler
                  </Typography>
                  {selectedProvince && (
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {selectedProvince.name}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Arama Filtresi */}
              {selectedProvinceId && (
                <TextField
                  fullWidth
                  size="small"
                  placeholder="İlçe ara..."
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 1.5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#fff',
                    },
                  }}
                />
              )}

              {/* İlçe Sayısı veya Bilgi */}
              {selectedProvinceId ? (
                !loadingDistricts && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      backgroundColor: alpha(theme.palette.success.main, 0.08),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.success.main,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <LocationCityIcon fontSize="small" />
                      {districtSearch 
                        ? `${filteredDistricts.length} / ${districts.length} ilçe` 
                        : `${districts.length} ilçe bulundu`}
                    </Typography>
                  </Paper>
                )
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: alpha(theme.palette.warning.main, 0.08),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.warning.dark,
                      fontStyle: 'italic',
                    }}
                  >
                    👈 Soldaki listeden bir il seçiniz
                  </Typography>
                </Paper>
              )}
            </Box>

            {/* İlçeler Tablosu */}
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Box
                sx={{
                  height: 600,
                  '& .MuiDataGrid-root': {
                    border: 'none',
                    borderRadius: 2,
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.06)} 0%, ${alpha(theme.palette.success.light, 0.03)} 100%)`,
                    borderBottom: `2px solid ${alpha(theme.palette.success.main, 0.12)}`,
                    borderRadius: 0,
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  },
                  '& .MuiDataGrid-row': {
                    cursor: 'default',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.success.main, 0.03),
                      boxShadow: `inset 4px 0 0 ${theme.palette.success.main}`,
                    },
                    '&:nth-of-type(even)': {
                      backgroundColor: alpha(theme.palette.grey[50], 0.3),
                    },
                  },
                  '& .MuiDataGrid-footerContainer': {
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                  },
                }}
              >
                <DataGrid
                  rows={filteredDistricts}
                  columns={districtColumns}
                  getRowId={(row) => row.id}
                  loading={loadingDistricts}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25, page: 0 } },
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                  disableRowSelectionOnClick
                  slots={{
                    noRowsOverlay: () => (
                      <Box
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          p: 3,
                        }}
                      >
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            backgroundColor: alpha(theme.palette.grey[500], 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <LocationCityIcon 
                            sx={{ 
                              fontSize: '2.5rem', 
                              color: theme.palette.grey[400] 
                            }} 
                          />
                        </Box>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {selectedProvinceId ? 'Bu ilde ilçe bulunamadı' : 'İl seçiniz'}
                        </Typography>
                      </Box>
                    ),
                  }}
                  sx={{
                    height: 600,
                    '& .MuiDataGrid-virtualScroller': {
                      minHeight: '200px',
                    },
                  }}
                />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </PageLayout>
  );
};

export default RegionsProvincesPage;
