// src/shared/components/common/ErrorDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Stack,
  Fade,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme, alpha } from '@mui/material/styles';

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonText?: string;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  open,
  onClose,
  title = 'Hata',
  message,
  buttonText = 'Tamam',
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: alpha('#000', 0.5),
        },
      }}
    >
      {/* Üst Kırmızı Şerit */}
      <Box
        sx={{
          height: 4,
          backgroundColor: theme.palette.error.main,
        }}
      />

      <DialogTitle
        sx={{
          pt: 3,
          pb: 2,
          px: 3,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Hata İkonu */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${alpha(theme.palette.error.main, 0.2)}`,
              flexShrink: 0,
            }}
          >
            <ErrorOutlineIcon 
              sx={{ 
                color: 'error.main', 
                fontSize: '2rem',
              }} 
            />
          </Box>

          {/* Başlık */}
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                color: 'error.main',
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                display: 'block',
              }}
            >
              İşlem gerçekleştirilemedi
            </Typography>
          </Box>

          {/* Kapat Butonu */}
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.5),
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent 
        sx={{ 
          pt: 3, 
          pb: 2, 
          px: 3,
        }}
      >
        <Box
          sx={{
            mt: 1.5,
            p: 2.5,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.error.main, 0.05),
            border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
          }}
        >
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'text.primary',
              lineHeight: 1.6,
              fontSize: '0.95rem',
            }}
          >
            {message}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          variant="contained"
          color="error"
          fullWidth
          sx={{
            borderRadius: 1.5,
            py: 1.25,
            fontWeight: 600,
            fontSize: '0.95rem',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
            },
          }}
        >
          {buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorDialog;
