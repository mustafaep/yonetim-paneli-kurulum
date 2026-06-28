import React from 'react';
import {
  ListItemButton,
  Box,
  Typography,
  Avatar,
  Badge,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { WhatsAppConversation } from '../types/whatsapp.types';

interface ConversationItemProps {
  conversation: WhatsAppConversation;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (conversation: WhatsAppConversation) => void;
  deleting?: boolean;
  /** Varsayılan: true */
  showDelete?: boolean;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) {
    return date.toLocaleDateString('tr-TR', { weekday: 'short' });
  }
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getDisplayName(conversation: WhatsAppConversation): string {
  if (conversation.member) {
    return `${conversation.member.firstName} ${conversation.member.lastName}`;
  }
  if (conversation.contactName) return conversation.contactName;
  if (conversation.contactPhone) return conversation.contactPhone;
  return conversation.remoteJid.replace(/@(s\.whatsapp\.net|c\.us|lid)$/, '');
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
  onDelete,
  deleting = false,
  showDelete = true,
}) => {
  const displayName = getDisplayName(conversation);
  const isMember = !!conversation.member;
  const hasUnread = conversation.unreadCount > 0;

  return (
    <ListItemButton
      onClick={onClick}
      selected={isSelected}
      sx={{
        px: 2,
        py: 1.5,
        gap: 1.5,
        '&:hover .conversation-delete-btn': {
          opacity: 1,
        },
        '&.Mui-selected': {
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
        },
      }}
    >
      <Badge
        badgeContent={conversation.unreadCount}
        color="success"
        max={99}
        invisible={!hasUnread}
      >
        <Avatar
          sx={{
            width: 44,
            height: 44,
            backgroundColor: isMember
              ? alpha('#25D366', 0.15)
              : alpha('#9e9e9e', 0.15),
            color: isMember ? '#25D366' : '#9e9e9e',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {isMember ? getInitials(displayName) : <PersonIcon />}
        </Avatar>
      </Badge>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.25,
          }}
        >
          <Typography
            variant="subtitle2"
            noWrap
            sx={{
              fontWeight: hasUnread ? 700 : 500,
              flex: 1,
              mr: 1,
            }}
          >
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: hasUnread ? '#25D366' : 'text.disabled',
              fontWeight: hasUnread ? 600 : 400,
              flexShrink: 0,
              fontSize: '0.7rem',
            }}
          >
            {formatTime(conversation.lastMessageAt)}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          noWrap
          sx={{
            color: hasUnread ? 'text.primary' : 'text.secondary',
            fontWeight: hasUnread ? 500 : 400,
            fontSize: '0.8rem',
          }}
        >
          {conversation.lastMessage || 'Henüz mesaj yok'}
        </Typography>
      </Box>

      {showDelete && (
        <Tooltip title="Sohbeti sil">
          <span>
            <IconButton
              className="conversation-delete-btn"
              size="small"
              disabled={deleting}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conversation);
              }}
              sx={{
                opacity: 0,
                transition: 'opacity 0.2s ease',
                color: 'text.secondary',
                '&:hover': {
                  color: 'error.main',
                  backgroundColor: (theme) => alpha(theme.palette.error.main, 0.08),
                },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </ListItemButton>
  );
};

export default ConversationItem;
