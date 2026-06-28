// src/pages/system/components/MemberGroupsManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  useTheme,
  alpha,
  Chip,
  Alert,
  Stack,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import GroupIcon from '@mui/icons-material/Group';
import {
  getAllMemberGroups,
  createMemberGroup,
  updateMemberGroup,
  deleteMemberGroup,
  moveMemberGroup,
  type MemberGroup,
  type CreateMemberGroupDto,
  type UpdateMemberGroupDto,
} from '../services/memberGroupsApi';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';

interface MemberGroupsManagementProps {
  canManage?: boolean;
}

const MemberGroupsManagement: React.FC<MemberGroupsManagementProps> = ({
  canManage = false,
}) => {
  const theme = useTheme();
  const toast = useToast();
  const [memberGroups, setMemberGroups] = useState<MemberGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MemberGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<MemberGroup | null>(null);
  const [formData, setFormData] = useState<CreateMemberGroupDto>({
    name: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => {
    loadMemberGroups();
  }, []);

  const loadMemberGroups = async () => {
    setLoading(true);
    try {
      const data = await getAllMemberGroups();
      setMemberGroups(data);
    } catch (error: unknown) {
      console.error('Üye grupları yüklenirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Üye grupları yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (group?: MemberGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description || '',
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
    });
    setFormErrors({});
  };

  const handleSave = async () => {
    // Validation
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Üye grubu adı zorunludur';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingGroup) {
        const updateDto: UpdateMemberGroupDto = {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
        };
        await updateMemberGroup(editingGroup.id, updateDto);
        toast.success('Üye grubu başarıyla güncellendi');
      } else {
        // order belirtme - backend otomatik ekleyecek
        await createMemberGroup({
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
        });
        toast.success('Üye grubu başarıyla oluşturuldu');
      }
      handleCloseDialog();
      await loadMemberGroups();
    } catch (error: unknown) {
      console.error('Üye grubu kaydedilirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Üye grubu kaydedilirken bir hata oluştu'));
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    setMoving(id);
    try {
      await moveMemberGroup(id, direction);
      toast.success(`Üye grubu sırası güncellendi`);
      await loadMemberGroups();
    } catch (error: unknown) {
      console.error('Sıra güncellenirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Sıra güncellenirken bir hata oluştu'));
    } finally {
      setMoving(null);
    }
  };

  const handleToggleActive = async (group: MemberGroup) => {
    try {
      await updateMemberGroup(group.id, { isActive: !group.isActive });
      toast.success(`Üye grubu ${group.isActive ? 'pasif' : 'aktif'} yapıldı`);
      await loadMemberGroups();
    } catch (error: unknown) {
      console.error('Üye grubu güncellenirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Üye grubu güncellenirken bir hata oluştu'));
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;

    try {
      await deleteMemberGroup(deletingGroup.id);
      toast.success('Üye grubu başarıyla silindi');
      setDeleteDialogOpen(false);
      setDeletingGroup(null);
      await loadMemberGroups();
    } catch (error: unknown) {
      console.error('Üye grubu silinirken hata:', error);
      toast.error(getApiErrorMessage(error, 'Üye grubu silinirken bir hata oluştu'));
    }
  };

  return (
    <>
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 2.5,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GroupIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                Üye Grupları Yönetimi
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Üye gruplarını oluşturun, düzenleyin ve yönetin
              </Typography>
            </Box>
          </Box>
          {canManage && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="small"
            >
              Yeni Üye Grubu
            </Button>
          )}
        </Box>

        <Box sx={{ p: 3 }}>
          {!canManage && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Bu bölümü düzenlemek için sistem ayarları yönetim yetkisine sahip olmanız gerekmektedir.
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sıra</TableCell>
                  <TableCell>Üye Grubu Adı</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Yükleniyor...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : memberGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Henüz üye grubu eklenmemiş
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  memberGroups.map((group, index) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{group.order}</Typography>
                          {canManage && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Tooltip title="Yukarı Taşı">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleMove(group.id, 'up')}
                                    disabled={moving === group.id || index === 0}
                                    sx={{ p: 0.25 }}
                                  >
                                    <ArrowUpwardIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Aşağı Taşı">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleMove(group.id, 'down')}
                                    disabled={moving === group.id || index === memberGroups.length - 1}
                                    sx={{ p: 0.25 }}
                                  >
                                    <ArrowDownwardIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {group.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {group.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={group.isActive ? 'Aktif' : 'Pasif'}
                          color={group.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {canManage && (
                            <>
                              <Tooltip title={group.isActive ? 'Pasif Yap' : 'Aktif Yap'}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleActive(group)}
                                  color={group.isActive ? 'warning' : 'success'}
                                >
                                  <Switch checked={group.isActive} size="small" readOnly />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Düzenle">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(group)}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Sil">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setDeletingGroup(group);
                                    setDeleteDialogOpen(true);
                                  }}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGroup ? 'Üye Grubu Düzenle' : 'Yeni Üye Grubu Oluştur'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Üye Grubu Adı"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
            <TextField
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleSave} variant="contained">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Üye Grubunu Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{deletingGroup?.name}" üye grubunu silmek istediğinize emin misiniz?
            <br />
            Bu üye grubu kullanımda ise pasif yapılacak, değilse kalıcı olarak silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MemberGroupsManagement;

