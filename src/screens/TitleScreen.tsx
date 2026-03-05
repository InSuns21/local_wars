import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

type TitleScreenProps = {
  onStart: () => void;
  onContinue: () => void;
  onCredits: () => void;
  onTutorial: () => void;
  onOpenAudioSettings: () => void;
};

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onContinue, onCredits, onTutorial, onOpenAudioSettings }) => (
  <Box component="main" sx={{ maxWidth: 560, mx: 'auto', mt: { xs: 3, md: 7 }, px: 2 }}>
    <Paper elevation={4} sx={{ p: 4, borderTop: '6px solid', borderColor: 'primary.main' }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 46 }, mb: 1 }}>
        LOCAL WARS
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        タイトル画面
      </Typography>

      <Stack spacing={1.5}>
        <Button type="button" variant="contained" size="large" onClick={onStart}>はじめから</Button>
        <Button type="button" variant="contained" size="large" color="secondary" onClick={onContinue}>つづきから</Button>
        <Button type="button" variant="outlined" size="large" onClick={onCredits}>クレジット</Button>
        <Button type="button" variant="outlined" size="large" onClick={onTutorial}>チュートリアル</Button>
        <Button type="button" variant="outlined" size="large" onClick={onOpenAudioSettings}>音量設定</Button>
      </Stack>
    </Paper>
  </Box>
);
