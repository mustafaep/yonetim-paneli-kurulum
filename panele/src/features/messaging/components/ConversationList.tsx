import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Typography,
  List,
  CircularProgress,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
  Autocomplete,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import { useQuery } from '@tanstack/react-query';
import { useConversations, useDeleteConversation, useSendToPhone } from '../hooks/useWhatsApp';
import ConversationItem from './ConversationItem';
import type { WhatsAppConversation } from '../types/whatsapp.types';
import { useToast } from '../../../shared/hooks/useToast';
import { getApiErrorMessage } from '../../../shared/utils/errorUtils';
import { useAuth } from '../../../app/providers/AuthContext';
import {
  canManageWhatsAppChat,
  canSendWhatsAppChat,
} from '../../../shared/utils/permissions';
import { getMembers } from '../../members/services/membersApi';
import type { MemberListItem } from '../../../types/member';

interface ConversationListProps {
  selectedId?: string;
  onSelect: (id: string) => void;
  onConversationDeleted?: (id: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  selectedId,
  onSelect,
  onConversationDeleted,
}) => {
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<WhatsAppConversation | null>(null);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatMember, setNewChatMember] = useState<MemberListItem | null>(null);
  const [newChatMemberInput, setNewChatMemberInput] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const { data, isLoading, refetch } = useConversations({
    search: search || undefined,
  });
  const deleteConversation = useDeleteConversation();
  const sendToPhone = useSendToPhone();
  const toast = useToast();
  const { user } = useAuth();
  const canSend = canSendWhatsAppChat(user);
  const canDeleteConv = canManageWhatsAppChat(user);

  const { data: allMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members-with-phone'],
    queryFn: () => getMembers(),
    enabled: newChatDialogOpen,
    staleTime: 60_000,
  });

  const membersWithPhone = useMemo(
    () => allMembers.filter((m) => !!m.phone),
    [allMembers],
  );

  const normalizePhone = (value: string) => value.replace(/\D/g, '');

  const closeNewChatDialog = () => {
    if (sendToPhone.isPending) return;
    setNewChatDialogOpen(false);
    setNewChatMember(null);
    setNewChatMemberInput('');
    setNewChatMessage('');
  };

  const handleCreateNewChat = async () => {
    const phone = newChatMember?.phone;
    if (!phone) {
      toast.error('Lütfen telefon numarası olan bir üye seçin');
      return;
    }
    if (!newChatMessage.trim()) {
      toast.error('Lütfen ilk mesajı yazın');
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    try {
      await sendToPhone.mutateAsync({
        phone: normalizedPhone,
        content: newChatMessage.trim(),
      });
      const refreshed = await refetch();
      const conversations = refreshed.data?.data ?? data?.data ?? [];
      const createdConversation = conversations.find((conversation) => {
        const cp = normalizePhone(conversation.contactPhone || '');
        const jid = normalizePhone(conversation.remoteJid.split('@')[0] || '');
        return cp.endsWith(normalizedPhone) || normalizedPhone.endsWith(cp) || jid.endsWith(normalizedPhone);
      });

      toast.success('Yeni sohbet oluşturuldu');
      closeNewChatDialog();
      if (createdConversation) {
        onSelect(createdConversation.id);
      }
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Yeni sohbet oluşturulurken bir hata oluştu'));
    }
  };

  const openDeleteDialog = (conversation: WhatsAppConversation) => {
    setConversationToDelete(conversation);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleteConversation.isPending) return;
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    try {
      await deleteConversation.mutateAsync(conversationToDelete.id);
      toast.success('Sohbet geçmişi silindi');
      onConversationDeleted?.(conversationToDelete.id);
      closeDeleteDialog();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Sohbet silinirken bir hata oluştu'));
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Arama */}
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Kişi veya mesaj ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.4),
                '& fieldset': { border: 'none' },
              },
            }}
          />
          {canSend && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setNewChatDialogOpen(true)}
              sx={{
                whiteSpace: 'nowrap',
                backgroundColor: '#25D366',
                '&:hover': { backgroundColor: '#128C7E' },
              }}
            >
              Yeni
            </Button>
          )}
        </Stack>
      </Box>

      {/* Konusma Listesi */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !data?.data?.length ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {search ? 'Sonuç bulunamadı' : 'Henüz konuşma yok'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {data.data.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedId}
                onClick={() => onSelect(conversation.id)}
                onDelete={openDeleteDialog}
                deleting={deleteConversation.isPending && conversationToDelete?.id === conversation.id}
                showDelete={canDeleteConv}
              />
            ))}
          </List>
        )}
      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Sohbeti Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu sohbetin tum mesaj gecmisini kalici olarak silmek istiyor musunuz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleteConversation.isPending}>
            Vazgec
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDeleteConversation}
            disabled={deleteConversation.isPending}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newChatDialogOpen} onClose={closeNewChatDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Yeni Sohbet Başlat</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Autocomplete
              options={membersWithPhone}
              value={newChatMember}
              inputValue={newChatMemberInput}
              onInputChange={(_, val) => setNewChatMemberInput(val)}
              onChange={(_, member) => setNewChatMember(member)}
              loading={membersLoading}
              getOptionLabel={(m) =>
                `${m.firstName} ${m.lastName}${m.registrationNumber ? ` (${m.registrationNumber})` : ''}`
              }
              filterOptions={(options, state) => {
                const q = state.inputValue.toLowerCase().trim();
                if (!q) return options;
                return options.filter((m) =>
                  `${m.firstName} ${m.lastName} ${m.phone || ''} ${m.registrationNumber || ''}`
                    .toLowerCase()
                    .includes(q),
                );
              }}
              renderOption={(props, m) => (
                <Box component="li" {...props} key={m.id}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {m.firstName} {m.lastName}
                      {m.registrationNumber && (
                        <Typography component="span" variant="caption" sx={{ ml: 0.75, color: 'text.secondary' }}>
                          #{m.registrationNumber}
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.phone}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Üye Ara"
                  placeholder="İsim, telefon veya üye no ile ara..."
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {membersLoading ? <CircularProgress size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />
            {newChatMember && (
              <Chip
                label={`${newChatMember.phone}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              />
            )}
            <TextField
              label="İlk Mesaj"
              placeholder="Merhaba..."
              value={newChatMessage}
              onChange={(e) => setNewChatMessage(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNewChatDialog} disabled={sendToPhone.isPending}>
            Vazgeç
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateNewChat}
            disabled={sendToPhone.isPending || !newChatMember || !newChatMessage.trim()}
            sx={{
              backgroundColor: '#25D366',
              '&:hover': { backgroundColor: '#128C7E' },
            }}
          >
            {sendToPhone.isPending ? 'Gonderiliyor...' : 'Sohbeti Baslat'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConversationList;
