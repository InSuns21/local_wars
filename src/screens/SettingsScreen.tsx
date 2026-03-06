import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  DEFAULT_SETTINGS,
  GAME_SETTINGS_PRESETS,
  type AiDifficulty,
  type GameSettings,
  type GameSettingsPreset,
  type HumanPlayerSide,
} from '@/app/types';

type SettingsScreenProps = {
  onConfirm: (settings: GameSettings) => void;
  onBack: () => void;
};

const PRESET_LABELS: Record<GameSettingsPreset, string> = {
  standard: '標準',
  beginner: '初心者向け',
  advanced: '上級者向け',
  custom: 'カスタム',
};

const PRESET_DESCRIPTIONS: Record<GameSettingsPreset, string> = {
  standard: '迷ったらこれ。標準ルールで遊べます。',
  beginner: '資金と回復量を増やし、補給管理を簡略化します。',
  advanced: '索敵あり・強いAIで、判断量が増える設定です。',
  custom: '個別変更中です。必要な項目だけ調整できます。',
};

const NUMERIC_FIELD_META: {
  [K in 'initialFunds' | 'incomePerProperty' | 'hpRecoveryCity' | 'hpRecoveryFactory' | 'hpRecoveryHq']: {
    min: number;
    max: number;
    step: number;
    recommendedRangeText: string;
    defaultValue: number;
    description: string;
  };
} = {
  initialFunds: {
    min: 0,
    max: 50000,
    step: 1000,
    recommendedRangeText: '推奨: 8000-15000',
    defaultValue: DEFAULT_SETTINGS.initialFunds,
    description: '開始時の所持金です。高いほど序盤から高コストユニットを出しやすくなります。',
  },
  incomePerProperty: {
    min: 0,
    max: 5000,
    step: 100,
    recommendedRangeText: '推奨: 800-1500',
    defaultValue: DEFAULT_SETTINGS.incomePerProperty,
    description: '毎ターン得られる資金です。高いほど大型ユニットを継続生産しやすくなります。',
  },
  hpRecoveryCity: {
    min: 0,
    max: 10,
    step: 1,
    recommendedRangeText: '推奨: 1-3',
    defaultValue: DEFAULT_SETTINGS.hpRecoveryCity,
    description: '前線の都市での継戦能力に影響します。',
  },
  hpRecoveryFactory: {
    min: 0,
    max: 10,
    step: 1,
    recommendedRangeText: '推奨: 1-4',
    defaultValue: DEFAULT_SETTINGS.hpRecoveryFactory,
    description: '生産拠点の立て直し速度に影響します。',
  },
  hpRecoveryHq: {
    min: 0,
    max: 10,
    step: 1,
    recommendedRangeText: '推奨: 2-5',
    defaultValue: DEFAULT_SETTINGS.hpRecoveryHq,
    description: '司令部の粘り強さに影響します。高すぎると決着が長引きます。',
  },
};

const matchesSettings = (left: GameSettings, right: GameSettings): boolean => (
  left.aiDifficulty === right.aiDifficulty
  && left.humanPlayerSide === right.humanPlayerSide
  && left.fogOfWar === right.fogOfWar
  && left.initialFunds === right.initialFunds
  && left.incomePerProperty === right.incomePerProperty
  && left.hpRecoveryCity === right.hpRecoveryCity
  && left.hpRecoveryFactory === right.hpRecoveryFactory
  && left.hpRecoveryHq === right.hpRecoveryHq
  && left.enableAirUnits === right.enableAirUnits
  && left.enableNavalUnits === right.enableNavalUnits
  && left.enableFuelSupply === right.enableFuelSupply
  && left.enableAmmoSupply === right.enableAmmoSupply
  && Boolean(left.showEnemyActionLogs) === Boolean(right.showEnemyActionLogs)
);

const detectPreset = (settings: GameSettings): GameSettingsPreset => {
  if (matchesSettings(settings, GAME_SETTINGS_PRESETS.standard)) {
    return 'standard';
  }
  if (matchesSettings(settings, GAME_SETTINGS_PRESETS.beginner)) {
    return 'beginner';
  }
  if (matchesSettings(settings, GAME_SETTINGS_PRESETS.advanced)) {
    return 'advanced';
  }
  return 'custom';
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onConfirm, onBack }) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [selectedPreset, setSelectedPreset] = useState<GameSettingsPreset>('standard');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  const isValid = useMemo(
    () => Object.entries(NUMERIC_FIELD_META).every(([key, meta]) => {
      const value = settings[key as keyof typeof NUMERIC_FIELD_META];
      return typeof value === 'number' && !Number.isNaN(value) && value >= meta.min && value <= meta.max;
    }),
    [settings],
  );

  const applyPreset = (preset: GameSettingsPreset): void => {
    const nextSettings = GAME_SETTINGS_PRESETS[preset === 'custom' ? 'standard' : preset];
    setSelectedPreset(preset === 'custom' ? 'standard' : preset);
    setSettings(nextSettings);
  };

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]): void => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      setSelectedPreset(detectPreset(next));
      return next;
    });
  };

  const getNumericFieldStatus = (
    key: keyof typeof NUMERIC_FIELD_META,
  ): { error: boolean; helperText: string } => {
    const meta = NUMERIC_FIELD_META[key];
    const value = settings[key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return {
        error: true,
        helperText: `${meta.description} 入力可能範囲は ${meta.min}-${meta.max} です。`,
      };
    }
    if (value < meta.min || value > meta.max) {
      return {
        error: true,
        helperText: `${meta.description} 許容範囲は ${meta.min}-${meta.max} です。${meta.recommendedRangeText}。`,
      };
    }
    return {
      error: false,
      helperText: `${meta.description} 標準値: ${meta.defaultValue} / ${meta.recommendedRangeText}`,
    };
  };

  return (
    <Box
      component="main"
      sx={{
        maxWidth: 760,
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
          設定画面
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexShrink: 0 }}>
          まずは基本設定だけで開始できます。必要なら詳細設定で細かく調整してください。
        </Typography>

        <Stack data-testid="settings-scroll-content" spacing={2} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, mb: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="h2" sx={{ fontSize: 22 }}>おすすめプリセット</Typography>
              <FormControl fullWidth>
                <InputLabel variant="standard" htmlFor="settings-preset">プリセット</InputLabel>
                <NativeSelect
                  inputProps={{ id: 'settings-preset' }}
                  value={selectedPreset}
                  onChange={(e) => applyPreset(e.target.value as GameSettingsPreset)}
                >
                  <option value="standard">標準</option>
                  <option value="beginner">初心者向け</option>
                  <option value="advanced">上級者向け</option>
                  <option value="custom" disabled>カスタム</option>
                </NativeSelect>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                {PRESET_DESCRIPTIONS[selectedPreset]}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button type="button" variant="outlined" onClick={() => applyPreset('standard')}>
                  標準にリセット
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  現在の状態: {PRESET_LABELS[selectedPreset]}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="h2" sx={{ fontSize: 22 }}>基本設定</Typography>

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
            </Stack>
          </Paper>

          <Accordion
            expanded={isAdvancedOpen}
            onChange={(_, expanded) => setIsAdvancedOpen(expanded)}
            disableGutters
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="advanced-settings-content" id="advanced-settings-header">
              <Box>
                <Typography variant="h2" sx={{ fontSize: 22 }}>詳細設定</Typography>
                <Typography variant="body2" color="text.secondary">
                  数値や補給ルールを調整したい場合だけ開いてください。
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails id="advanced-settings-content">
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                  <Alert severity="info" sx={{ flex: 1 }}>
                    数値は許容範囲を超えると開始できません。推奨レンジ内なら標準バランスを保ちやすくなります。
                  </Alert>
                  <Button type="button" variant="outlined" onClick={() => applyPreset('standard')}>
                    詳細設定を標準へ戻す
                  </Button>
                </Stack>

                <TextField
                  id="initial-funds"
                  label="初期資金"
                  type="number"
                  value={settings.initialFunds}
                  onChange={(e) => update('initialFunds', Number(e.target.value))}
                  error={getNumericFieldStatus('initialFunds').error}
                  helperText={getNumericFieldStatus('initialFunds').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.initialFunds.min,
                    max: NUMERIC_FIELD_META.initialFunds.max,
                    step: NUMERIC_FIELD_META.initialFunds.step,
                  }}
                />

                <TextField
                  id="income-per-property"
                  label="1ターン収入（都市/工場/司令部）"
                  type="number"
                  value={settings.incomePerProperty}
                  onChange={(e) => update('incomePerProperty', Number(e.target.value))}
                  error={getNumericFieldStatus('incomePerProperty').error}
                  helperText={getNumericFieldStatus('incomePerProperty').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.incomePerProperty.min,
                    max: NUMERIC_FIELD_META.incomePerProperty.max,
                    step: NUMERIC_FIELD_META.incomePerProperty.step,
                  }}
                />

                <TextField
                  id="hp-recovery-city"
                  label="都市のHP回復量（ターン開始時）"
                  type="number"
                  value={settings.hpRecoveryCity}
                  onChange={(e) => update('hpRecoveryCity', Number(e.target.value))}
                  error={getNumericFieldStatus('hpRecoveryCity').error}
                  helperText={getNumericFieldStatus('hpRecoveryCity').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.hpRecoveryCity.min,
                    max: NUMERIC_FIELD_META.hpRecoveryCity.max,
                    step: NUMERIC_FIELD_META.hpRecoveryCity.step,
                  }}
                />

                <TextField
                  id="hp-recovery-factory"
                  label="工場のHP回復量（ターン開始時）"
                  type="number"
                  value={settings.hpRecoveryFactory}
                  onChange={(e) => update('hpRecoveryFactory', Number(e.target.value))}
                  error={getNumericFieldStatus('hpRecoveryFactory').error}
                  helperText={getNumericFieldStatus('hpRecoveryFactory').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.hpRecoveryFactory.min,
                    max: NUMERIC_FIELD_META.hpRecoveryFactory.max,
                    step: NUMERIC_FIELD_META.hpRecoveryFactory.step,
                  }}
                />

                <TextField
                  id="hp-recovery-hq"
                  label="HQのHP回復量（ターン開始時）"
                  type="number"
                  value={settings.hpRecoveryHq}
                  onChange={(e) => update('hpRecoveryHq', Number(e.target.value))}
                  error={getNumericFieldStatus('hpRecoveryHq').error}
                  helperText={getNumericFieldStatus('hpRecoveryHq').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.hpRecoveryHq.min,
                    max: NUMERIC_FIELD_META.hpRecoveryHq.max,
                    step: NUMERIC_FIELD_META.hpRecoveryHq.step,
                  }}
                />

                <FormControlLabel
                  control={<Checkbox checked={Boolean(settings.showEnemyActionLogs)} onChange={(e) => update('showEnemyActionLogs', e.target.checked)} />}
                  label="経過ログに敵方の行動を表示"
                />
                <FormControlLabel
                  control={<Checkbox checked={settings.enableFuelSupply} onChange={(e) => update('enableFuelSupply', e.target.checked)} />}
                  label="燃料消費あり"
                />
                <FormControlLabel
                  control={<Checkbox checked={settings.enableAmmoSupply} onChange={(e) => update('enableAmmoSupply', e.target.checked)} />}
                  label="弾薬消費あり"
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>

        <Stack data-testid="settings-footer" direction="row" spacing={1.5} sx={{ flexShrink: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button type="button" variant="contained" onClick={() => onConfirm(settings)} disabled={!isValid}>この設定で開始</Button>
          <Button type="button" variant="outlined" onClick={onBack}>戻る</Button>
        </Stack>
      </Paper>
    </Box>
  );
};
