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
  phase: GamePhase;
  map: MapState;
  units: Record<string, UnitState>;
  players: Record<PlayerId, PlayerState>;
  rngSeed: number;
  actionLog: ActionLogEntry[];
  winner: PlayerId | null;
  // ターン開始時の拠点収入（工場/HQ）
  incomePerProperty?: number;
  hpRecoveryCity?: number;
  hpRecoveryFactory?: number;
  hpRecoveryHq?: number;
};

export type MoveUnitCommand = {
  type: 'MOVE_UNIT';
  unitId: string;
  to: Coord;
  // UI で選択した実移動ルート（省略時はエンジンが算出）
  path?: Coord[];
};

export type AttackCommand = {
  type: 'ATTACK';
  attackerId: string;
  defenderId: string;
};

export type CaptureCommand = {
  type: 'CAPTURE';
  unitId: string;
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
  | CaptureCommand
  | ProduceUnitCommand
  | EndTurnCommand
  | UndoCommand;

export type CommandResult = {
  ok: boolean;
  reason?: string;
};


