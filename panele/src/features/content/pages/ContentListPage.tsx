// src/features/content/pages/ContentListPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  Tooltip,
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
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArticleIcon from '@mui/icons-material/Article';
import PublishIcon from '@mui/icons-material/Publish';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import SaveIcon from '@mui/icons-material/Save';

import type { Content } from '../services/contentApi';
import {
  getContents,
  createContent,
  updateContent,
  deleteContent,
  publishContent,
} from '../services/contentApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const ContentListPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    type?: 'NEWS' | 'ANNOUNCEMENT' | 'EVENT';
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  }>({});

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'NEWS' as 'NEWS' | 'ANNOUNCEMENT' | 'EVENT',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
  });

  const canManage = hasPermission('CONTENT_MANAGE');
  const canPublish = hasPermission('CONTENT_PUBLISH');

  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContents(filters);
      setRows(data);
    } catch (e: unknown) {
      console.error('İçerikler yüklenirken hata:', e);
      toast.error(getApiErrorMessage(e, 'İçerikler yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const handleOpenDialog = (content?: Content) => {
    if (content) {
      setEditingContent(content);
      setFormData({
        title: content.title,
        content: content.content,
        type: content.type,
        status: content.status === 'ARCHIVED' ? 'DRAFT' : content.status,
      });
    } else {
      setEditingContent(null);
      setFormData({
        title: '',
        content: '',
        type: 'NEWS',
        status: 'DRAFT',
      });
    }
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingContent(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Başlık ve içerik gereklidir');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingContent) {
        await updateContent(editingContent.id, formData);
        toast.success('İçerik başarıyla güncellendi');
      } else {
        await createContent(formData);
        toast.success('İçerik başarıyla oluşturuldu');
      }
      handleCloseDialog();
      loadContents();
    } catch (e: unknown) {
      console.error('İçerik kaydedilirken hata:', e);
      setError(getApiErrorMessage(e, 'İçerik kaydedilirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contentToDelete) return;

    setDeleting(true);
    try {
      await deleteContent(contentToDelete.id);
      toast.success('İçerik başarıyla silindi');
      setDeleteDialogOpen(false);
      setContentToDelete(null);
      loadContents();
    } catch (e: unknown) {
      console.error('İçerik silinirken hata:', e);
      toast.error(getApiErrorMessage(e, 'İçerik silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };


  const handlePublish = useCallback(
    async (id: string) => {
      try {
        await publishContent(id);
        toast.success('İçerik başarıyla yayınlandı');
        loadContents();
      } catch (e: unknown) {
        console.error('İçerik yayınlanırken hata:', e);
        toast.error(getApiErrorMessage(e, 'İçerik yayınlanırken bir hata oluştu'));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'title',
        headerName: 'Başlık',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'type',
        headerName: 'Tür',
        width: 150,
        renderCell: (params: GridRenderCellParams) => {
          const typeLabels: Record<string, string> = {
            NEWS: 'Haber',
            ANNOUNCEMENT: 'Duyuru',
            EVENT: 'Etkinlik',
          };
          const typeColors: Record<string, 'primary' | 'success' | 'warning'> = {
            NEWS: 'primary',
            ANNOUNCEMENT: 'success',
            EVENT: 'warning',
          };
          return (
            <Chip
              label={typeLabels[params.value] || params.value}
              color={typeColors[params.value] || 'default'}
              size="small"
            />
          );
        },
      },
      {
        field: 'status',
        headerName: 'Durum',
        width: 130,
        renderCell: (params: GridRenderCellParams) => {
          const statusLabels: Record<string, string> = {
            DRAFT: 'Taslak',
            PUBLISHED: 'Yayında',
            ARCHIVED: 'Arşiv',
          };
          const statusColors: Record<string, 'default' | 'success' | 'warning'> = {
            DRAFT: 'default',
            PUBLISHED: 'success',
            ARCHIVED: 'warning',
          };
          return (
            <Chip
              label={statusLabels[params.value] || params.value}
              color={statusColors[params.value] || 'default'}
              size="small"
            />
          );
        },
      },
      {
        field: 'publishedAt',
        headerName: 'Yayın Tarihi',
        width: 150,
        renderCell: (params: GridRenderCellParams) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleDateString('tr-TR');
        },
      },
      {
        field: 'author',
        headerName: 'Yazar',
        width: 150,
        renderCell: (params: GridRenderCellParams) => {
          const author = params.row.author;
          if (!author) return '-';
          return `${author.firstName} ${author.lastName}`;
        },
      },
      {
        field: 'actions',
        headerName: 'İşlemler',
        width: 200,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => {
          const content = params.row as Content;
          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {canPublish && content.status === 'DRAFT' && (
                <Tooltip title="Yayınla">
                  <IconButton
                    size="small"
                    onClick={() => handlePublish(content.id)}
                    sx={{ color: theme.palette.success.main }}
                  >
                    <PublishIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canManage && (
                <>
                  <Tooltip title="Düzenle">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(content)}
                      sx={{ color: theme.palette.primary.main }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sil">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setContentToDelete(content);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ color: theme.palette.error.main }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          );
        },
      },
    ],
    [canPublish, canManage, handlePublish, theme],
  );

  return (
    <PageLayout>
      <PageHeader
        icon={<ArticleIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="İçerik Yönetimi"
        description="Haber, duyuru ve etkinlik içeriklerini yönetin"
        color={theme.palette.primary.main}
        darkColor={theme.palette.primary.dark}
        lightColor={theme.palette.primary.light}
        rightContent={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              Yeni İçerik
            </Button>
          ) : undefined
        }
      />

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
            p: { xs: 3, sm: 4 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.light, 0.01)} 100%)`,
            borderBottom: `2px solid ${alpha(theme.palette.divider, 0.08)}`,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FilterListIcon sx={{ color: theme.palette.text.secondary }} />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Tür</InputLabel>
              <Select
                value={filters.type || ''}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value as any || undefined })
                }
                label="Tür"
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="NEWS">Haber</MenuItem>
                <MenuItem value="ANNOUNCEMENT">Duyuru</MenuItem>
                <MenuItem value="EVENT">Etkinlik</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Durum</InputLabel>
              <Select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value as any || undefined })
                }
                label="Durum"
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="DRAFT">Taslak</MenuItem>
                <MenuItem value="PUBLISHED">Yayında</MenuItem>
                <MenuItem value="ARCHIVED">Arşiv</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* DataGrid */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
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
            borderRadius: 3,
            overflow: 'hidden',
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
              py: 2,
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-columnHeaders': {
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
              borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              minHeight: '56px !important',
              maxHeight: '56px !important',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
              fontSize: '0.9rem',
            },
            '& .MuiDataGrid-row': {
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
              },
              '&:nth-of-type(even)': {
                backgroundColor: alpha(theme.palette.grey[50], 0.3),
              },
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
              backgroundColor: alpha(theme.palette.grey[50], 0.5),
              minHeight: '52px',
            },
          }}
        />
        </Box>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingContent ? 'İçerik Düzenle' : 'Yeni İçerik Oluştur'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Başlık"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
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
                  <MenuItem value="NEWS">Haber</MenuItem>
                  <MenuItem value="ANNOUNCEMENT">Duyuru</MenuItem>
                  <MenuItem value="EVENT">Etkinlik</MenuItem>
                </Select>
              </FormControl>
              {canPublish && (
                <FormControl fullWidth>
                  <InputLabel>Durum</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as any })
                    }
                    label="Durum"
                  >
                    <MenuItem value="DRAFT">Taslak</MenuItem>
                    <MenuItem value="PUBLISHED">Yayında</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
            <TextField
              label="İçerik"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              multiline
              rows={10}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            İptal
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>İçeriği Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{contentToDelete?.title}" başlıklı içeriği silmek istediğinize emin misiniz?
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            İptal
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default ContentListPage;
