import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';

type CreditsScreenProps = {
  onBack: () => void;
};

export const CreditsScreen: React.FC<CreditsScreenProps> = ({ onBack }) => (
  <Box
    component="main"
    sx={{
      maxWidth: 680,
      mx: 'auto',
      px: 2,
      py: 2,
      height: '100vh',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}
  >
    <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 1, flexShrink: 0 }}>クレジット</Typography>
      <Box data-testid="credits-scroll-content" sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, mb: 2 }}>
        <Typography>（準備中）</Typography>
      </Box>
      <Box data-testid="credits-footer" sx={{ flexShrink: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button type="button" variant="outlined" onClick={onBack}>タイトルへ戻る</Button>
      </Box>
    </Paper>
  </Box>
);
