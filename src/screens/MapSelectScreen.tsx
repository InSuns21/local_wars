import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import type { MapDifficulty, MapMeta } from '@/app/types';

type MapSelectScreenProps = {
  maps: MapMeta[];
  onConfirm: (mapId: string) => void;
  onBack: () => void;
};

const DIFFICULTY_LABELS: Record<MapDifficulty, string> = {
  beginner: '初心者向け',
  standard: '標準',
  challenging: '歯ごたえあり',
};

const DIFFICULTY_COLORS: Record<MapDifficulty, 'success' | 'primary' | 'warning'> = {
  beginner: 'success',
  standard: 'primary',
  challenging: 'warning',
};

export const MapSelectScreen: React.FC<MapSelectScreenProps> = ({ maps, onConfirm, onBack }) => {
  const [selectedMapId, setSelectedMapId] = useState<string>(maps[0]?.id ?? '');

  const selectedMap = useMemo(
    () => maps.find((map) => map.id === selectedMapId) ?? maps[0] ?? null,
    [maps, selectedMapId],
  );

  return (
    <Box
      component="main"
      sx={{
        maxWidth: 1040,
        mx: 'auto',
        px: 2,
        py: 2,
        height: '100vh',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 1, flexShrink: 0 }}>マップ選択</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexShrink: 0 }}>
          難易度、特徴、推定プレイ時間を見比べて選べます。迷ったら `おすすめ` の付いたマップから始めてください。
        </Typography>

        <Box
          data-testid="map-select-scroll-content"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            pr: 0.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(180px, 1fr))' },
              gap: 1.5,
              alignContent: 'start',
            }}
          >
            {maps.map((map) => {
              const selected = selectedMapId === map.id;
              return (
                <Button
                  key={map.id}
                  type="button"
                  onClick={() => setSelectedMapId(map.id)}
                  aria-pressed={selected}
                  variant={selected ? 'contained' : 'outlined'}
                  sx={{ display: 'block', textAlign: 'left', p: 1.5 }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography component="strong" sx={{ display: 'block' }}>{map.name}</Typography>
                      {map.recommendedForFirstPlay ? <Chip label="おすすめ" color="success" size="small" /> : null}
                    </Stack>
                    <Typography variant="body2">{map.width}x{map.height}</Typography>
                    <Typography variant="body2">難易度: {DIFFICULTY_LABELS[map.difficulty]}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.92 }}>{map.summary}</Typography>
                  </Stack>
                </Button>
              );
            })}
          </Box>

          {selectedMap && (
            <Paper variant="outlined" sx={{ p: 2 }} aria-label="選択中マップ詳細">
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="h2" sx={{ fontSize: 24 }}>{selectedMap.name}</Typography>
                  <Chip label={DIFFICULTY_LABELS[selectedMap.difficulty]} color={DIFFICULTY_COLORS[selectedMap.difficulty]} size="small" />
                </Stack>

                <Typography color="text.secondary">{selectedMap.summary}</Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedMap.recommendedForFirstPlay ? <Chip label="初回プレイにおすすめ" color="success" size="small" /> : null}
                  {selectedMap.featureTags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Stack>

                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">難易度</Typography>
                  <Typography>{DIFFICULTY_LABELS[selectedMap.difficulty]}</Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">推定プレイ時間</Typography>
                  <Typography>{selectedMap.estimatedMinutes} 分前後</Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">勝利条件の傾向</Typography>
                  <Typography>{selectedMap.victoryHint}</Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">おすすめ対象</Typography>
                  <Typography>{selectedMap.recommendedFor ?? '標準的な対局を遊びたい人'}</Typography>
                </Paper>

                <Typography variant="body2" color="text.secondary">
                  決定内容: {selectedMap.name} / {selectedMap.width}x{selectedMap.height} / {selectedMap.estimatedMinutes}分前後
                </Typography>
              </Stack>
            </Paper>
          )}
        </Box>

        <Stack data-testid="map-select-footer" direction="row" spacing={1.5} sx={{ flexShrink: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button type="button" variant="contained" onClick={() => onConfirm(selectedMapId)} disabled={!selectedMapId}>このマップで確定</Button>
          <Button type="button" variant="outlined" onClick={onBack}>戻る</Button>
        </Stack>
      </Paper>
    </Box>
  );
};
