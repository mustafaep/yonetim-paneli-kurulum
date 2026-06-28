import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplate,
} from '../services/emailApi';

const PRIMARY = '#3182ce';
const PRIMARY_DARK = '#2b6cb0';

const TRIGGER_EVENTS = [
  { value: '', label: 'Yok (Manuel)', description: '' },
  { value: 'MEMBER_APPLICATION', label: 'Üye Başvuru Yapıldığında', description: 'Yeni başvuru sisteme girdiğinde' },
  { value: 'MEMBER_APPROVED', label: 'Üye Onaylandığında', description: 'Admin başvuruyu onayladığında (üye numarası atanır)' },
  { value: 'MEMBER_ACTIVATED', label: 'Üye Aktifleştirildiğinde', description: 'Üyelik aktif duruma geçirildiğinde' },
  { value: 'MEMBER_REJECTED', label: 'Üye Reddedildiğinde', description: 'Başvuru reddedildiğinde' },
  { value: 'MEMBER_CANCELLED', label: 'Üyelik İptal Edildiğinde', description: 'Üyelik iptal/istifa/ihraç edildiğinde' },
  { value: 'PAYMENT_RECEIVED', label: 'Ödeme Alındığında', description: 'Aidat ödemesi kaydedildiğinde' },
  { value: 'PAYMENT_DUE', label: 'Ödeme Vadesi Geldiğinde', description: 'Aidat ödeme hatırlatması' },
];

const AVAILABLE_VARIABLES = [
  { key: '{{firstName}}', label: 'Ad', description: 'Üyenin adı' },
  { key: '{{lastName}}', label: 'Soyad', description: 'Üyenin soyadı' },
  { key: '{{fullName}}', label: 'Ad Soyad', description: 'Üyenin tam adı' },
  { key: '{{registrationNumber}}', label: 'Üye No', description: 'Üye kayıt numarası' },
  { key: '{{email}}', label: 'E-posta', description: 'Üyenin e-posta adresi' },
  { key: '{{phone}}', label: 'Telefon', description: 'Üyenin telefon numarası' },
  { key: '{{province}}', label: 'İl', description: 'Üyenin ili' },
  { key: '{{district}}', label: 'İlçe', description: 'Üyenin ilçesi' },
  { key: '{{branch}}', label: 'Şube', description: 'Üyenin şubesi' },
  { key: '{{institution}}', label: 'Kurum', description: 'Üyenin kurumu' },
  { key: '{{status}}', label: 'Durum', description: 'Üyelik durumu' },
];

const PREVIEW_VALUES: Record<string, string> = {
  firstName: 'Ahmet',
  lastName: 'Yılmaz',
  fullName: 'Ahmet Yılmaz',
  registrationNumber: '2026-001',
  email: 'ahmet@example.com',
  phone: '05551234567',
  province: 'İstanbul',
  district: 'Kadıköy',
  branch: 'İstanbul Şubesi',
  institution: 'ABC Kurumu',
  status: 'ACTIVE',
};

interface TemplateForm {
  name: string;
  slug: string;
  subject: string;
  content: string;
  description: string;
  triggerEvent: string;
  isActive: boolean;
}

const emptyForm: TemplateForm = { name: '', slug: '', subject: '', content: '', description: '', triggerEvent: '', isActive: true };

// E-posta içeriği için değişken ekleme hedefi
type InsertTarget = 'subject' | 'content';

const EmailTemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget>('content');

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['emailTemplates'],
    queryFn: getEmailTemplates,
  });

  const createMutation = useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emailTemplates'] }); setDialogOpen(false); },
    onError: (e: any) => setError(e?.response?.data?.message || e?.message || 'Oluşturma başarısız'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TemplateForm> }) => updateEmailTemplate(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emailTemplates'] }); setDialogOpen(false); },
    onError: (e: any) => setError(e?.response?.data?.message || e?.message || 'Güncelleme başarısız'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emailTemplates'] }); setDeleteConfirmId(null); },
  });

  const usedTriggerEvents = useMemo(() => {
    if (!templates) return new Set<string>();
    return new Set(templates.filter((t) => t.isActive && t.triggerEvent).map((t) => t.triggerEvent!));
  }, [templates]);

  const handleOpen = (template?: EmailTemplate) => {
    setError(null);
    if (template) {
      setEditingId(template.id);
      setForm({ name: template.name, slug: template.slug, subject: template.subject, content: template.content, description: template.description || '', triggerEvent: template.triggerEvent || '', isActive: template.isActive });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setInsertTarget('content');
    setDialogOpen(true);
  };

  const handleSave = () => {
    setError(null);
    const data = { name: form.name, slug: form.slug, subject: form.subject, content: form.content, description: form.description || undefined, triggerEvent: form.triggerEvent || undefined, isActive: form.isActive };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate({ name: form.name, slug: form.slug, subject: form.subject, content: form.content, description: form.description || undefined, triggerEvent: form.triggerEvent || undefined });
    }
  };

  const handleNameChange = (name: string) => {
    const slug = name.toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
    setForm({ ...form, name, slug: editingId ? form.slug : slug });
  };

  const insertVariable = (variable: string) => {
    if (insertTarget === 'subject') {
      setForm({ ...form, subject: `${form.subject}${variable}` });
    } else {
      setForm({ ...form, content: `${form.content}${variable}` });
    }
  };

  const previewSubject = form.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => PREVIEW_VALUES[key] ?? `{{${key}}}`);
  const previewContent = form.content.replace(/\{\{(\w+)\}\}/g, (_, key) => PREVIEW_VALUES[key] ?? `{{${key}}}`);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DescriptionIcon sx={{ color: PRIMARY }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>E-posta Şablonları</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ backgroundColor: PRIMARY, '&:hover': { backgroundColor: PRIMARY_DARK } }}
        >
          Yeni Şablon
        </Button>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : !templates?.length ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Henüz şablon oluşturulmamış</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Şablon Adı</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Konu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tetikleyici</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Önizleme</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{template.name}</Typography>
                      {template.description && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{template.description}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {template.subject}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {template.triggerEvent ? (
                        <Chip label={TRIGGER_EVENTS.find((e) => e.value === template.triggerEvent)?.label || template.triggerEvent} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">Manuel</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.isActive ? 'Aktif' : 'Pasif'}
                        size="small"
                        sx={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: template.isActive ? alpha('#4caf50', 0.1) : alpha('#f44336', 0.1), color: template.isActive ? '#2e7d32' : '#c62828' }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {template.content}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(template)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(template.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Şablonu Düzenle' : 'Yeni E-posta Şablonu Oluştur'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            <TextField label="Şablon Adı" fullWidth value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Örn: Üye Onay E-postası" />
            <TextField label="Slug" fullWidth value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} helperText="Otomatik oluşturulur. Benzersiz olmalıdır." slotProps={{ input: { sx: { fontFamily: 'monospace' } } }} />
            <TextField label="Açıklama" fullWidth value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Bu şablon ne zaman kullanılır?" />

            <TextField
              label="Tetikleyici Olay"
              fullWidth
              select
              value={form.triggerEvent}
              onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })}
              helperText={TRIGGER_EVENTS.find((e) => e.value === form.triggerEvent)?.description || 'Otomatik gönderim için bir olay seçin'}
            >
              {TRIGGER_EVENTS.map((event) => {
                const isUsed = !!event.value && usedTriggerEvents.has(event.value) && event.value !== (editingId ? templates?.find((t) => t.id === editingId)?.triggerEvent : undefined);
                return (
                  <MenuItem key={event.value} value={event.value} disabled={isUsed}>
                    {event.label}{isUsed && ' (kullanılıyor)'}
                  </MenuItem>
                );
              })}
            </TextField>

            {/* Konu satırı - tıklanınca insertTarget=subject */}
            <TextField
              label="E-posta Konusu"
              fullWidth
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              onFocus={() => setInsertTarget('subject')}
              placeholder="Örn: Merhaba {{fullName}}, üyelik başvurunuz onaylandı"
              helperText={insertTarget === 'subject' ? '← Değişken eklemek için aşağıdaki chip\'lere tıklayın' : undefined}
            />

            {/* İçerik - tıklanınca insertTarget=content */}
            <TextField
              label="E-posta İçeriği (HTML)"
              fullWidth
              multiline
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              onFocus={() => setInsertTarget('content')}
              placeholder={'Örn: <p>Merhaba {{fullName}},</p><p>Üyelik başvurunuz onaylanmıştır. Üye numaranız: <strong>{{registrationNumber}}</strong></p>'}
              helperText={insertTarget === 'content' ? '← Değişken eklemek için aşağıdaki chip\'lere tıklayın' : undefined}
            />

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                Kullanılabilir Değişkenler (tıklayarak <strong>{insertTarget === 'subject' ? 'Konu\'ya' : 'İçerik\'e'}</strong> ekle):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {AVAILABLE_VARIABLES.map((v) => (
                  <Tooltip key={v.key} title={`${v.description} → ${insertTarget === 'subject' ? 'Konu' : 'İçerik'} alanına ekle`} arrow>
                    <Chip
                      icon={<ContentCopyIcon sx={{ fontSize: 12 }} />}
                      label={`${v.key} — ${v.label}`}
                      size="small"
                      sx={{ fontSize: '0.7rem', fontFamily: 'monospace', cursor: 'pointer', '&:hover': { backgroundColor: alpha(PRIMARY, 0.15) } }}
                      onClick={() => insertVariable(v.key)}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {(form.subject || form.content) && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(PRIMARY, 0.04), borderColor: alpha(PRIMARY, 0.3) }}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>Önizleme:</Typography>
                {form.subject && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Konu: </Typography>
                    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>{previewSubject}</Typography>
                  </Box>
                )}
                {form.content && (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary' }}>{previewContent}</Typography>
                )}
              </Paper>
            )}

            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} color="success" />}
              label="Aktif"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!form.name || !form.slug || !form.subject || !form.content || createMutation.isPending || updateMutation.isPending}
            sx={{ backgroundColor: PRIMARY, '&:hover': { backgroundColor: PRIMARY_DARK } }}
          >
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={20} color="inherit" /> : editingId ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Şablonu Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu şablonu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>İptal</Button>
          <Button onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} color="error" variant="contained">Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailTemplatesPage;
