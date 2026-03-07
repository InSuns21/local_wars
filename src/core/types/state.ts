import type { ActionLogEntry, Coord, GamePhase, PlayerId } from './game';
import type { MapState } from './map';
import type { UnitState } from './unit';

export type PlayerState = {
  id: PlayerId;
  funds: number;
  vp: number;
};

export type GameState = {
  turn: number;
  currentPlayerId: PlayerId;
  humanPlayerSide?: 'P1' | 'P2';
  aiDifficulty?: 'easy' | 'normal' | 'hard';
  fogOfWar?: boolean;
  enableFuelSupply?: boolean;
  enableAmmoSupply?: boolean;
  showEnemyActionLogs?: boolean;
  facilityCaptureCostIncreasePercent?: number;
  phase: GamePhase;
  map: MapState;
  units: Record<string, UnitState>;
  players: Record<PlayerId, PlayerState>;
  rngSeed: number;
  actionLog: ActionLogEntry[];
  winner: PlayerId | null;
  victoryReason?: 'HQ_CAPTURE' | 'ANNIHILATION' | 'VP_LIMIT' | null;
  incomePerProperty?: number;
  incomeAirport?: number;
  incomePort?: number;
  hpRecoveryCity?: number;
  hpRecoveryFactory?: number;
  hpRecoveryHq?: number;
  maxSupplyCharges?: number;
  enableSuicideDrones?: boolean;
  droneInterceptionChancePercent?: number;
  droneInterceptionMaxPerTurn?: number;
  droneAiProductionRatioLimitPercent?: number;
  factoryProductionState?: Record<string, { normalProduced?: boolean; droneProducedCount?: number }>;
};

export type MoveUnitCommand = {
  type: 'MOVE_UNIT';
  unitId: string;
  to: Coord;
  path?: Coord[];
};

export type AttackCommand = {
  type: 'ATTACK';
  attackerId: string;
  defenderId: string;
};

export type AttackTileCommand = {
  type: 'ATTACK_TILE';
  attackerId: string;
  target: Coord;
};

export type CaptureCommand = {
  type: 'CAPTURE';
  unitId: string;
};

export type SupplyCommand = {
  type: 'SUPPLY';
  unitId: string;
};

export type LoadCommand = {
  type: 'LOAD';
  transportUnitId: string;
  cargoUnitId: string;
};

export type UnloadCommand = {
  type: 'UNLOAD';
  transportUnitId: string;
  cargoUnitId: string;
  to: Coord;
};

export type ProduceUnitCommand = {
  type: 'PRODUCE_UNIT';
  playerId: PlayerId;
  factoryCoord: Coord;
  unitType: UnitState['type'];
};

export type EndTurnCommand = {
  type: 'END_TURN';
};

export type UndoCommand = {
  type: 'UNDO';
};

export type GameCommand =
  | MoveUnitCommand
  | AttackCommand
  | AttackTileCommand
  | CaptureCommand
  | SupplyCommand
  | LoadCommand
  | UnloadCommand
  | ProduceUnitCommand
  | EndTurnCommand
  | UndoCommand;

export type CommandResult = {
  ok: boolean;
  reason?: string;
};
