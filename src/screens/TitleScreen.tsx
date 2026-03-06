import React from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';

type LatestSaveSummary = {
  slotId: 1 | 2 | 3;
  mapName: string;
  updatedAt: string;
  turn: number;
};

type TitleScreenProps = {
  latestSaveSummary?: LatestSaveSummary | null;
  hasAnySaveData?: boolean;
  onStart: () => void;
  onContinue: () => void;
  onCredits: () => void;
  onTutorial: () => void;
  onOpenAudioSettings: () => void;
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  latestSaveSummary = null,
  hasAnySaveData = false,
  onStart,
  onContinue,
  onCredits,
  onTutorial,
  onOpenAudioSettings,
}) => (
  <Box component="main" sx={{ maxWidth: 920, mx: 'auto', mt: { xs: 3, md: 5 }, px: 2, pb: 3 }}>
    <Paper
      elevation={4}
      sx={{
        p: { xs: 3, md: 4 },
        borderTop: '6px solid',
        borderColor: 'primary.main',
        background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)',
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Chip label={hasAnySaveData ? '推奨: つづきから' : '推奨: はじめから'} color="primary" size="small" sx={{ mb: 1.5 }} />
          <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 46 }, mb: 1 }}>
            LOCAL WARS
          </Typography>
          <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 700, mb: 1 }}>
            地形と拠点を取り合う、ローカル完結のターン制戦略ゲーム
          </Typography>
          <Typography color="text.secondary">
            ユニットを動かし、工場で増援を生産し、敵司令部の占領か戦力撃破で勝利します。
            最初は標準マップで基本操作を覚え、その後に地形差の大きいマップへ進む想定です。
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.72)' }}>
            <Typography variant="h2" sx={{ fontSize: 24, mb: 1.5 }}>最初の導線</Typography>
            <Stack spacing={1.5}>
              <Button
                type="button"
                variant={hasAnySaveData ? 'outlined' : 'contained'}
                size="large"
                onClick={onStart}
              >
                はじめから
              </Button>
              <Typography variant="body2" color="text.secondary">
                標準設定で新しい対局を始めます。初回プレイはこちらから入るのが最短です。
              </Typography>
              <Button
                type="button"
                variant={hasAnySaveData ? 'contained' : 'outlined'}
                size="large"
                color="secondary"
                onClick={onContinue}
                disabled={!hasAnySaveData}
              >
                つづきから
              </Button>
              <Typography variant="body2" color="text.secondary">
                直近の保存状態から再開します。保存がない場合は利用できません。
              </Typography>
              <Button type="button" variant="text" size="large" onClick={onTutorial}>
                3分で分かる基本操作を見る
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.72)' }}>
            <Typography variant="h2" sx={{ fontSize: 24, mb: 1.5 }}>現在の状態</Typography>
            {latestSaveSummary ? (
              <Stack spacing={1} aria-label="最新セーブ概要">
                <Typography sx={{ fontWeight: 700 }}>最新の続き: スロット{latestSaveSummary.slotId}</Typography>
                <Typography variant="body2">マップ: {latestSaveSummary.mapName}</Typography>
                <Typography variant="body2">ターン: {latestSaveSummary.turn}</Typography>
                <Typography variant="body2">
                  更新日時: {new Date(latestSaveSummary.updatedAt).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  保存済みなので、次は `つづきから` でそのまま再開できます。
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1}>
                <Typography sx={{ fontWeight: 700 }}>保存データはまだありません</Typography>
                <Typography variant="body2" color="text.secondary">
                  まずは `はじめから` で標準マップを試すのがおすすめです。
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  不安なら `3分で分かる基本操作を見る` から先に確認できます。
                </Typography>
              </Stack>
            )}
          </Paper>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button type="button" variant="outlined" size="large" onClick={onCredits}>クレジット</Button>
          <Button type="button" variant="outlined" size="large" onClick={onOpenAudioSettings}>音量設定</Button>
        </Stack>
      </Stack>
    </Paper>
  </Box>
);
