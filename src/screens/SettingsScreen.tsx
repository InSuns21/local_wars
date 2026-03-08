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
  drone: 'ドローン戦',
  custom: 'カスタム',
};

const PRESET_DESCRIPTIONS: Record<GameSettingsPreset, string> = {
  standard: '迷ったらこれ。標準ルールで遊べます。',
  beginner: '資金と回復量を増やし、補給管理を簡略化します。',
  advanced: '索敵あり・強いAIで、判断量が増える設定です。',
  drone: '自爆ドローンと迎撃防空を有効にした専用ルールです。',
  custom: '個別変更中です。必要な項目だけ調整できます。',
};

const NUMERIC_FIELD_META: {
  [K in 'initialFunds' | 'incomePerProperty' | 'incomeAirport' | 'incomePort' | 'hpRecoveryCity' | 'hpRecoveryFactory' | 'hpRecoveryHq' | 'maxSupplyCharges' | 'facilityCaptureCostIncreasePercent' | 'maxFactoryDronesPerFactory' | 'droneInterceptionChancePercent' | 'droneInterceptionMaxPerTurn' | 'droneAiProductionRatioLimitPercent']: {
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
  incomeAirport: {
    min: 0,
    max: 5000,
    step: 100,
    recommendedRangeText: '推奨: 800-1500',
    defaultValue: DEFAULT_SETTINGS.incomeAirport,
    description: '空港の毎ターン収入です。航空戦力を継続投入しやすくなります。',
  },
  incomePort: {
    min: 0,
    max: 5000,
    step: 100,
    recommendedRangeText: '推奨: 800-1500',
    defaultValue: DEFAULT_SETTINGS.incomePort,
    description: '港湾の毎ターン収入です。海上戦力を維持しやすくなります。',
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
  maxSupplyCharges: {
    min: 0,
    max: 10,
    step: 1,
    recommendedRangeText: '推奨: 2-6',
    defaultValue: DEFAULT_SETTINGS.maxSupplyCharges,
    description: '補給ユニットが出撃中に実行できる補給回数です。低いほど帰投判断が重要になります。',
  },
  facilityCaptureCostIncreasePercent: {
    min: 0,
    max: 300,
    step: 5,
    recommendedRangeText: '推奨: 25-75',
    defaultValue: DEFAULT_SETTINGS.facilityCaptureCostIncreasePercent ?? 50,
    description: '施設破壊後の再占領コスト増加率です。高いほど破壊済み拠点の奪還が重くなります。',
  },
  maxFactoryDronesPerFactory: {
    min: 1,
    max: 5,
    step: 1,
    recommendedRangeText: '推奨: 3-5',
    defaultValue: DEFAULT_SETTINGS.maxFactoryDronesPerFactory,
    description: '1つの工場から同時に維持できる自爆ドローン数です。低いほど量産を抑えます。',
  },
  droneInterceptionChancePercent: {
    min: 0,
    max: 100,
    step: 5,
    recommendedRangeText: '推奨: 60-80',
    defaultValue: DEFAULT_SETTINGS.droneInterceptionChancePercent,
    description: '対ドローン防空車の迎撃成功率です。高いほどドローン侵入を止めやすくなります。',
  },
  droneInterceptionMaxPerTurn: {
    min: 0,
    max: 6,
    step: 1,
    recommendedRangeText: '推奨: 1-3',
    defaultValue: DEFAULT_SETTINGS.droneInterceptionMaxPerTurn,
    description: '対ドローン防空車が1ターンに迎撃できる回数です。',
  },
  droneAiProductionRatioLimitPercent: {
    min: 0,
    max: 100,
    step: 5,
    recommendedRangeText: '推奨: 25-60',
    defaultValue: DEFAULT_SETTINGS.droneAiProductionRatioLimitPercent,
    description: 'AIがドローンを混ぜる比率の上限です。高いほどドローン偏重になります。',
  },
};

const matchesSettings = (left: GameSettings, right: GameSettings): boolean => (
  left.aiDifficulty === right.aiDifficulty
  && left.humanPlayerSide === right.humanPlayerSide
  && left.fogOfWar === right.fogOfWar
  && left.initialFunds === right.initialFunds
  && left.incomePerProperty === right.incomePerProperty
  && left.incomeAirport === right.incomeAirport
  && left.incomePort === right.incomePort
  && left.hpRecoveryCity === right.hpRecoveryCity
  && left.hpRecoveryFactory === right.hpRecoveryFactory
  && left.hpRecoveryHq === right.hpRecoveryHq
  && left.maxSupplyCharges === right.maxSupplyCharges
  && left.enableAirUnits === right.enableAirUnits
  && left.enableNavalUnits === right.enableNavalUnits
  && left.enableFuelSupply === right.enableFuelSupply
  && left.enableAmmoSupply === right.enableAmmoSupply
  && (left.facilityCaptureCostIncreasePercent ?? 50) === (right.facilityCaptureCostIncreasePercent ?? 50)
  && Boolean(left.showEnemyActionLogs) === Boolean(right.showEnemyActionLogs)
  && left.enableSuicideDrones === right.enableSuicideDrones
  && left.maxFactoryDronesPerFactory === right.maxFactoryDronesPerFactory
  && left.droneInterceptionChancePercent === right.droneInterceptionChancePercent
  && left.droneInterceptionMaxPerTurn === right.droneInterceptionMaxPerTurn
  && left.droneAiProductionRatioLimitPercent === right.droneAiProductionRatioLimitPercent
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
  if (matchesSettings(settings, GAME_SETTINGS_PRESETS.drone)) {
    return 'drone';
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

  const showDroneSettings = settings.enableSuicideDrones;

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
                  <option value="drone">ドローン戦</option>
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
              <FormControlLabel
                control={<Checkbox checked={settings.enableSuicideDrones} onChange={(e) => update('enableSuicideDrones', e.target.checked)} />}
                label="自爆ドローン有効"
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
                  id="income-airport"
                  label="1ターン収入（空港）"
                  type="number"
                  value={settings.incomeAirport}
                  onChange={(e) => update('incomeAirport', Number(e.target.value))}
                  error={getNumericFieldStatus('incomeAirport').error}
                  helperText={getNumericFieldStatus('incomeAirport').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.incomeAirport.min,
                    max: NUMERIC_FIELD_META.incomeAirport.max,
                    step: NUMERIC_FIELD_META.incomeAirport.step,
                  }}
                />

                <TextField
                  id="income-port"
                  label="1ターン収入（港湾）"
                  type="number"
                  value={settings.incomePort}
                  onChange={(e) => update('incomePort', Number(e.target.value))}
                  error={getNumericFieldStatus('incomePort').error}
                  helperText={getNumericFieldStatus('incomePort').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.incomePort.min,
                    max: NUMERIC_FIELD_META.incomePort.max,
                    step: NUMERIC_FIELD_META.incomePort.step,
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

                <TextField
                  id="max-supply-charges"
                  label="補給ユニットの最大補給回数"
                  type="number"
                  value={settings.maxSupplyCharges}
                  onChange={(e) => update('maxSupplyCharges', Number(e.target.value))}
                  error={getNumericFieldStatus('maxSupplyCharges').error}
                  helperText={getNumericFieldStatus('maxSupplyCharges').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.maxSupplyCharges.min,
                    max: NUMERIC_FIELD_META.maxSupplyCharges.max,
                    step: NUMERIC_FIELD_META.maxSupplyCharges.step,
                  }}
                />

                <TextField
                  id="facility-capture-cost-increase-percent"
                  label="施設破壊ごとの再占領コスト増加率（%）"
                  type="number"
                  value={settings.facilityCaptureCostIncreasePercent ?? 50}
                  onChange={(e) => update('facilityCaptureCostIncreasePercent', Number(e.target.value))}
                  error={getNumericFieldStatus('facilityCaptureCostIncreasePercent').error}
                  helperText={getNumericFieldStatus('facilityCaptureCostIncreasePercent').helperText}
                  inputProps={{
                    min: NUMERIC_FIELD_META.facilityCaptureCostIncreasePercent.min,
                    max: NUMERIC_FIELD_META.facilityCaptureCostIncreasePercent.max,
                    step: NUMERIC_FIELD_META.facilityCaptureCostIncreasePercent.step,
                  }}
                />

                {showDroneSettings && (
                  <>
                    <TextField
                      id="max-factory-drones-per-factory"
                      label="工場ごとのドローン上限"
                      type="number"
                      value={settings.maxFactoryDronesPerFactory}
                      onChange={(e) => update('maxFactoryDronesPerFactory', Number(e.target.value))}
                      error={getNumericFieldStatus('maxFactoryDronesPerFactory').error}
                      helperText={getNumericFieldStatus('maxFactoryDronesPerFactory').helperText}
                      inputProps={{
                        min: NUMERIC_FIELD_META.maxFactoryDronesPerFactory.min,
                        max: NUMERIC_FIELD_META.maxFactoryDronesPerFactory.max,
                        step: NUMERIC_FIELD_META.maxFactoryDronesPerFactory.step,
                      }}
                    />

                    <TextField
                      id="drone-interception-chance-percent"
                      label="対ドローン迎撃確率（%）"
                      type="number"
                      value={settings.droneInterceptionChancePercent}
                      onChange={(e) => update('droneInterceptionChancePercent', Number(e.target.value))}
                      error={getNumericFieldStatus('droneInterceptionChancePercent').error}
                      helperText={getNumericFieldStatus('droneInterceptionChancePercent').helperText}
                      inputProps={{
                        min: NUMERIC_FIELD_META.droneInterceptionChancePercent.min,
                        max: NUMERIC_FIELD_META.droneInterceptionChancePercent.max,
                        step: NUMERIC_FIELD_META.droneInterceptionChancePercent.step,
                      }}
                    />

                    <TextField
                      id="drone-interception-max-per-turn"
                      label="対ドローン迎撃回数（1ターン）"
                      type="number"
                      value={settings.droneInterceptionMaxPerTurn}
                      onChange={(e) => update('droneInterceptionMaxPerTurn', Number(e.target.value))}
                      error={getNumericFieldStatus('droneInterceptionMaxPerTurn').error}
                      helperText={getNumericFieldStatus('droneInterceptionMaxPerTurn').helperText}
                      inputProps={{
                        min: NUMERIC_FIELD_META.droneInterceptionMaxPerTurn.min,
                        max: NUMERIC_FIELD_META.droneInterceptionMaxPerTurn.max,
                        step: NUMERIC_FIELD_META.droneInterceptionMaxPerTurn.step,
                      }}
                    />

                    <TextField
                      id="drone-ai-production-ratio-limit-percent"
                      label="AIのドローン生産比率上限（%）"
                      type="number"
                      value={settings.droneAiProductionRatioLimitPercent}
                      onChange={(e) => update('droneAiProductionRatioLimitPercent', Number(e.target.value))}
                      error={getNumericFieldStatus('droneAiProductionRatioLimitPercent').error}
                      helperText={getNumericFieldStatus('droneAiProductionRatioLimitPercent').helperText}
                      inputProps={{
                        min: NUMERIC_FIELD_META.droneAiProductionRatioLimitPercent.min,
                        max: NUMERIC_FIELD_META.droneAiProductionRatioLimitPercent.max,
                        step: NUMERIC_FIELD_META.droneAiProductionRatioLimitPercent.step,
                      }}
                    />
                  </>
                )}

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
