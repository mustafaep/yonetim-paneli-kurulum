import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Chip,
  IconButton,
  alpha,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMessages, useSendMessage, useMarkRead } from '../hooks/useWhatsApp';
import type { WhatsAppConversation } from '../types/whatsapp.types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { useAuth } from '../../../app/providers/AuthContext';
import { canSendWhatsAppChat } from '../../../shared/utils/permissions';

interface MessageThreadProps {
  conversation: WhatsAppConversation;
  onBack?: () => void;
}

function getDisplayName(conversation: WhatsAppConversation): string {
  if (conversation.member) {
    return `${conversation.member.firstName} ${conversation.member.lastName}`;
  }
  if (conversation.contactName) return conversation.contactName;
  if (conversation.contactPhone) return conversation.contactPhone;
  return conversation.remoteJid.replace('@s.whatsapp.net', '');
}

const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  onBack,
}) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMessages(conversation.id);
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const { user } = useAuth();
  const canSend = canSendWhatsAppChat(user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

  // Okundu olarak isaretle
  useEffect(() => {
    if (conversation.unreadCount > 0) {
      markRead.mutate(conversation.id);
    }
  }, [conversation.id, conversation.unreadCount]);

  // Yeni mesaj geldiginde asagi scroll
  useEffect(() => {
    if (allMessages.length > prevMessagesLengthRef.current) {
      const isNewMessage =
        allMessages.length - prevMessagesLengthRef.current <= 2;
      if (isNewMessage && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    prevMessagesLengthRef.current = allMessages.length;
  }, [allMessages.length]);

  // Ilk yuklemede asagi scroll
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isLoading]);

  const handleSend = (content: string) => {
    sendMessage.mutate({
      conversationId: conversation.id,
      content,
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current || !hasNextPage || isFetchingNextPage) return;
    if (scrollRef.current.scrollTop < 100) {
      fetchNextPage();
    }
  };

  const displayName = getDisplayName(conversation);
  const isMember = !!conversation.member;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          backgroundColor: (theme) =>
            alpha(theme.palette.background.paper, 0.9),
        }}
      >
        {onBack && (
          <IconButton size="small" onClick={onBack} sx={{ display: { md: 'none' } }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Avatar
          sx={{
            width: 38,
            height: 38,
            backgroundColor: isMember
              ? alpha('#25D366', 0.15)
              : alpha('#9e9e9e', 0.15),
            color: isMember ? '#25D366' : '#9e9e9e',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          {isMember ? (
            displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()
          ) : (
            <PersonIcon sx={{ fontSize: 20 }} />
          )}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {conversation.contactPhone ||
              conversation.remoteJid.replace(/@(s\.whatsapp\.net|c\.us|lid)$/, '')}
          </Typography>
        </Box>
        {isMember && (
          <Chip
            size="small"
            label="Üye"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              backgroundColor: alpha('#25D366', 0.1),
              color: '#25D366',
            }}
          />
        )}
      </Box>

      {/* Mesajlar */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 1,
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? '#0b141a' : '#efeae2',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'a\' patternUnits=\'userSpaceOnUse\' width=\'40\' height=\'40\'%3E%3Cpath d=\'M0 20h40M20 0v40\' fill=\'none\' stroke=\'%23000\' stroke-opacity=\'.02\' stroke-width=\'.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23a)\' width=\'200\' height=\'200\'/%3E%3C/svg%3E")',
        }}
      >
        {isFetchingNextPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : allMessages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Henüz mesaj yok. İlk mesajı gönderin!
            </Typography>
          </Box>
        ) : (
          allMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
      </Box>

      {/* Mesaj Girisi */}
      <MessageInput
        onSend={handleSend}
        disabled={sendMessage.isPending || !canSend}
      />
    </Box>
  );
};

export default MessageThread;
