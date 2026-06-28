import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, alpha } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ConversationList from '../components/ConversationList';
import MessageThread from '../components/MessageThread';
import { useConversation } from '../hooks/useWhatsApp';

const WhatsAppChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [mobileShowChat, setMobileShowChat] = useState(!!conversationId);

  const { data: selectedConversation } = useConversation(conversationId || '');

  const handleSelect = (id: string) => {
    navigate(`/whatsapp/chat/${id}`);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    navigate('/whatsapp/chat');
    setMobileShowChat(false);
  };

  const handleConversationDeleted = (deletedId: string) => {
    if (conversationId === deletedId) {
      navigate('/whatsapp/chat');
      setMobileShowChat(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: 'calc(100vh - 300px)',
        minHeight: 420,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {/* Sol Panel - Konusmalar */}
      <Box
        sx={{
          width: { xs: '100%', md: 360 },
          flexShrink: 0,
          display: {
            xs: mobileShowChat ? 'none' : 'flex',
            md: 'flex',
          },
          flexDirection: 'column',
        }}
      >
        <ConversationList
          selectedId={conversationId}
          onSelect={handleSelect}
          onConversationDeleted={handleConversationDeleted}
        />
      </Box>

      {/* Sag Panel - Mesajlar */}
      <Box
        sx={{
          flex: 1,
          display: {
            xs: mobileShowChat ? 'flex' : 'none',
            md: 'flex',
          },
          flexDirection: 'column',
        }}
      >
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            onBack={handleBack}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              backgroundColor: (theme) =>
                alpha(theme.palette.background.default, 0.5),
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha('#25D366', 0.08),
              }}
            >
              <WhatsAppIcon sx={{ fontSize: 40, color: '#25D366' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.secondary' }}>
              WhatsApp Mesajları
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              Soldaki listeden bir konuşma seçin
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default WhatsAppChatPage;
