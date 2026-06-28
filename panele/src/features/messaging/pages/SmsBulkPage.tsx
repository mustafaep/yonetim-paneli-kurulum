import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Collapse,
  Stack,
  Autocomplete,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import GroupsIcon from '@mui/icons-material/Groups';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sendSmsBulk,
  getSmsBulkHistory,
  type BulkSmsResult,
  type SmsBulkHistoryItem,
} from '../services/smsApi';
import { getMembers } from '../../members/services/membersApi';
import type { MemberListItem, MemberStatus } from '../../../types/member';

const SmsBulkPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<MemberListItem[]>([]);
  const [memberSearchInput, setMemberSearchInput] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<BulkSmsResult | null>(null);
  const [failedOpen, setFailedOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const queryClient = useQueryClient();

  const sendBulkMutation = useMutation({
    mutationFn: sendSmsBulk,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['smsBulkHistory'] });
    },
  });

  const { data: bulkHistory = [], isLoading: bulkHistoryLoading } = useQuery<SmsBulkHistoryItem[]>({
    queryKey: ['smsBulkHistory'],
    queryFn: () => getSmsBulkHistory(5),
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members', statusFilter || undefined],
    queryFn: () => getMembers(statusFilter || undefined),
  });

  const selectableMembers = useMemo(
    () => members.filter((m) => !!m.phone && !selectedIds.has(m.id)),
    [members, selectedIds],
  );

  const addMember = (member: MemberListItem | null) => {
    if (!member || selectedIds.has(member.id)) return;
    setSelectedIds((prev) => new Set(prev).add(member.id));
    setSelectedMembers((prev) => [...prev, member]);
    setMemberSearchInput('');
  };

  const removeMember = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSend = () => {
    setConfirmOpen(false);
    setResult(null);
    const payload: { message: string; memberIds?: string[] } = { message };
    if (selectedIds.size > 0) payload.memberIds = Array.from(selectedIds);
    sendBulkMutation.mutate(payload);
  };

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160) || 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Mesaj alanı */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          SMS Mesajı
        </Typography>
        <TextField
          label="Mesaj içeriği"
          multiline
          rows={4}
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="{{ad}} ve {{soyad}} gibi değişkenler kullanabilirsiniz..."
          helperText={`${charCount} karakter · ~${smsCount} SMS${smsCount > 1 ? ' (bölünecek)' : ''}`}
          sx={{ mb: 2 }}
        />

        {/* Üye seçimi */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Üye Durumu Filtresi</InputLabel>
            <Select
              value={statusFilter}
              label="Üye Durumu Filtresi"
              onChange={(e) => setStatusFilter(e.target.value as MemberStatus | '')}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="ACTIVE">Aktif</MenuItem>
              <MenuItem value="PENDING">Beklemede</MenuItem>
              <MenuItem value="PASSIVE">Pasif</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            sx={{ flex: 1 }}
            options={selectableMembers}
            getOptionLabel={(m) => `${m.firstName} ${m.lastName} (${m.phone || '-'})`}
            inputValue={memberSearchInput}
            onInputChange={(_, v) => setMemberSearchInput(v)}
            onChange={(_, v) => addMember(v)}
            loading={membersLoading}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Üye Ekle (boş = tüm filtre sonuçları)"
                placeholder="İsim veya telefon ile ara..."
              />
            )}
            noOptionsText="Üye bulunamadı"
          />
        </Stack>

        {selectedMembers.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Seçili üyeler ({selectedMembers.length}):
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {selectedMembers.map((m) => (
                <Chip
                  key={m.id}
                  label={`${m.firstName} ${m.lastName}`}
                  size="small"
                  onDelete={() => removeMember(m.id)}
                />
              ))}
            </Stack>
          </Box>
        )}

        {selectedIds.size === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Üye seçilmedi — tüm{statusFilter ? ` "${statusFilter}"` : ''} üyeler alacak.
          </Alert>
        )}

        <Button
          variant="contained"
          startIcon={<SendIcon />}
          disabled={!message.trim() || sendBulkMutation.isPending}
          onClick={() => setConfirmOpen(true)}
          sx={{ bgcolor: '#e53e3e', '&:hover': { bgcolor: '#c53030' } }}
        >
          {sendBulkMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Gönder'}
        </Button>
      </Paper>

      {/* Sonuç */}
      {result && (
        <Alert
          severity={result.failed === 0 ? 'success' : 'warning'}
          icon={result.failed === 0 ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
          action={
            result.failed > 0 ? (
              <Button size="small" onClick={() => setFailedOpen(true)}>
                Detay
              </Button>
            ) : undefined
          }
        >
          {result.sent} SMS gönderildi · {result.failed} başarısız · Toplam: {result.total}
        </Alert>
      )}

      {/* Gönderim geçmişi */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box
          sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setHistoryOpen((p) => !p)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupsIcon fontSize="small" color="action" />
            <Typography variant="subtitle1" fontWeight={600}>Son Gönderimler</Typography>
          </Box>
          {historyOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={historyOpen}>
          <Box sx={{ px: 3, pb: 2 }}>
            {bulkHistoryLoading ? (
              <CircularProgress size={20} />
            ) : bulkHistory.length === 0 ? (
              <Typography color="text.secondary" variant="body2">Henüz toplu gönderim yapılmadı.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {bulkHistory.map((item) => (
                  <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 300 }}>
                          {item.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.sentBy ? `${item.sentBy.firstName} ${item.sentBy.lastName}` : 'Bilinmeyen'} ·{' '}
                          {new Date(item.createdAt).toLocaleString('tr-TR')}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip label={`✓ ${item.sent}`} size="small" color="success" variant="outlined" />
                        {item.failed > 0 && (
                          <Chip label={`✗ ${item.failed}`} size="small" color="error" variant="outlined" />
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Onay dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>SMS Gönderimini Onayla</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            {selectedIds.size > 0
              ? `${selectedIds.size} seçili üyeye`
              : `Tüm${statusFilter ? ` "${statusFilter}"` : ''} üyelere`}{' '}
            SMS gönderilecek.
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, mt: 1, borderRadius: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {message}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>İptal</Button>
          <Button onClick={handleSend} variant="contained" sx={{ bgcolor: '#e53e3e', '&:hover': { bgcolor: '#c53030' } }}>
            Gönder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Başarısız listesi */}
      <Dialog open={failedOpen} onClose={() => setFailedOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gönderilemeyen Üyeler</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {result?.failedMembers.map((m) => (
              <Paper key={m.memberId} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={600}>{m.name}</Typography>
                <Typography variant="caption" color="text.secondary">{m.phone} · {m.error}</Typography>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFailedOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SmsBulkPage;
