// src/pages/documents/DocumentTemplatesPage.tsx
import React, { useEffect, useState } from 'react';
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
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Divider,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';

import type { DocumentTemplate } from '../services/documentsApi';
import {
  getDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} from '../services/documentsApi';
import { useAuth } from '../../../app/providers/AuthContext';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import PageHeader from '../../../shared/components/layout/PageHeader';
import PageLayout from '../../../shared/components/layout/PageLayout';

const DocumentTemplatesPage: React.FC = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<DocumentTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: '',
    type: 'OTHER' as 'MEMBER_CERTIFICATE' | 'MEMBER_CARD' | 'LETTER' | 'RESIGNATION_LETTER' | 'EXPULSION_LETTER' | 'APPROVAL_CERTIFICATE' | 'INVITATION_LETTER' | 'CONGRATULATION_LETTER' | 'WARNING_LETTER' | 'NOTIFICATION_LETTER' | 'MEMBERSHIP_APPLICATION' | 'TRANSFER_CERTIFICATE' | 'BULK_MEMBER_LIST' | 'OTHER',
    isActive: true,
  });

  const canManage = hasPermission('DOCUMENT_TEMPLATE_MANAGE');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getDocumentTemplates();
      setRows(data);
    } catch (e: unknown) {
      console.error('Şablonlar yüklenirken hata:', e);
      toast.error(getApiErrorMessage(e, 'Şablonlar yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template?: DocumentTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        template: template.template,
        type: template.type,
        isActive: template.isActive,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        template: '',
        type: 'OTHER',
        isActive: true,
      });
    }
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.template.trim()) {
      setError('Ad ve şablon içeriği gereklidir');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingTemplate) {
        await updateDocumentTemplate(editingTemplate.id, formData);
        toast.success('Şablon başarıyla güncellendi');
      } else {
        await createDocumentTemplate(formData);
        toast.success('Şablon başarıyla oluşturuldu');
      }
      handleCloseDialog();
      loadTemplates();
    } catch (e: unknown) {
      console.error('Şablon kaydedilirken hata:', e);
      setError(getApiErrorMessage(e, 'Şablon kaydedilirken bir hata oluştu'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      await deleteDocumentTemplate(templateToDelete.id);
      toast.success('Şablon başarıyla silindi');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (e: unknown) {
      console.error('Şablon silinirken hata:', e);
      toast.error(getApiErrorMessage(e, 'Şablon silinirken bir hata oluştu'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Ad',
      flex: 1,
      minWidth: 200,
      align: 'left',
      headerAlign: 'left',
    },
    {
      field: 'type',
      headerName: 'Tür',
      width: 180,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const typeLabels: Record<string, string> = {
          MEMBER_CERTIFICATE: 'Üye Sertifikası',
          MEMBER_CARD: 'Üye Kartı',
          LETTER: 'Mektup',
          RESIGNATION_LETTER: 'İstifa Belgesi',
          EXPULSION_LETTER: 'İhraç Belgesi',
          APPROVAL_CERTIFICATE: 'Onay Belgesi',
          INVITATION_LETTER: 'Davet Mektubu',
          CONGRATULATION_LETTER: 'Tebrik Mektubu',
          WARNING_LETTER: 'Uyarı Mektubu',
          NOTIFICATION_LETTER: 'Bildirim Mektubu',
          MEMBERSHIP_APPLICATION: 'Üyelik Başvurusu',
          TRANSFER_CERTIFICATE: 'Nakil Belgesi',
          BULK_MEMBER_LIST: 'Toplu üye listesi',
          OTHER: 'Diğer',
        };
        return <Chip label={typeLabels[params.value] || params.value} size="small" />;
      },
    },
    {
      field: 'isActive',
      headerName: 'Durum',
      width: 100,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Aktif' : 'Pasif'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      width: 200,
      sortable: false,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => {
        const template = params.row as DocumentTemplate;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
            <Tooltip title="Görüntüle">
              <IconButton
                size="small"
                onClick={() => {
                  setViewingTemplate(template);
                  setViewDialogOpen(true);
                }}
                sx={{ color: theme.palette.info.main }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canManage && (
              <>
                <Tooltip title="Düzenle">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(template)}
                    sx={{ color: theme.palette.primary.main }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Sil">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setTemplateToDelete(template);
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
  ];

  return (
    <PageLayout>
      <PageHeader
        icon={<DescriptionIcon sx={{ color: '#fff', fontSize: { xs: '1.8rem', sm: '2rem' } }} />}
        title="Doküman Şablonları"
        description="Doküman şablonlarını yönetin"
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
              Yeni Şablon
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
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
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
            borderRadius: 3,
            overflow: 'hidden',
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.06)}`,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
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
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              justifyContent: 'center',
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
          {editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon Oluştur'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Ad"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Tür</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as any })
                }
                label="Tür"
              >
                <MenuItem value="MEMBER_CERTIFICATE">Üye Sertifikası</MenuItem>
                <MenuItem value="MEMBER_CARD">Üye Kartı</MenuItem>
                <MenuItem value="LETTER">Genel Mektup</MenuItem>
                <MenuItem value="RESIGNATION_LETTER">İstifa Belgesi</MenuItem>
                <MenuItem value="EXPULSION_LETTER">İhraç Belgesi</MenuItem>
                <MenuItem value="APPROVAL_CERTIFICATE">Onay Belgesi</MenuItem>
                <MenuItem value="INVITATION_LETTER">Davet Mektubu</MenuItem>
                <MenuItem value="CONGRATULATION_LETTER">Tebrik Mektubu</MenuItem>
                <MenuItem value="WARNING_LETTER">Uyarı Mektubu</MenuItem>
                <MenuItem value="NOTIFICATION_LETTER">Bildirim Mektubu</MenuItem>
                <MenuItem value="MEMBERSHIP_APPLICATION">Üyelik Başvurusu</MenuItem>
                <MenuItem value="TRANSFER_CERTIFICATE">Nakil Belgesi</MenuItem>
                <MenuItem value="BULK_MEMBER_LIST">Toplu üye listesi</MenuItem>
                <MenuItem value="OTHER">Diğer</MenuItem>
              </Select>
            </FormControl>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={500}>
                    Kullanılabilir Değişkenler
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                    Şablon içeriğinde kullanabileceğiniz değişkenler. Değişkenleri {'{{'}variable{'}}'} formatında kullanın.
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {[
                      { name: '{{firstName}}', desc: 'Ad' },
                      { name: '{{lastName}}', desc: 'Soyad' },
                      { name: '{{memberNumber}}', desc: 'Üye Numarası' },
                      { name: '{{nationalId}}', desc: 'TC Kimlik No' },
                      { name: '{{phone}}', desc: 'Telefon' },
                      { name: '{{email}}', desc: 'E-posta' },
                      { name: '{{province}}', desc: 'İl' },
                      { name: '{{district}}', desc: 'İlçe' },
                      { name: '{{institution}}', desc: 'Kurum' },
                      { name: '{{branch}}', desc: 'Şube' },
                      { name: '{{date}}', desc: 'Tarih' },
                      { name: '{{joinDate}}', desc: 'Üyelik Tarihi' },
                    ].map((variable) => (
                      <Chip
                        key={variable.name}
                        label={`${variable.name} - ${variable.desc}`}
                        size="small"
                        onClick={() => {
                          const textarea = document.querySelector('textarea[placeholder*="Şablon içeriğini"]') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = formData.template;
                            const newText = text.substring(0, start) + variable.name + text.substring(end);
                            setFormData({ ...formData, template: newText });
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + variable.name.length, start + variable.name.length);
                            }, 0);
                          }
                        }}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
            <TextField
              label="Şablon İçeriği"
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              required
              multiline
              rows={15}
              fullWidth
              placeholder="Şablon içeriğini buraya yazın. Değişkenler için {{variable}} formatını kullanın."
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              }}
            />
            {editingTemplate && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                }
                label="Aktif"
              />
            )}
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
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{viewingTemplate?.name}</DialogTitle>
        <DialogContent>
          {viewingTemplate && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {viewingTemplate.description || 'Açıklama yok'}
              </Typography>
              <TextField
                label="Şablon İçeriği"
                value={viewingTemplate.template}
                multiline
                rows={15}
                fullWidth
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Şablonu Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{templateToDelete?.name}" adlı şablonu silmek istediğinize emin misiniz?
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

export default DocumentTemplatesPage;

