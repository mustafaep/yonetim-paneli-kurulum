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
import { useQuery } from '@tanstack/react-query';
import { useBulkHistory, useSendBulk } from '../hooks/useWhatsApp';
import { getMembers } from '../../members/services/membersApi';
import ConnectionStatusBadge from '../components/ConnectionStatusBadge';
import type { BulkSendResult } from '../types/whatsapp.types';
import type { MemberListItem, MemberStatus } from '../../../types/member';

const WhatsAppBulkPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<MemberListItem[]>([]);
  const [memberSearchInput, setMemberSearchInput] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<BulkSendResult | null>(null);
  const [failedOpen, setFailedOpen] = useState(false);

  const sendBulk = useSendBulk();
  const { data: bulkHistory = [], isLoading: bulkHistoryLoading } = useBulkHistory(5);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members', statusFilter || undefined],
    queryFn: () => getMembers(statusFilter || undefined),
  });

  const selectableMembers = useMemo(
    () =>
      members.filter((member) => !!member.phone && !selectedIds.has(member.id)),
    [members, selectedIds],
  );

  const addMember = (member: MemberListItem | null) => {
    if (!member || selectedIds.has(member.id)) return;
    setSelectedIds((prev) => new Set(prev).add(member.id));
    setSelectedMembers((prev) => [...prev, member]);
    setMemberSearchInput('');
  };

  const removeSelectedMember = (memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
    setSelectedMembers((prev) => prev.filter((member) => member.id !== memberId));
  };

  const handleSend = () => {
    setConfirmOpen(false);
    setResult(null);

    const payload: { message: string; memberIds?: string[] } = { message };
    if (selectedIds.size > 0) {
      payload.memberIds = Array.from(selectedIds);
    }

    sendBulk.mutate(payload, {
      onSuccess: (data) => {
        setResult(data);
        if (data.failed > 0) {
          setFailedOpen(true);
        }
      },
    });
  };

  const canSend = message.trim() && selectedIds.size > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Sonuç */}
      {result && (
        <Alert
          severity={result.failed > 0 ? 'warning' : 'success'}
          onClose={() => setResult(null)}
          icon={
            result.failed > 0 ? (
              <ErrorOutlineIcon />
            ) : (
              <CheckCircleOutlineIcon />
            )
          }
        >
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Toplu mesaj gönderildi: {result.sent} başarılı, {result.failed}{' '}
              başarısız (toplam {result.total} üye)
            </Typography>
            {result.failedMembers && result.failedMembers.length > 0 && (
              <>
                <Button
                  size="small"
                  onClick={() => setFailedOpen(!failedOpen)}
                  endIcon={failedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ mt: 0.5, textTransform: 'none' }}
                >
                  Başarısız üyeleri {failedOpen ? 'gizle' : 'göster'} (
                  {result.failedMembers.length})
                </Button>
                <Collapse in={failedOpen}>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {result.failedMembers.map((fm) => (
                      <Box
                        key={fm.memberId}
                        sx={{
                          p: 1.25,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1.5,
                          backgroundColor: (theme) => theme.palette.background.default,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {fm.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {fm.phone}
                        </Typography>
                        <Typography variant="caption" color="error">
                          {fm.error}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </>
            )}
          </Box>
        </Alert>
      )}

      {/* Üye Seçimi */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GroupsIcon sx={{ color: '#25D366' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Üye Seçimi
            </Typography>
            {selectedIds.size > 0 && (
              <Chip
                label={`${selectedIds.size} üye seçili`}
                color="success"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
          <ConnectionStatusBadge />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <Autocomplete
            fullWidth
            size="small"
            options={selectableMembers}
            value={null}
            inputValue={memberSearchInput}
            onInputChange={(_, value) => setMemberSearchInput(value)}
            onChange={(_, member) => addMember(member)}
            getOptionLabel={(member) =>
              `${member.firstName} ${member.lastName} - ${member.phone || 'Telefon yok'}`
            }
            filterOptions={(options, state) => {
              const q = state.inputValue.toLowerCase().trim();
              if (!q) return options;
              return options.filter((member) =>
                `${member.firstName} ${member.lastName} ${member.phone || ''} ${member.registrationNumber || ''}`
                  .toLowerCase()
                  .includes(q),
              );
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Üye ara ve seç..." />
            )}
          />
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Üye Durumu</InputLabel>
            <Select
              value={statusFilter}
              label="Üye Durumu"
              onChange={(e) => {
                setStatusFilter(e.target.value as MemberStatus | '');
              }}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="APPROVED">Onaylı</MenuItem>
              <MenuItem value="PENDING">Beklemede</MenuItem>
              <MenuItem value="ACTIVE">Aktif</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {membersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : selectedMembers.length === 0 ? (
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Henüz üye seçilmedi. Yukarıdaki alandan üye seçebilirsiniz.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {selectedMembers.map((member) => (
              <Box
                key={member.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.25,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: (theme) => theme.palette.background.default,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {member.firstName} {member.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {member.phone}
                    {member.registrationNumber ? ` • ${member.registrationNumber}` : ''}
                    {member.memberGroup?.name ? ` • ${member.memberGroup.name}` : ''}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  color="error"
                  onClick={() => removeSelectedMember(member.id)}
                >
                  Kaldır
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Mesaj */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Mesaj İçeriği
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={5}
          placeholder="Üyelere gönderilecek mesajı yazın..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {selectedIds.size > 0
              ? `${selectedIds.size} üyeye gönderilecek`
              : 'Üye seçiniz'}
          </Typography>
          <Button
            variant="contained"
            startIcon={
              sendBulk.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend || sendBulk.isPending}
            sx={{
              backgroundColor: '#25D366',
              '&:hover': { backgroundColor: '#128C7E' },
            }}
          >
            {sendBulk.isPending ? 'Gönderiliyor...' : 'Toplu Gönder'}
          </Button>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Son Toplu Mesaj Gönderimleri
        </Typography>

        {bulkHistoryLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : bulkHistory.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Henüz toplu mesaj geçmişi bulunmuyor.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {bulkHistory.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Gönderen: {item.sentBy ? `${item.sentBy.firstName} ${item.sentBy.lastName}` : 'Bilinmiyor'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                  Tarih: {new Date(item.createdAt).toLocaleString('tr-TR')} • Başarılı: {item.sent} / Toplam: {item.total}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Mesaj: {item.message}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {item.recipients.map((recipient) => (
                    <Chip
                      key={`${item.id}-${recipient.memberId}`}
                      size="small"
                      label={`${recipient.name} (${recipient.phone})`}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Onay Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Toplu Mesaj Gönderimi</DialogTitle>
        <DialogContent>
          <Typography>
            Bu mesaj <strong>{selectedIds.size} üyeye</strong> WhatsApp
            üzerinden gönderilecektir. Devam etmek istiyor musunuz?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>İptal</Button>
          <Button
            onClick={handleSend}
            variant="contained"
            sx={{
              backgroundColor: '#25D366',
              '&:hover': { backgroundColor: '#128C7E' },
            }}
          >
            Gönder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhatsAppBulkPage;
