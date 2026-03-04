import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f5d57',
    },
    secondary: {
      main: '#c38c2f',
    },
    background: {
      default: '#eef2f6',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"BIZ UDPGothic", "BIZ UDPゴシック", "Yu Gothic UI", "Meiryo", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '0.04em',
    },
    h2: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
});
