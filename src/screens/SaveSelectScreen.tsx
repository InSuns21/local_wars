import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Paper,
  Radio,
  Stack,
  Typography,
} from '@mui/material';
import type { SaveSlotsRecord } from '@/services/saveSlots';

type SaveSelectScreenProps = {
  slots: SaveSlotsRecord;
  selectedSlotId: 1 | 2 | 3;
  onSelectSlot: (slotId: 1 | 2 | 3) => void;
  onConfirmLoad: () => void;
  onDelete: (slotId: 1 | 2 | 3) => void;
  onBack: () => void;
};

export const SaveSelectScreen: React.FC<SaveSelectScreenProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  onConfirmLoad,
  onDelete,
  onBack,
}) => (
  <Box
    component="main"
    sx={{
      maxWidth: 780,
      mx: 'auto',
      px: 2,
      py: 2,
      height: '100vh',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}
  >
    <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 2, flexShrink: 0 }}>セーブ選択</Typography>

      <Stack data-testid="save-select-scroll-content" spacing={1.5} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, mb: 2 }}>
        {[1, 2, 3].map((n) => {
          const slotId = n as 1 | 2 | 3;
          const slot = slots[String(slotId) as keyof SaveSlotsRecord];
          return (
            <Card key={slotId} variant="outlined">
              <CardContent>
                <FormControlLabel
                  control={
                    <Radio
                      name="save-slot"
                      checked={selectedSlotId === slotId}
                      onChange={() => onSelectSlot(slotId)}
                    />
                  }
                  label={`スロット${slotId}`}
                />

                {slot ? (
                  <>
                    <Typography variant="body2">マップ: {slot.mapId}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      保存日時: {new Date(slot.updatedAt).toLocaleString()}
                    </Typography>
                    <Button type="button" variant="outlined" color="error" onClick={() => onDelete(slotId)}>
                      削除
                    </Button>
                  </>
                ) : (
                  <Typography variant="body2">未保存</Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Stack data-testid="save-select-footer" direction="row" spacing={1.5} sx={{ flexShrink: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button type="button" variant="contained" onClick={onConfirmLoad}>このスロットで開始</Button>
        <Button type="button" variant="outlined" onClick={onBack}>戻る</Button>
      </Stack>
    </Paper>
  </Box>
);
