// src/app/theme/muiTheme.ts
import { createTheme } from '@mui/material/styles';
import { trTR } from '@mui/x-data-grid/locales';

const muiTheme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#1976d2', // ileride sendika kurumsal renge göre güncelleriz
      },
      secondary: {
        main: '#9c27b0',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      // scrollTop null hatasını önlemek için (MUI Transition + React 19 uyumluluk)
      MuiModal: {
        defaultProps: {
          disableScrollLock: true,
        },
      },
    },
  },
  trTR,
);

export default muiTheme;
