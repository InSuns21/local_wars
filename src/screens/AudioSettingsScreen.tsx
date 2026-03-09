import React from 'react';
import { Box, Button, Paper, Slider, Stack, Typography } from '@mui/material';

type AudioSettingsScreenProps = {
  bgmVolume: number;
  seVolume: number;
  onChangeBgmVolume: (volume: number) => void;
  onChangeSeVolume: (volume: number) => void;
  onBack: () => void;
};

export const AudioSettingsScreen: React.FC<AudioSettingsScreenProps> = ({
  bgmVolume,
  seVolume,
  onChangeBgmVolume,
  onChangeSeVolume,
  onBack,
}) => (
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
      <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 1, flexShrink: 0 }}>音量設定</Typography>
      <Typography sx={{ mb: 2, flexShrink: 0 }}>BGM と SE の音量を個別に調整します（0: ミュート / 100: 最大）。</Typography>

      <Stack data-testid="audio-settings-scroll-content" spacing={2} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, mb: 2 }}>
        <Typography fontWeight={700}>BGM音量: {bgmVolume}%</Typography>
        <Slider
          aria-label="BGM音量"
          min={0}
          max={100}
          step={1}
          value={bgmVolume}
          valueLabelDisplay="auto"
          onChange={(_, value) => onChangeBgmVolume(Array.isArray(value) ? value[0] : value)}
        />
        <Typography fontWeight={700}>SE音量: {seVolume}%</Typography>
        <Slider
          aria-label="SE音量"
          min={0}
          max={100}
          step={1}
          value={seVolume}
          valueLabelDisplay="auto"
          onChange={(_, value) => onChangeSeVolume(Array.isArray(value) ? value[0] : value)}
        />
      </Stack>

      <Box data-testid="audio-settings-footer" sx={{ flexShrink: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button type="button" variant="contained" onClick={onBack}>タイトルへ戻る</Button>
      </Box>
    </Paper>
  </Box>
);
