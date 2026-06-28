import React, { useState, useRef } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Popover,
  alpha,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';

const EMOJI_GROUPS = [
  {
    label: 'Sık Kullanılan',
    emojis: ['😀', '😂', '😊', '❤️', '👍', '🙏', '👋', '🎉', '✅', '⭐', '🔥', '💪'],
  },
  {
    label: 'Yüzler',
    emojis: [
      '😃', '😄', '😁', '😆', '🤣', '😅', '😇', '🙂', '😉', '😍', '🥰', '😘',
      '😋', '😜', '🤗', '🤔', '😐', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
      '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '🤬', '😈', '🤯',
    ],
  },
  {
    label: 'El & Vücut',
    emojis: [
      '👋', '🤚', '✋', '🖐️', '👌', '🤌', '✌️', '🤞', '🤟', '🤙', '👈', '👉',
      '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🤝',
      '🙏', '💪', '🦾', '🖕', '✍️', '🤳',
    ],
  },
  {
    label: 'Semboller',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '💯', '💢',
      '✨', '🌟', '⭐', '🔥', '💥', '🎵', '🎶', '✅', '❌', '⚠️', '🔴', '🟢',
      '📌', '📎', '📞', '📧', '🗓️', '🕐',
    ],
  },
];

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
      }}
    >
      <IconButton
        size="small"
        onClick={(e) => setEmojiAnchor(e.currentTarget)}
        disabled={disabled}
        sx={{ color: 'text.secondary', mb: 0.5 }}
      >
        <EmojiEmotionsOutlinedIcon />
      </IconButton>

      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: 340,
              maxHeight: 320,
              overflow: 'auto',
              p: 1.5,
              borderRadius: 2,
            },
          },
        }}
      >
        {EMOJI_GROUPS.map((group) => (
          <Box key={group.label} sx={{ mb: 1 }}>
            <Box
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'text.secondary',
                mb: 0.5,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {group.label}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
              {group.emojis.map((emoji) => (
                <Box
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: (theme) =>
                        alpha(theme.palette.action.hover, 0.6),
                    },
                  }}
                >
                  {emoji}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Popover>

      <TextField
        inputRef={inputRef}
        fullWidth
        multiline
        maxRows={4}
        size="small"
        placeholder="Mesajınızı yazın..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.3),
          },
        }}
      />
      <IconButton
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        sx={{
          backgroundColor: '#25D366',
          color: '#fff',
          '&:hover': { backgroundColor: '#128C7E' },
          '&.Mui-disabled': {
            backgroundColor: (theme) => alpha(theme.palette.action.disabled, 0.1),
            color: (theme) => theme.palette.action.disabled,
          },
          width: 40,
          height: 40,
        }}
      >
        <SendIcon sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  );
};

export default MessageInput;
