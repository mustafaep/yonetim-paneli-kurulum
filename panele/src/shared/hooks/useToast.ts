// src/shared/hooks/useToast.ts
import { useSnackbar } from 'notistack';
import { useErrorDialog } from '../../app/providers/ErrorDialogContext';

export const useToast = () => {
  const { enqueueSnackbar } = useSnackbar();
  const errorDialog = useErrorDialog();

  const showSuccess = (message: string) => {
    enqueueSnackbar(message, {
      variant: 'success',
      autoHideDuration: 3000,
    });
  };

  const showError = (message: string) => {
    // Hata mesajlarını artık pop-up (Dialog) olarak göster
    // Eğer ErrorDialogProvider yoksa snackbar'a geri dön
    if (errorDialog) {
      errorDialog.showError(message, 'Hata');
    } else {
      enqueueSnackbar(message, {
        variant: 'error',
        autoHideDuration: 4000,
      });
    }
  };

  const showWarning = (message: string) => {
    enqueueSnackbar(message, {
      variant: 'warning',
      autoHideDuration: 3500,
    });
  };

  const showInfo = (message: string) => {
    enqueueSnackbar(message, {
      variant: 'info',
      autoHideDuration: 3000,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    // Alias methods for compatibility
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
  };
};
