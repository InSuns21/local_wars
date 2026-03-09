import React from 'react';
import { Box, Button, Link, Paper, Typography } from '@mui/material';

type CreditsScreenProps = {
  onBack: () => void;
};

type BgmCredit = {
  screen: string;
  title: string;
  sourceUrl: string;
};

const BGM_CREDITS: BgmCredit[] = [
  {
    screen: 'タイトル画面',
    title: 'Call to Adventure',
    sourceUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Call%20to%20Adventure.mp3',
  },
  {
    screen: 'マップ選択画面',
    title: 'Local Forecast',
    sourceUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Local%20Forecast.mp3',
  },
  {
    screen: '設定画面 / 音量設定画面',
    title: 'Carefree',
    sourceUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3',
  },
  {
    screen: 'セーブ選択画面',
    title: 'Monkeys Spinning Monkeys',
    sourceUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3',
  },
  {
    screen: 'クレジット画面',
    title: 'Sneaky Snitch',
    sourceUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sneaky%20Snitch.mp3',
  },
  {
    screen: 'チュートリアル画面',
    title: 'Investigations',
    sourceUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Investigations.mp3',
  },
  {
    screen: '対局画面',
    title: 'Hidden Agenda',
    sourceUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hidden%20Agenda.mp3',
  },
  {
    screen: '勝敗確定モーダル',
    title: 'Marty Gots a Plan',
    sourceUrl: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Marty%20Gots%20a%20Plan.mp3',
  },
];

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
        <Typography sx={{ mb: 1 }}>
          BGM素材は incompetech（Kevin MacLeod）を使用しています。
        </Typography>
        <Typography sx={{ mb: 2 }}>
          ライセンス: CC BY 4.0
          {' '}
          <Link href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
            https://creativecommons.org/licenses/by/4.0/
          </Link>
        </Typography>

        <Typography sx={{ mb: 1 }}>
          効果音素材は Kenney の Interface Sounds を使用しています。
        </Typography>
        <Typography sx={{ mb: 2 }}>
          ライセンス: CC0 1.0
          {' '}
          <Link href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">
            https://creativecommons.org/publicdomain/zero/1.0/
          </Link>
        </Typography>
        <Typography sx={{ mb: 2 }}>
          配布元:
          {' '}
          <Link href="https://kenney.nl/assets/interface-sounds" target="_blank" rel="noopener noreferrer">
            https://kenney.nl/assets/interface-sounds
          </Link>
        </Typography>

        {BGM_CREDITS.map((credit) => (
          <Box key={credit.screen} sx={{ mb: 1.5 }}>
            <Typography fontWeight={700}>{credit.screen}</Typography>
            <Typography>{credit.title} / Kevin MacLeod (incompetech.com)</Typography>
            <Link href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
              {credit.sourceUrl}
            </Link>
          </Box>
        ))}
      </Box>
      <Box data-testid="credits-footer" sx={{ flexShrink: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button type="button" variant="outlined" onClick={onBack}>タイトルへ戻る</Button>
      </Box>
    </Paper>
  </Box>
);
