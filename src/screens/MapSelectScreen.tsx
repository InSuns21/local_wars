import React, { useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import type { MapMeta } from '@/app/types';

type MapSelectScreenProps = {
  maps: MapMeta[];
  onConfirm: (mapId: string) => void;
  onBack: () => void;
};

export const MapSelectScreen: React.FC<MapSelectScreenProps> = ({ maps, onConfirm, onBack }) => {
  const [selectedMapId, setSelectedMapId] = useState<string>(maps[0]?.id ?? '');

  return (
    <Box component="main" sx={{ maxWidth: 900, mx: 'auto', mt: { xs: 2, md: 4 }, px: 2 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 2 }}>マップ選択</Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(180px, 1fr))', md: 'repeat(3, minmax(180px, 1fr))' }, gap: 1.5, mb: 2 }}>
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
                <Typography component="strong" sx={{ display: 'block' }}>{map.name}</Typography>
                <Typography variant="body2">{map.width}x{map.height}</Typography>
              </Button>
            );
          })}
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button type="button" variant="contained" onClick={() => onConfirm(selectedMapId)} disabled={!selectedMapId}>このマップで確定</Button>
          <Button type="button" variant="outlined" onClick={onBack}>戻る</Button>
        </Stack>
      </Paper>
    </Box>
  );
};
