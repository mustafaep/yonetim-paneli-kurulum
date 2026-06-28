import React from 'react';
import { SnackbarProvider } from 'notistack';
import { ErrorDialogProvider } from './app/providers/ErrorDialogContext';
import { NotificationProvider } from './features/notifications/context/NotificationContext';
import { AppRoutes } from './app/router';
import ErrorBoundary from './shared/components/common/ErrorBoundary';

const App: React.FC = () => (
  <ErrorBoundary>
    <ErrorDialogProvider>
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      autoHideDuration={4000}
      disableScrollLock
    >
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </SnackbarProvider>
  </ErrorDialogProvider>
  </ErrorBoundary>
);

export default App;
