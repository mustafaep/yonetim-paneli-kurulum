// src/shared/components/common/ConfirmDialog.tsx
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTheme, alpha } from '@mui/material/styles';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'error' | 'info' | 'success';
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  variant = 'warning',
  loading = false,
}) => {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          icon: <CancelIcon sx={{ fontSize: 48, color: theme.palette.error.main }} />,
          bgColor: alpha(theme.palette.error.main, 0.1),
          borderColor: theme.palette.error.main,
          confirmColor: 'error' as const,
        };
      case 'success':
        return {
          icon: <CheckCircleIcon sx={{ fontSize: 48, color: theme.palette.success.main }} />,
          bgColor: alpha(theme.palette.success.main, 0.1),
          borderColor: theme.palette.success.main,
          confirmColor: 'success' as const,
        };
      case 'info':
        return {
          icon: <WarningIcon sx={{ fontSize: 48, color: theme.palette.info.main }} />,
          bgColor: alpha(theme.palette.info.main, 0.1),
          borderColor: theme.palette.info.main,
          confirmColor: 'info' as const,
        };
      default: // warning
        return {
          icon: <WarningIcon sx={{ fontSize: 48, color: theme.palette.warning.main }} />,
          bgColor: alpha(theme.palette.warning.main, 0.1),
          borderColor: theme.palette.warning.main,
          confirmColor: 'warning' as const,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              backgroundColor: variantStyles.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${alpha(variantStyles.borderColor, 0.3)}`,
            }}
          >
            {variantStyles.icon}
          </Box>
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
        </Box>
        {!loading && (
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
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {message}
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          gap: 1,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        borderRadius: '0 0 12px 12px',
        justifyContent: 'flex-end',
        '& > *': {
          minWidth: 100,
        },
        '& > :not(style) ~ :not(style)': {
          marginLeft: 0,
        },
      }}
    >
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: 600,
            textTransform: 'none',
            borderColor: alpha(theme.palette.divider, 0.3),
            '&:hover': {
              borderColor: theme.palette.text.secondary,
              backgroundColor: alpha(theme.palette.action.hover, 0.5),
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={variantStyles.confirmColor}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: `0 4px 12px ${alpha(
              variant === 'error'
                ? theme.palette.error.main
                : variant === 'success'
                ? theme.palette.success.main
                : variant === 'info'
                ? theme.palette.info.main
                : theme.palette.warning.main,
              0.3
            )}`,
            '&:hover': {
              boxShadow: `0 6px 16px ${alpha(
                variant === 'error'
                  ? theme.palette.error.main
                  : variant === 'success'
                  ? theme.palette.success.main
                  : variant === 'info'
                  ? theme.palette.info.main
                  : theme.palette.warning.main,
                0.4
              )}`,
            },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
