export type AiDifficulty = 'easy' | 'normal' | 'hard';
export type ResolvedAiProfile = 'balanced' | 'captain' | 'hunter' | 'turtle' | 'sieger' | 'drone_swarm' | 'stealth_strike';
export type SelectedAiProfile = ResolvedAiProfile | 'auto' | 'adaptive';
export type HumanPlayerSide = 'P1' | 'P2';
export type GameSettingsPreset = 'standard' | 'beginner' | 'advanced' | 'drone' | 'custom';

export type GameSettings = {
  aiDifficulty: AiDifficulty;
  selectedAiProfile?: SelectedAiProfile;
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
  maxFactoryDronesPerFactory: number;
  droneInterceptionChancePercent: number;
  droneInterceptionMaxPerTurn: number;
  droneAiProductionRatioLimitPercent: number;
  carrierCargoFuelRecoveryPercent: number;
  carrierCargoAmmoRecoveryPercent: number;
  carrierCargoHpRecovery: number;
  carrierCargoHpRecoveryAtPort: number;
};

export const DRONE_FOCUSED_MAP_IDS = ['drone-factory-front', 'interceptor-belt', 'industrial-drone-raid', 'drone-sea-front'] as const;

export const isDroneFocusedMapId = (mapId: string): boolean =>
  (DRONE_FOCUSED_MAP_IDS as readonly string[]).includes(mapId);

export const DEFAULT_SETTINGS: GameSettings = {
  aiDifficulty: 'normal',
  selectedAiProfile: 'auto',
  humanPlayerSide: 'P1',
  fogOfWar: false,
  initialFunds: 10000,
  incomePerProperty: 1000,
  incomeAirport: 1000,
  incomePort: 1000,
  hpRecoveryCity: 1,
  hpRecoveryFactory: 2,
  hpRecoveryHq: 3,
  maxSupplyCharges: 3,
  enableAirUnits: true,
  enableNavalUnits: true,
  enableFuelSupply: true,
  enableAmmoSupply: true,
  facilityCaptureCostIncreasePercent: 50,
  showEnemyActionLogs: false,
  enableSuicideDrones: false,
  maxFactoryDronesPerFactory: 3,
  droneInterceptionChancePercent: 70,
  droneInterceptionMaxPerTurn: 2,
  droneAiProductionRatioLimitPercent: 50,
  carrierCargoFuelRecoveryPercent: 50,
  carrierCargoAmmoRecoveryPercent: 50,
  carrierCargoHpRecovery: 1,
  carrierCargoHpRecoveryAtPort: 1,
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
    maxSupplyCharges: 4,
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
    incomePerProperty: 1000,
    incomeAirport: 1000,
    incomePort: 1000,
    hpRecoveryFactory: 2,
    hpRecoveryHq: 2,
    maxSupplyCharges: 2,
    enableFuelSupply: true,
    enableAmmoSupply: true,
    facilityCaptureCostIncreasePercent: 50,
    showEnemyActionLogs: false,
  },
  drone: {
    ...DEFAULT_SETTINGS,
    fogOfWar: true,
    enableSuicideDrones: true,
    maxFactoryDronesPerFactory: 5,
    droneInterceptionChancePercent: 70,
    droneInterceptionMaxPerTurn: 2,
    droneAiProductionRatioLimitPercent: 50,
    carrierCargoFuelRecoveryPercent: 50,
    carrierCargoAmmoRecoveryPercent: 50,
    carrierCargoHpRecovery: 1,
    carrierCargoHpRecoveryAtPort: 1,
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
