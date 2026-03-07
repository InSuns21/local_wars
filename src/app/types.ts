export type AiDifficulty = 'easy' | 'normal' | 'hard';
export type HumanPlayerSide = 'P1' | 'P2';
export type GameSettingsPreset = 'standard' | 'beginner' | 'advanced' | 'drone' | 'custom';

export type GameSettings = {
  aiDifficulty: AiDifficulty;
  humanPlayerSide: HumanPlayerSide;
  fogOfWar: boolean;
  initialFunds: number;
  incomePerProperty: number;
  incomeAirport: number;
  incomePort: number;
  hpRecoveryCity: number;
  hpRecoveryFactory: number;
  hpRecoveryHq: number;
  maxSupplyCharges: number;
  enableAirUnits: boolean;
  enableNavalUnits: boolean;
  enableFuelSupply: boolean;
  enableAmmoSupply: boolean;
  facilityCaptureCostIncreasePercent?: number;
  showEnemyActionLogs?: boolean;
  enableSuicideDrones: boolean;
  droneInterceptionChancePercent: number;
  droneInterceptionMaxPerTurn: number;
  droneAiProductionRatioLimitPercent: number;
};

export const DEFAULT_SETTINGS: GameSettings = {
  aiDifficulty: 'normal',
  humanPlayerSide: 'P1',
  fogOfWar: false,
  initialFunds: 10000,
  incomePerProperty: 1000,
  incomeAirport: 1000,
  incomePort: 1000,
  hpRecoveryCity: 1,
  hpRecoveryFactory: 2,
  hpRecoveryHq: 3,
  maxSupplyCharges: 4,
  enableAirUnits: true,
  enableNavalUnits: true,
  enableFuelSupply: true,
  enableAmmoSupply: true,
  facilityCaptureCostIncreasePercent: 50,
  showEnemyActionLogs: false,
  enableSuicideDrones: false,
  droneInterceptionChancePercent: 70,
  droneInterceptionMaxPerTurn: 2,
  droneAiProductionRatioLimitPercent: 50,
};

export const GAME_SETTINGS_PRESETS: Record<GameSettingsPreset, GameSettings> = {
  standard: DEFAULT_SETTINGS,
  beginner: {
    ...DEFAULT_SETTINGS,
    aiDifficulty: 'easy',
    fogOfWar: false,
    initialFunds: 15000,
    incomeAirport: 1200,
    incomePort: 1200,
    hpRecoveryCity: 2,
    hpRecoveryFactory: 3,
    hpRecoveryHq: 4,
    maxSupplyCharges: 5,
    enableFuelSupply: false,
    enableAmmoSupply: false,
    facilityCaptureCostIncreasePercent: 25,
    showEnemyActionLogs: true,
  },
  advanced: {
    ...DEFAULT_SETTINGS,
    aiDifficulty: 'hard',
    fogOfWar: true,
    initialFunds: 8000,
    incomePerProperty: 900,
    incomeAirport: 900,
    incomePort: 900,
    hpRecoveryFactory: 1,
    hpRecoveryHq: 2,
    maxSupplyCharges: 3,
    enableFuelSupply: true,
    enableAmmoSupply: true,
    facilityCaptureCostIncreasePercent: 75,
    showEnemyActionLogs: false,
  },
  drone: {
    ...DEFAULT_SETTINGS,
    fogOfWar: true,
    enableSuicideDrones: true,
    droneInterceptionChancePercent: 70,
    droneInterceptionMaxPerTurn: 2,
    droneAiProductionRatioLimitPercent: 50,
  },
  custom: DEFAULT_SETTINGS,
};

export type MapDifficulty = 'beginner' | 'standard' | 'challenging';

export type MapMeta = {
  id: string;
  name: string;
  width: number;
  height: number;
  difficulty: MapDifficulty;
  estimatedMinutes: number;
  victoryHint: string;
  featureTags: string[];
  summary: string;
  recommendedForFirstPlay?: boolean;
  recommendedFor?: string;
};
