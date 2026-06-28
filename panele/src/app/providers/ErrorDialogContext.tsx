// src/app/providers/ErrorDialogContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ErrorDialog from '../../shared/components/common/ErrorDialog';

interface ErrorDialogContextValue {
  showError: (message: string, title?: string) => void;
}

const ErrorDialogContext = createContext<ErrorDialogContextValue | undefined>(undefined);

export const useErrorDialog = (): ErrorDialogContextValue | undefined => {
  return useContext(ErrorDialogContext);
};

interface ErrorDialogProviderProps {
  children: ReactNode;
}

export const ErrorDialogProvider: React.FC<ErrorDialogProviderProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState<string | undefined>(undefined);

  const showError = useCallback((errorMessage: string, errorTitle?: string) => {
    setMessage(errorMessage);
    setTitle(errorTitle);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Clear message after animation completes
    setTimeout(() => {
      setMessage('');
      setTitle(undefined);
    }, 300);
  }, []);

  return (
    <ErrorDialogContext.Provider value={{ showError }}>
      {children}
      <ErrorDialog
        open={open}
        onClose={handleClose}
        message={message}
        title={title}
      />
    </ErrorDialogContext.Provider>
  );
};
