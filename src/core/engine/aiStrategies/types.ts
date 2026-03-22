import type { AiDifficulty, ResolvedAiProfile } from '@/app/types';
import type { Coord, PlayerId } from '@core/types/game';
import type { GameState } from '@core/types/state';
import type { UnitState, UnitType } from '@core/types/unit';

export type AiOperationalObjective = 'capture' | 'hq_push' | 'regroup' | 'defend_hq';

export type AiOperationalPlanSnapshot = {
  primaryObjective: AiOperationalObjective;
  targetCoord: Coord | null;
  stagingCoord: Coord | null;
  supplyAnchorCoord: Coord | null;
  lowSupplyUnitCount: number;
  frontlineUnitCount: number;
  canPressureHqSoon: boolean;
  desiredCapturerCount: number;
  desiredFrontlineCount: number;
  desiredSupportCount: number;
};

export type AiStrategyPlanContext = {
  state: GameState;
  aiPlayer: PlayerId;
  difficulty: AiDifficulty;
  groundOnlyBattle: boolean;
  enemyHq: Coord | null;
  ownHq: Coord | null;
  capturableTargetCount: number;
  capturerCount: number;
  frontlineUnitCount: number;
  desiredFrontlineCount: number;
  lowSupplyUnitCount: number;
  lowSupplyLimit: number;
  frontlineCanReachEnemyHq: boolean;
  hqThreatContactCount: number;
  imminentHqThreat: boolean;
};

export type AiStrategyProductionContext = {
  state: GameState;
  aiPlayer: PlayerId;
  difficulty: AiDifficulty;
  plan: AiOperationalPlanSnapshot;
  ownCounts: Record<UnitType, number>;
  enemyCounts: Record<UnitType, number>;
  ownFrontlineCount: number;
  supportUnits: number;
  lowSupplyUnits: number;
  canAfford: (type: UnitType) => boolean;
};

export type AiStrategyMoveContext = {
  state: GameState;
  unit: UnitState;
  nearbyAllies: UnitState[];
  hasFrontlineNearby: boolean;
  hasIndirectSupportNearby: boolean;
  canCapture: boolean;
  isFrontlineUnit: boolean;
  tileOwnerIsUnitOwner: boolean;
  tileIsCapturableTerrain: boolean;
};

export type AiStrategy = {
  profile: ResolvedAiProfile;
  adjustDesiredCapturerCount?: (ctx: AiStrategyPlanContext, base: number) => number;
  getHqThreatContactThreshold?: (ctx: AiStrategyPlanContext) => number;
  canForceHqPush?: (ctx: AiStrategyPlanContext) => boolean;
  getDesiredReconCount?: (ctx: AiStrategyProductionContext) => number | null;
  shouldAvoidEmergencySupportProduction?: (ctx: AiStrategyProductionContext) => boolean;
  shouldAvoidSupplyShipProduction?: (ctx: AiStrategyProductionContext) => boolean;
  chooseProductionOverride?: (ctx: AiStrategyProductionContext) => UnitType | null;
  getMoveScoreBonus?: (ctx: AiStrategyMoveContext) => number;
};
