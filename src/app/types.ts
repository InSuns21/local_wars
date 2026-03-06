export type AiDifficulty = 'easy' | 'normal' | 'hard';
export type HumanPlayerSide = 'P1' | 'P2';
export type GameSettingsPreset = 'standard' | 'beginner' | 'advanced' | 'custom';

export type GameSettings = {
  aiDifficulty: AiDifficulty;
  humanPlayerSide: HumanPlayerSide;
  fogOfWar: boolean;
  initialFunds: number;
  incomePerProperty: number;
  hpRecoveryCity: number;
  hpRecoveryFactory: number;
  hpRecoveryHq: number;
  enableAirUnits: boolean;
  enableNavalUnits: boolean;
  enableFuelSupply: boolean;
  enableAmmoSupply: boolean;
  showEnemyActionLogs?: boolean;
};

export const DEFAULT_SETTINGS: GameSettings = {
  aiDifficulty: 'normal',
  humanPlayerSide: 'P1',
  fogOfWar: false,
  initialFunds: 10000,
  incomePerProperty: 1000,
  hpRecoveryCity: 1,
  hpRecoveryFactory: 2,
  hpRecoveryHq: 3,
  enableAirUnits: true,
  enableNavalUnits: true,
  enableFuelSupply: true,
  enableAmmoSupply: true,
  showEnemyActionLogs: false,
};

export const GAME_SETTINGS_PRESETS: Record<GameSettingsPreset, GameSettings> = {
  standard: DEFAULT_SETTINGS,
  beginner: {
    ...DEFAULT_SETTINGS,
    aiDifficulty: 'easy',
    fogOfWar: false,
    initialFunds: 15000,
    hpRecoveryCity: 2,
    hpRecoveryFactory: 3,
    hpRecoveryHq: 4,
    enableFuelSupply: false,
    enableAmmoSupply: false,
    showEnemyActionLogs: true,
  },
  advanced: {
    ...DEFAULT_SETTINGS,
    aiDifficulty: 'hard',
    fogOfWar: true,
    initialFunds: 8000,
    incomePerProperty: 900,
    hpRecoveryFactory: 1,
    hpRecoveryHq: 2,
    enableFuelSupply: true,
    enableAmmoSupply: true,
    showEnemyActionLogs: false,
  },
  custom: DEFAULT_SETTINGS,
};

export type MapMeta = {
  id: string;
  name: string;
  width: number;
  height: number;
};
