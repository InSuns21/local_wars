import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';

type CreditsScreenProps = {
  onBack: () => void;
};

export const CreditsScreen: React.FC<CreditsScreenProps> = ({ onBack }) => (
  <Box component="main" sx={{ maxWidth: 680, mx: 'auto', mt: { xs: 2, md: 5 }, px: 2 }}>
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 1 }}>クレジット</Typography>
      <Typography sx={{ mb: 2 }}>（準備中）</Typography>
      <Button type="button" variant="outlined" onClick={onBack}>タイトルへ戻る</Button>
    </Paper>
  </Box>
);
