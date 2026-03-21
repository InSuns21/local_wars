import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Paper,
  Radio,
  Stack,
  Typography,
} from '@mui/material';
import { MAP_CATALOG } from '@/data/maps';
import type { GameSettings } from '@/app/types';
import type { SaveSlotsRecord } from '@/services/saveSlots';

type SaveSelectScreenProps = {
  slots: SaveSlotsRecord;
  selectedSlotId: 1 | 2 | 3;
  feedbackMessage?: string;
  onSelectSlot: (slotId: 1 | 2 | 3) => void;
  onConfirmLoad: () => void;
  onDelete: (slotId: 1 | 2 | 3) => void;
  onBack: () => void;
};

type SaveSlotUiStatus = 'ready' | 'empty' | 'selected';

const getMapLabel = (mapId: string): string => MAP_CATALOG.find((map) => map.id === mapId)?.name ?? mapId;

const summarizeSettings = (settings: GameSettings): string => {
  const parts = [
    `AI:${settings.aiDifficulty === 'easy' ? 'よわい' : settings.aiDifficulty === 'nightmare' ? 'めちゃつよ' : settings.aiDifficulty === 'hard' ? 'つよい' : 'ふつう'}`,
    `傾向:${
      settings.selectedAiProfile === 'adaptive'
        ? '可変'
        : settings.selectedAiProfile === 'captain'
          ? '占領'
          : settings.selectedAiProfile === 'hunter'
            ? '撃破'
            : settings.selectedAiProfile === 'turtle'
              ? '防衛'
              : settings.selectedAiProfile === 'sieger'
                ? '砲兵'
                : settings.selectedAiProfile === 'drone_swarm'
                  ? 'ドローン'
                  : settings.selectedAiProfile === 'stealth_strike'
                    ? '隠密'
                    : 'おまかせ'
    }`,
    `担当:${settings.humanPlayerSide}`,
    settings.fogOfWar ? '索敵あり' : '索敵なし',
  ];
  if (!settings.enableFuelSupply || !settings.enableAmmoSupply) {
    parts.push('補給簡略化');
  }
  return parts.join(' / ');
};

const getSlotStatus = (slotExists: boolean, isSelected: boolean): SaveSlotUiStatus => {
  if (!slotExists) {
    return 'empty';
  }
  if (isSelected) {
    return 'selected';
  }
  return 'ready';
};

const SLOT_STATUS_LABEL: Record<SaveSlotUiStatus, string> = {
  ready: 'ロード可能',
  empty: '未保存',
  selected: '選択中',
};

export const SaveSelectScreen: React.FC<SaveSelectScreenProps> = ({
  slots,
  selectedSlotId,
  feedbackMessage,
  onSelectSlot,
  onConfirmLoad,
  onDelete,
  onBack,
}) => {
  const selectedSlot = slots[String(selectedSlotId) as keyof SaveSlotsRecord];
  const canLoadSelectedSlot = Boolean(selectedSlot);

  return (
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
        <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 1, flexShrink: 0 }}>
          セーブ選択
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexShrink: 0 }}>
          保存済みスロットを選ぶと、そのままロードできます。空スロットは開始できません。
        </Typography>

        <Stack data-testid="save-select-scroll-content" spacing={1.5} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, mb: 2 }}>
          {[1, 2, 3].map((n) => {
            const slotId = n as 1 | 2 | 3;
            const slot = slots[String(slotId) as keyof SaveSlotsRecord];
            const isSelected = selectedSlotId === slotId;
            const status = getSlotStatus(Boolean(slot), isSelected);
            const feedbackForCard = isSelected ? feedbackMessage : undefined;

            return (
              <Card
                key={slotId}
                variant="outlined"
                sx={{
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  boxShadow: isSelected ? 2 : 0,
                }}
              >
                <CardContent>
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <FormControlLabel
                        control={
                          <Radio
                            name="save-slot"
                            checked={isSelected}
                            onChange={() => onSelectSlot(slotId)}
                          />
                        }
                        label={`スロット${slotId}`}
                        sx={{ mr: 0 }}
                      />
                      <Chip
                        label={SLOT_STATUS_LABEL[status]}
                        color={status === 'empty' ? 'default' : 'primary'}
                        variant={status === 'selected' ? 'filled' : 'outlined'}
                        size="small"
                      />
                    </Stack>

                    {slot ? (
                      <>
                        <Typography variant="body2">マップ: {getMapLabel(slot.mapId)}</Typography>
                        <Typography variant="body2">保存日時: {new Date(slot.updatedAt).toLocaleString()}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          設定: {summarizeSettings(slot.settings)}
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                          <Typography variant="caption" color="success.main">
                            このスロットはロードできます。
                          </Typography>
                          <Button type="button" variant="outlined" color="error" onClick={() => onDelete(slotId)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                            削除
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2">未保存</Typography>
                        <Typography variant="body2" color="text.secondary">
                          このスロットにはセーブデータがありません。別のスロットを選んでください。
                        </Typography>
                        {isSelected && (
                          <Typography variant="caption" color="warning.main">
                            ロード不可: セーブデータを選択してください。
                          </Typography>
                        )}
                      </>
                    )}

                    {feedbackForCard && (
                      <Alert severity="warning" sx={{ mt: 0.5 }}>
                        {feedbackForCard}
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        <Stack data-testid="save-select-footer" direction="row" spacing={1.5} sx={{ flexShrink: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button type="button" variant="contained" onClick={onConfirmLoad} disabled={!canLoadSelectedSlot}>
            {canLoadSelectedSlot ? 'このスロットで開始' : 'ロード不可'}
          </Button>
          <Button type="button" variant="outlined" onClick={onBack}>戻る</Button>
        </Stack>
      </Paper>
    </Box>
  );
};
