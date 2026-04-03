'use client';

import { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { DarkModeProvider } from '@/contexts/DarkModeContext';

const theme = createTheme();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <DarkModeProvider>
          {children}
        </DarkModeProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
