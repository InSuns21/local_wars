export type AiDifficulty = 'easy' | 'normal' | 'hard';
export type HumanPlayerSide = 'P1' | 'P2';

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

export type MapMeta = {
  id: string;
  name: string;
  width: number;
  height: number;
};

