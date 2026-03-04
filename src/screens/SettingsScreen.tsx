import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  NativeSelect,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DEFAULT_SETTINGS,
  type AiDifficulty,
  type GameSettings,
  type HumanPlayerSide,
} from '@/app/types';

type SettingsScreenProps = {
  onConfirm: (settings: GameSettings) => void;
  onBack: () => void;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onConfirm, onBack }) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  const isValid = useMemo(
    () =>
      settings.initialFunds >= 0 &&
      settings.incomePerProperty >= 0 &&
      settings.hpRecoveryCity >= 0 &&
      settings.hpRecoveryFactory >= 0 &&
      settings.hpRecoveryHq >= 0,
    [
      settings.initialFunds,
      settings.incomePerProperty,
      settings.hpRecoveryCity,
      settings.hpRecoveryFactory,
      settings.hpRecoveryHq,
    ],
  );

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Box component="main" sx={{ maxWidth: 760, mx: 'auto', mt: { xs: 2, md: 4 }, px: 2 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 2 }}>設定画面</Typography>

        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel variant="standard" htmlFor="ai-difficulty">AIの強さ</InputLabel>
            <NativeSelect
              inputProps={{ id: 'ai-difficulty' }}
              value={settings.aiDifficulty}
              onChange={(e) => update('aiDifficulty', e.target.value as AiDifficulty)}
            >
              <option value="easy">よわい</option>
              <option value="normal">ふつう</option>
              <option value="hard">つよい</option>
            </NativeSelect>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel variant="standard" htmlFor="human-player-side">人間が担当する陣営</InputLabel>
            <NativeSelect
              inputProps={{ id: 'human-player-side' }}
              value={settings.humanPlayerSide}
              onChange={(e) => update('humanPlayerSide', e.target.value as HumanPlayerSide)}
            >
              <option value="P1">P1（先攻）</option>
              <option value="P2">P2（後攻）</option>
            </NativeSelect>
          </FormControl>

          <FormControlLabel
            control={<Checkbox checked={settings.fogOfWar} onChange={(e) => update('fogOfWar', e.target.checked)} />}
            label="索敵あり"
          />

          <Typography variant="h2" sx={{ fontSize: 22, mt: 1 }}>詳細設定</Typography>

          <TextField
            id="initial-funds"
            label="初期資金"
            type="number"
            value={settings.initialFunds}
            onChange={(e) => update('initialFunds', Number(e.target.value))}
          />

          <TextField
            id="income-per-property"
            label="1ターン収入（工場/司令部）"
            type="number"
            value={settings.incomePerProperty}
            onChange={(e) => update('incomePerProperty', Number(e.target.value))}
          />

          <TextField
            id="hp-recovery-city"
            label="都市のHP回復量（ターン開始時）"
            type="number"
            value={settings.hpRecoveryCity}
            onChange={(e) => update('hpRecoveryCity', Number(e.target.value))}
          />

          <TextField
            id="hp-recovery-factory"
            label="工場のHP回復量（ターン開始時）"
            type="number"
            value={settings.hpRecoveryFactory}
            onChange={(e) => update('hpRecoveryFactory', Number(e.target.value))}
          />

          <TextField
            id="hp-recovery-hq"
            label="HQのHP回復量（ターン開始時）"
            type="number"
            value={settings.hpRecoveryHq}
            onChange={(e) => update('hpRecoveryHq', Number(e.target.value))}
          />

          <FormControlLabel
            control={<Checkbox checked={Boolean(settings.showEnemyActionLogs)} onChange={(e) => update('showEnemyActionLogs', e.target.checked)} />}
            label="経過ログに敵方の行動を表示"
          />          <FormControlLabel
            control={<Checkbox checked={settings.enableAirUnits} onChange={(e) => update('enableAirUnits', e.target.checked)} />}
            label="航空ユニットあり"
          />
          <FormControlLabel
            control={<Checkbox checked={settings.enableNavalUnits} onChange={(e) => update('enableNavalUnits', e.target.checked)} />}
            label="海ユニットあり"
          />
          <FormControlLabel
            control={<Checkbox checked={settings.enableFuelSupply} onChange={(e) => update('enableFuelSupply', e.target.checked)} />}
            label="燃料補給あり"
          />
          <FormControlLabel
            control={<Checkbox checked={settings.enableAmmoSupply} onChange={(e) => update('enableAmmoSupply', e.target.checked)} />}
            label="弾薬補給あり"
          />

          <Stack direction="row" spacing={1.5}>
            <Button type="button" variant="contained" onClick={() => onConfirm(settings)} disabled={!isValid}>この設定で開始</Button>
            <Button type="button" variant="outlined" onClick={onBack}>戻る</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

