import React from 'react';
import { Box, Typography, Tooltip, alpha } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { WhatsAppMessage } from '../types/whatsapp.types';

interface MessageBubbleProps {
  message: WhatsAppMessage;
}

function formatMessageTime(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusIcon({ status }: { status: string }) {
  const iconSx = { fontSize: 14 };

  switch (status) {
    case 'PENDING':
      return <AccessTimeIcon sx={{ ...iconSx, color: 'rgba(255,255,255,0.6)' }} />;
    case 'SENT':
      return <DoneIcon sx={{ ...iconSx, color: 'rgba(255,255,255,0.7)' }} />;
    case 'DELIVERED':
      return <DoneAllIcon sx={{ ...iconSx, color: 'rgba(255,255,255,0.7)' }} />;
    case 'READ':
      return <DoneAllIcon sx={{ ...iconSx, color: '#53bdeb' }} />;
    case 'FAILED':
      return (
        <Tooltip title="Gönderilemedi" arrow>
          <ErrorOutlineIcon sx={{ ...iconSx, color: '#ff6b6b' }} />
        </Tooltip>
      );
    default:
      return null;
  }
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutbound = message.direction === 'OUTBOUND';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOutbound ? 'flex-end' : 'flex-start',
        px: 2,
        py: 0.25,
      }}
    >
      <Box
        sx={{
          maxWidth: '65%',
          minWidth: 80,
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          borderTopLeftRadius: isOutbound ? 8 : 2,
          borderTopRightRadius: isOutbound ? 2 : 8,
          backgroundColor: isOutbound ? '#005c4b' : '#202c33',
          color: '#e9edef',
          position: 'relative',
        }}
      >
        {/* Gonderen (sadece outbound ve admin ise) */}
        {isOutbound && message.sentBy && (
          <Typography
            variant="caption"
            sx={{
              color: '#53bdeb',
              fontWeight: 600,
              fontSize: '0.7rem',
              display: 'block',
              mb: 0.25,
            }}
          >
            {message.sentBy.firstName} {message.sentBy.lastName}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          {message.content}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.5,
            mt: 0.25,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {formatMessageTime(message.sentAt || message.createdAt)}
          </Typography>
          {isOutbound && <StatusIcon status={message.status} />}
        </Box>

        {/* Hata mesaji */}
        {message.status === 'FAILED' && message.errorMessage && (
          <Typography
            variant="caption"
            sx={{
              color: '#ff6b6b',
              fontSize: '0.65rem',
              display: 'block',
              mt: 0.25,
            }}
          >
            {message.errorMessage}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MessageBubble;
