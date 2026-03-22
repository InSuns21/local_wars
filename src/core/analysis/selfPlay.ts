import type { GameSettings, SelectedAiProfile } from '../../app/types';
import { SKIRMISH_MAP_METAS } from '../../data/skirmishMaps';
import { createInitialGameState } from '../engine/createInitialGameState';
import { UNIT_DEFINITIONS } from '../engine/unitDefinitions';
import { type AiDifficulty, runAiTurnAnalysis } from '../engine/aiTurn';
import type { VictoryReason } from '../rules/victory';
import type { PlayerId } from '../types/game';
import type { GameState } from '../types/state';
import type { UnitState, UnitType } from '../types/unit';

export type SelfPlayParticipantId = 'left' | 'right';
export type SelfPlaySide = PlayerId;
type ResolvedSelfPlayProfile = Exclude<SelectedAiProfile, 'auto' | 'adaptive'>;
type UnitCountMap = Partial<Record<UnitType, number>>;

export type SelfPlayParticipantConfig = {
  id: SelfPlayParticipantId;
  label: string;
  difficulty: AiDifficulty;
  selectedAiProfile: SelectedAiProfile;
};

export type SelfPlayResponseRateSummary = {
  rate: number;
  opportunityCount: number;
};

export type SelfPlayCompositionShares = {
  frontline: number;
  scout: number;
  support: number;
  air: number;
  naval: number;
  drone: number;
  other: number;
};

export type SelfPlayThreatResponseSnapshot = {
  enemyUsedAir: boolean;
  enemyUsedDrone: boolean;
  enemyUsedSubmarine: boolean;
  hadAirCounter: boolean;
  hadDroneCounter: boolean;
  hadSubCounter: boolean;
};

export type SelfPlayObjective = 'capture' | 'hq_push' | 'regroup' | 'defend_hq';
export type SelfPlayObjectiveBreakdown = Record<SelfPlayObjective, number>;

export type SelfPlayTurnActivity = {
  turn: number;
  participantId: SelfPlayParticipantId;
  side: SelfPlaySide;
  objective: SelfPlayObjective;
  moveCount: number;
  attackCount: number;
  captureCount: number;
  productionCount: number;
  fogEncounterCount: number;
  activeActionCount: number;
  isStalledTurn: boolean;
};

export type SelfPlayMatchStallSummary = {
  suspected: boolean;
  longestInactiveStreaks: Record<SelfPlayParticipantId, number>;
  inactiveTurnCounts: Record<SelfPlayParticipantId, number>;
  inactiveTurnRates: Record<SelfPlayParticipantId, number>;
  reasons: string[];
  turnActivities: SelfPlayTurnActivity[];
};

export type SelfPlayParticipantMatchSummary = {
  label: string;
  side: SelfPlaySide;
  difficulty: AiDifficulty;
  selectedAiProfile: SelectedAiProfile;
  resolvedAiProfile: ResolvedSelfPlayProfile | null;
  funds: number;
  propertyCount: number;
  aliveUnitCount: number;
  propertyCaptureCount: number;
  productionCount: number;
  producedUnitTypes: UnitCountMap;
  highValueUnitsLost: number;
  highValueEnemyUnitsDestroyed: number;
  lowSupplyUnitCount: number;
  scoutAvailable: number;
  scoutSurvivorCount: number;
  supportAvailable: number;
  supportSurvivorCount: number;
  threatResponse: SelfPlayThreatResponseSnapshot;
  compositionShares: SelfPlayCompositionShares;
  objectiveBreakdown: SelfPlayObjectiveBreakdown;
};

export type SelfPlayMatchResult = {
  matchIndex: number;
  seed: number;
  mapId: string;
  mapName: string;
  turnsPlayed: number;
  fogOfWar: boolean;
  endedBy: 'victory' | 'turn_limit';
  winnerParticipantId: SelfPlayParticipantId | null;
  winnerSide: SelfPlaySide | null;
  victoryReason: VictoryReason | 'TURN_LIMIT' | null;
  participants: Record<SelfPlayParticipantId, SelfPlayParticipantMatchSummary>;
  majorEvents: Array<{ turn: number; playerId: PlayerId; action: string; detail?: string }>;
  stall: SelfPlayMatchStallSummary;
};

export type SelfPlayParticipantAggregate = {
  label: string;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  averageFunds: number;
  averagePropertyCount: number;
  averageAliveUnitCount: number;
  firstPlayerWins: number;
  firstPlayerMatches: number;
  firstPlayerWinRate: number;
  secondPlayerWins: number;
  secondPlayerMatches: number;
  secondPlayerWinRate: number;
  averagePropertyCaptures: number;
  averageProductionCount: number;
  averageHighValueUnitsLost: number;
  averageHighValueEnemyUnitsDestroyed: number;
  averageHighValueTradeBalance: number;
  averageLowSupplyUnitCount: number;
  averageHqCaptureTurn: number | null;
  scoutSurvivalRate: number;
  supportSurvivalRate: number;
  responseRates: {
    antiAir: SelfPlayResponseRateSummary;
    antiDrone: SelfPlayResponseRateSummary;
    antiSub: SelfPlayResponseRateSummary;
  };
  compositionShares: SelfPlayCompositionShares;
  mapWinRateSpread: number;
  sideWinRateGap: number;
  averageInactiveTurnRate: number;
  averageLongestInactiveStreak: number;
  stallMatchRate: number;
  suspectedStallReasons: string[];
  objectiveRates: SelfPlayObjectiveBreakdown;
  dominantObjective: SelfPlayObjective;
  resolvedProfileBreakdown: Array<{
    profile: string;
    matches: number;
  }>;
};

export type SelfPlaySeriesConfig = {
  maps: string[];
  matchCount: number;
  maxTurns: number;
  seed: number;
  fogOfWar: boolean;
  swapSidesEveryMatch?: boolean;
  baseSettings?: Partial<GameSettings>;
  participants: Record<SelfPlayParticipantId, SelfPlayParticipantConfig>;
};

export type SelfPlaySeriesReport = {
  generatedAt: string;
  config: {
    maps: string[];
    matchCount: number;
    maxTurns: number;
    seed: number;
    fogOfWar: boolean;
    swapSidesEveryMatch: boolean;
    participants: Record<SelfPlayParticipantId, SelfPlayParticipantConfig>;
  };
  aggregate: {
    totalMatches: number;
    averageTurns: number;
    hqCaptureRate: number;
    annihilationRate: number;
    turnLimitRate: number;
    participants: Record<SelfPlayParticipantId, SelfPlayParticipantAggregate>;
    mapBreakdown: Array<{
      mapId: string;
      mapName: string;
      matches: number;
      averageTurns: number;
      wins: Record<SelfPlayParticipantId, number>;
      winRates: Record<SelfPlayParticipantId, number>;
      draws: number;
    }>;
  };
  matches: SelfPlayMatchResult[];
};

export type SelfPlayParticipantComparison = {
  label: string;
  winRateDelta: number;
  averageFundsDelta: number;
  averagePropertyCountDelta: number;
  averageAliveUnitCountDelta: number;
  firstPlayerWinRateDelta: number;
  secondPlayerWinRateDelta: number;
  averagePropertyCapturesDelta: number;
  averageHighValueTradeBalanceDelta: number;
  averageLowSupplyUnitCountDelta: number;
  scoutSurvivalRateDelta: number;
  supportSurvivalRateDelta: number;
  antiAirResponseRateDelta: number;
  antiDroneResponseRateDelta: number;
  antiSubResponseRateDelta: number;
  mapWinRateSpreadDelta: number;
  sideWinRateGapDelta: number;
  averageInactiveTurnRateDelta: number;
  averageLongestInactiveStreakDelta: number;
  stallMatchRateDelta: number;
};

export type SelfPlayComparisonReport = {
  generatedAt: string;
  beforeGeneratedAt: string;
  afterGeneratedAt: string;
  turnDelta: number;
  hqCaptureRateDelta: number;
  annihilationRateDelta: number;
  turnLimitRateDelta: number;
  participants: Record<SelfPlayParticipantId, SelfPlayParticipantComparison>;
};

export type SelfPlayImprovementProposalTarget = {
  participantId: SelfPlayParticipantId;
  label: string;
  difficulty: AiDifficulty;
  selectedAiProfile: SelectedAiProfile;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  nextExperiments: string[];
};

export type SelfPlayImprovementProposal = {
  generatedAt: string;
  basedOnGeneratedAt: string;
  comparisonGeneratedAt?: string;
  summary: string[];
  targets: SelfPlayImprovementProposalTarget[];
};

const CAPTURABLE_TERRAINS = new Set(['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT']);
const IMPORTANT_ACTIONS = new Set(['CAPTURE', 'ATTACK', 'ATTACK_TILE', 'FOG_ENCOUNTER', 'PRODUCE_UNIT']);
const ACTIVE_ACTIONS = new Set(['MOVE_UNIT', 'CAPTURE', 'ATTACK', 'ATTACK_TILE', 'FOG_ENCOUNTER', 'PRODUCE_UNIT']);
const HIGH_VALUE_TYPES = new Set<UnitType>(['HEAVY_TANK', 'BATTLESHIP', 'CARRIER', 'STEALTH_BOMBER', 'BOMBER', 'MISSILE_AA']);
const SCOUT_TYPES = new Set<UnitType>(['RECON']);
const SUPPORT_TYPES = new Set<UnitType>(['SUPPLY_TRUCK', 'AIR_TANKER', 'SUPPLY_SHIP']);
const AIR_TYPES = new Set<UnitType>(['FIGHTER', 'BOMBER', 'ATTACKER', 'STEALTH_BOMBER', 'AIR_TANKER', 'TRANSPORT_HELI']);
const NAVAL_TYPES = new Set<UnitType>(['CARRIER', 'SUBMARINE', 'BATTLESHIP', 'SUPPLY_SHIP', 'DESTROYER', 'LANDER']);
const DRONE_TYPES = new Set<UnitType>(['SUICIDE_DRONE']);
const FRONTLINE_TYPES = new Set<UnitType>(['TANK', 'HEAVY_TANK', 'ANTI_TANK', 'ANTI_AIR', 'DESTROYER']);
const AIR_COUNTER_TYPES = new Set<UnitType>(['ANTI_AIR', 'FLAK_TANK', 'MISSILE_AA', 'COUNTER_DRONE_AA', 'FIGHTER', 'AIR_DEFENSE_INFANTRY']);
const DRONE_COUNTER_TYPES = new Set<UnitType>(['COUNTER_DRONE_AA', 'ANTI_AIR', 'FLAK_TANK', 'MISSILE_AA', 'FIGHTER', 'AIR_DEFENSE_INFANTRY']);
const SUB_COUNTER_TYPES = new Set<UnitType>(['DESTROYER', 'CARRIER', 'ATTACKER', 'BATTLESHIP']);
const EMPTY_COMPOSITION: SelfPlayCompositionShares = { frontline: 0, scout: 0, support: 0, air: 0, naval: 0, drone: 0, other: 0 };
const OBJECTIVES: SelfPlayObjective[] = ['capture', 'hq_push', 'regroup', 'defend_hq'];
const EMPTY_OBJECTIVE_BREAKDOWN: SelfPlayObjectiveBreakdown = {
  capture: 0,
  hq_push: 0,
  regroup: 0,
  defend_hq: 0,
};

const round = (value: number, digits = 3): number => {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
};

const average = (values: number[]): number => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
const averageNullable = (values: Array<number | null>): number | null => {
  const filtered = values.filter((value): value is number => value != null);
  return filtered.length === 0 ? null : round(average(filtered));
};
const rate = (numerator: number, denominator: number): number => denominator <= 0 ? 0 : numerator / denominator;

const getMapName = (mapId: string): string => SKIRMISH_MAP_METAS.find((map) => map.id === mapId)?.name ?? mapId;

const createSeededRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createSelfPlaySettings = (fogOfWar: boolean, baseSettings?: Partial<GameSettings>): GameSettings => ({
  aiDifficulty: 'normal',
  selectedAiProfile: 'balanced',
  humanPlayerSide: 'P1',
  fogOfWar,
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
  maxFactoryDronesPerFactory: 3,
  droneInterceptionChancePercent: 70,
  droneInterceptionMaxPerTurn: 2,
  droneAiProductionRatioLimitPercent: 50,
  carrierCargoFuelRecoveryPercent: 50,
  carrierCargoAmmoRecoveryPercent: 50,
  carrierCargoHpRecovery: 1,
  carrierCargoHpRecoveryAtPort: 1,
  ...baseSettings,
});

const countProperties = (state: GameState, playerId: PlayerId): number =>
  Object.values(state.map.tiles).filter((tile) => tile.owner === playerId && CAPTURABLE_TERRAINS.has(tile.terrainType)).length;

const getAliveUnits = (state: GameState, playerId: PlayerId): UnitState[] =>
  Object.values(state.units).filter((unit) => unit.owner === playerId && unit.hp > 0);

const countAliveUnits = (state: GameState, playerId: PlayerId): number =>
  getAliveUnits(state, playerId).length;

const countUnitsInSet = (units: UnitState[], allowedTypes: Set<UnitType>): number =>
  units.filter((unit) => allowedTypes.has(unit.type)).length;

const sumUnitCounts = (counts: UnitCountMap): number =>
  Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);

const sumCountsInSet = (counts: UnitCountMap, allowedTypes: Set<UnitType>): number =>
  Object.entries(counts).reduce((sum, [unitType, count]) => sum + (allowedTypes.has(unitType as UnitType) ? (count ?? 0) : 0), 0);

const extractProducedUnitType = (detail?: string): UnitType | null => {
  const match = detail?.match(/^([A-Z_]+)/);
  return match ? (match[1] as UnitType) : null;
};

const countProducedUnitTypes = (state: GameState, playerId: PlayerId): UnitCountMap => state.actionLog
  .filter((entry) => entry.playerId === playerId && entry.action === 'PRODUCE_UNIT')
  .reduce<UnitCountMap>((counts, entry) => {
    const unitType = extractProducedUnitType(entry.detail);
    if (!unitType) return counts;
    counts[unitType] = (counts[unitType] ?? 0) + 1;
    return counts;
  }, {});

const calculateCompositionShares = (units: UnitState[]): SelfPlayCompositionShares => {
  if (units.length === 0) return EMPTY_COMPOSITION;
  const frontline = countUnitsInSet(units, FRONTLINE_TYPES);
  const scout = countUnitsInSet(units, SCOUT_TYPES);
  const support = countUnitsInSet(units, SUPPORT_TYPES);
  const air = countUnitsInSet(units, AIR_TYPES);
  const naval = countUnitsInSet(units, NAVAL_TYPES);
  const drone = countUnitsInSet(units, DRONE_TYPES);
  const other = Math.max(0, units.length - frontline - scout - support - air - naval - drone);
  return {
    frontline: round(frontline / units.length),
    scout: round(scout / units.length),
    support: round(support / units.length),
    air: round(air / units.length),
    naval: round(naval / units.length),
    drone: round(drone / units.length),
    other: round(other / units.length),
  };
};

const calculateLowSupplyUnitCount = (units: UnitState[]): number => units.filter((unit) => {
  const definition = UNIT_DEFINITIONS[unit.type];
  const lowFuelThreshold = Math.max(1, Math.ceil(definition.maxFuel * 0.25));
  const lowAmmoThreshold = definition.maxAmmo > 0 ? Math.max(1, Math.ceil(definition.maxAmmo * 0.25)) : 0;
  const lowFuel = definition.maxFuel > 0 && unit.fuel <= lowFuelThreshold;
  const lowAmmo = definition.maxAmmo > 0 && unit.ammo <= lowAmmoThreshold;
  return lowFuel || lowAmmo;
}).length;

const normalizeResponseRate = (value?: Partial<SelfPlayResponseRateSummary>): SelfPlayResponseRateSummary => ({
  rate: value?.rate ?? 0,
  opportunityCount: value?.opportunityCount ?? 0,
});

const normalizeCompositionShares = (value?: Partial<SelfPlayCompositionShares>): SelfPlayCompositionShares => ({
  frontline: value?.frontline ?? 0,
  scout: value?.scout ?? 0,
  support: value?.support ?? 0,
  air: value?.air ?? 0,
  naval: value?.naval ?? 0,
  drone: value?.drone ?? 0,
  other: value?.other ?? 0,
});

const normalizeObjectiveBreakdown = (value?: Partial<SelfPlayObjectiveBreakdown>): SelfPlayObjectiveBreakdown => ({
  capture: value?.capture ?? 0,
  hq_push: value?.hq_push ?? 0,
  regroup: value?.regroup ?? 0,
  defend_hq: value?.defend_hq ?? 0,
});

const normalizeRecord = <K extends string>(keys: readonly K[], value?: Partial<Record<K, number>>): Record<K, number> =>
  keys.reduce<Record<K, number>>((result, key) => {
    result[key] = value?.[key] ?? 0;
    return result;
  }, {} as Record<K, number>);

const getParticipantAggregate = (
  report: SelfPlaySeriesReport,
  participantId: SelfPlayParticipantId,
): SelfPlayParticipantAggregate => {
  const aggregate = report.aggregate.participants[participantId] as Partial<SelfPlayParticipantAggregate> | undefined;
  return {
    label: aggregate?.label ?? report.config.participants[participantId].label,
    wins: aggregate?.wins ?? 0,
    draws: aggregate?.draws ?? 0,
    losses: aggregate?.losses ?? 0,
    winRate: aggregate?.winRate ?? 0,
    averageFunds: aggregate?.averageFunds ?? 0,
    averagePropertyCount: aggregate?.averagePropertyCount ?? 0,
    averageAliveUnitCount: aggregate?.averageAliveUnitCount ?? 0,
    firstPlayerWins: aggregate?.firstPlayerWins ?? 0,
    firstPlayerMatches: aggregate?.firstPlayerMatches ?? 0,
    firstPlayerWinRate: aggregate?.firstPlayerWinRate ?? 0,
    secondPlayerWins: aggregate?.secondPlayerWins ?? 0,
    secondPlayerMatches: aggregate?.secondPlayerMatches ?? 0,
    secondPlayerWinRate: aggregate?.secondPlayerWinRate ?? 0,
    averagePropertyCaptures: aggregate?.averagePropertyCaptures ?? 0,
    averageProductionCount: aggregate?.averageProductionCount ?? 0,
    averageHighValueUnitsLost: aggregate?.averageHighValueUnitsLost ?? 0,
    averageHighValueEnemyUnitsDestroyed: aggregate?.averageHighValueEnemyUnitsDestroyed ?? 0,
    averageHighValueTradeBalance: aggregate?.averageHighValueTradeBalance ?? 0,
    averageLowSupplyUnitCount: aggregate?.averageLowSupplyUnitCount ?? 0,
    averageHqCaptureTurn: aggregate?.averageHqCaptureTurn ?? null,
    scoutSurvivalRate: aggregate?.scoutSurvivalRate ?? 0,
    supportSurvivalRate: aggregate?.supportSurvivalRate ?? 0,
    responseRates: {
      antiAir: normalizeResponseRate(aggregate?.responseRates?.antiAir),
      antiDrone: normalizeResponseRate(aggregate?.responseRates?.antiDrone),
      antiSub: normalizeResponseRate(aggregate?.responseRates?.antiSub),
    },
    compositionShares: normalizeCompositionShares(aggregate?.compositionShares),
    mapWinRateSpread: aggregate?.mapWinRateSpread ?? 0,
    sideWinRateGap: aggregate?.sideWinRateGap ?? 0,
    averageInactiveTurnRate: aggregate?.averageInactiveTurnRate ?? 0,
    averageLongestInactiveStreak: aggregate?.averageLongestInactiveStreak ?? 0,
    stallMatchRate: aggregate?.stallMatchRate ?? 0,
    suspectedStallReasons: aggregate?.suspectedStallReasons ?? [],
    objectiveRates: normalizeObjectiveBreakdown(aggregate?.objectiveRates),
    dominantObjective: aggregate?.dominantObjective ?? 'capture',
    resolvedProfileBreakdown: aggregate?.resolvedProfileBreakdown ?? [],
  };
};

const buildTurnState = (
  state: GameState,
  side: SelfPlaySide,
  participant: SelfPlayParticipantConfig,
  resolvedAiProfile: ResolvedSelfPlayProfile | null,
): GameState => ({
  ...state,
  currentPlayerId: side,
  aiDifficulty: participant.difficulty,
  selectedAiProfile: participant.selectedAiProfile,
  resolvedAiProfile: resolvedAiProfile ?? undefined,
});

const buildParticipantMatchSummary = (
  state: GameState,
  initialState: GameState,
  side: SelfPlaySide,
  participant: SelfPlayParticipantConfig,
  resolvedAiProfile: ResolvedSelfPlayProfile | null,
  turnActivities: SelfPlayTurnActivity[],
): SelfPlayParticipantMatchSummary => {
  const enemySide: SelfPlaySide = side === 'P1' ? 'P2' : 'P1';
  const initialOwnUnits = getAliveUnits(initialState, side);
  const finalOwnUnits = getAliveUnits(state, side);
  const initialEnemyUnits = getAliveUnits(initialState, enemySide);
  const finalEnemyUnits = getAliveUnits(state, enemySide);
  const ownProducedUnitTypes = countProducedUnitTypes(state, side);
  const enemyProducedUnitTypes = countProducedUnitTypes(state, enemySide);
  const propertyCaptureCount = state.actionLog.filter((entry) => entry.playerId === side && entry.action === 'CAPTURE').length;
  const productionCount = sumUnitCounts(ownProducedUnitTypes);
  const ownHighValueAvailable = countUnitsInSet(initialOwnUnits, HIGH_VALUE_TYPES) + sumCountsInSet(ownProducedUnitTypes, HIGH_VALUE_TYPES);
  const enemyHighValueAvailable = countUnitsInSet(initialEnemyUnits, HIGH_VALUE_TYPES) + sumCountsInSet(enemyProducedUnitTypes, HIGH_VALUE_TYPES);
  const ownScoutAvailable = countUnitsInSet(initialOwnUnits, SCOUT_TYPES) + sumCountsInSet(ownProducedUnitTypes, SCOUT_TYPES);
  const ownSupportAvailable = countUnitsInSet(initialOwnUnits, SUPPORT_TYPES) + sumCountsInSet(ownProducedUnitTypes, SUPPORT_TYPES);
  const objectiveBreakdown = turnActivities
    .filter((activity) => activity.side === side)
    .reduce<SelfPlayObjectiveBreakdown>((acc, activity) => {
      acc[activity.objective] += 1;
      return acc;
    }, { ...EMPTY_OBJECTIVE_BREAKDOWN });

  return {
    label: participant.label,
    side,
    difficulty: participant.difficulty,
    selectedAiProfile: participant.selectedAiProfile,
    resolvedAiProfile,
    funds: state.players[side].funds,
    propertyCount: countProperties(state, side),
    aliveUnitCount: countAliveUnits(state, side),
    propertyCaptureCount,
    productionCount,
    producedUnitTypes: ownProducedUnitTypes,
    highValueUnitsLost: Math.max(0, ownHighValueAvailable - countUnitsInSet(finalOwnUnits, HIGH_VALUE_TYPES)),
    highValueEnemyUnitsDestroyed: Math.max(0, enemyHighValueAvailable - countUnitsInSet(finalEnemyUnits, HIGH_VALUE_TYPES)),
    lowSupplyUnitCount: calculateLowSupplyUnitCount(finalOwnUnits),
    scoutAvailable: ownScoutAvailable,
    scoutSurvivorCount: countUnitsInSet(finalOwnUnits, SCOUT_TYPES),
    supportAvailable: ownSupportAvailable,
    supportSurvivorCount: countUnitsInSet(finalOwnUnits, SUPPORT_TYPES),
    threatResponse: {
      enemyUsedAir: countUnitsInSet(initialEnemyUnits, AIR_TYPES) + sumCountsInSet(enemyProducedUnitTypes, AIR_TYPES) > 0,
      enemyUsedDrone: countUnitsInSet(initialEnemyUnits, DRONE_TYPES) + sumCountsInSet(enemyProducedUnitTypes, DRONE_TYPES) > 0,
      enemyUsedSubmarine: initialEnemyUnits.filter((unit) => unit.type === 'SUBMARINE').length + (enemyProducedUnitTypes.SUBMARINE ?? 0) > 0,
      hadAirCounter: countUnitsInSet(initialOwnUnits, AIR_COUNTER_TYPES) + sumCountsInSet(ownProducedUnitTypes, AIR_COUNTER_TYPES) > 0,
      hadDroneCounter: countUnitsInSet(initialOwnUnits, DRONE_COUNTER_TYPES) + sumCountsInSet(ownProducedUnitTypes, DRONE_COUNTER_TYPES) > 0,
      hadSubCounter: countUnitsInSet(initialOwnUnits, SUB_COUNTER_TYPES) + sumCountsInSet(ownProducedUnitTypes, SUB_COUNTER_TYPES) > 0,
    },
    compositionShares: calculateCompositionShares(finalOwnUnits),
    objectiveBreakdown,
  };
};

const summarizeTurnActivity = (
  entries: GameState['actionLog'],
  turn: number,
  side: SelfPlaySide,
  participantId: SelfPlayParticipantId,
  objective: SelfPlayObjective,
): SelfPlayTurnActivity => {
  const moveCount = entries.filter((entry) => entry.action === 'MOVE_UNIT').length;
  const attackCount = entries.filter((entry) => entry.action === 'ATTACK' || entry.action === 'ATTACK_TILE').length;
  const captureCount = entries.filter((entry) => entry.action === 'CAPTURE').length;
  const productionCount = entries.filter((entry) => entry.action === 'PRODUCE_UNIT').length;
  const fogEncounterCount = entries.filter((entry) => entry.action === 'FOG_ENCOUNTER').length;
  const activeActionCount = entries.filter((entry) => ACTIVE_ACTIONS.has(entry.action)).length;
  return {
    turn,
    participantId,
    side,
    objective,
    moveCount,
    attackCount,
    captureCount,
    productionCount,
    fogEncounterCount,
    activeActionCount,
    isStalledTurn: activeActionCount === 0,
  };
};

const buildMatchStallSummary = (
  turnActivities: SelfPlayTurnActivity[],
  participants: Record<SelfPlayParticipantId, SelfPlayParticipantMatchSummary>,
): SelfPlayMatchStallSummary => {
  const ids: SelfPlayParticipantId[] = ['left', 'right'];
  const longestInactiveStreaks = normalizeRecord(ids, {});
  const inactiveTurnCounts = normalizeRecord(ids, {});
  const inactiveTurnRates = normalizeRecord(ids, {});
  const reasonCounts = new Map<string, number>();

  for (const participantId of ids) {
    const ownTurns = turnActivities.filter((activity) => activity.participantId === participantId);
    let currentStreak = 0;
    for (const activity of ownTurns) {
      if (activity.isStalledTurn) {
        inactiveTurnCounts[participantId] += 1;
        currentStreak += 1;
        longestInactiveStreaks[participantId] = Math.max(longestInactiveStreaks[participantId], currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    inactiveTurnRates[participantId] = round(rate(inactiveTurnCounts[participantId], ownTurns.length));

    const summary = participants[participantId];
    if (longestInactiveStreaks[participantId] >= 5) {
      reasonCounts.set('主要行動ゼロの連続ターンが長い', (reasonCounts.get('主要行動ゼロの連続ターンが長い') ?? 0) + 1);
    }
    if (summary.productionCount === 0 && summary.funds >= 30000) {
      reasonCounts.set('資金を抱えたまま生産できていない', (reasonCounts.get('資金を抱えたまま生産できていない') ?? 0) + 1);
    }
    if (summary.propertyCaptureCount === 0) {
      reasonCounts.set('占領完了が発生していない', (reasonCounts.get('占領完了が発生していない') ?? 0) + 1);
    }
    if (ownTurns.length > 0 && ownTurns.every((activity) => activity.moveCount === 0)) {
      reasonCounts.set('移動行動が観測されていない', (reasonCounts.get('移動行動が観測されていない') ?? 0) + 1);
    }
  }

  const reasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason]) => reason);

  return {
    suspected: reasons.length > 0,
    longestInactiveStreaks,
    inactiveTurnCounts,
    inactiveTurnRates,
    reasons,
    turnActivities,
  };
};

export const runSelfPlayMatch = (
  config: Omit<SelfPlaySeriesConfig, 'matchCount' | 'maps' | 'swapSidesEveryMatch' | 'seed'> & {
    mapId: string;
    matchIndex: number;
    seed: number;
    swapSides: boolean;
  },
): SelfPlayMatchResult => {
  const rng = createSeededRng(config.seed);
  const sideAssignments: Record<SelfPlaySide, SelfPlayParticipantId> = config.swapSides
    ? { P1: 'right', P2: 'left' }
    : { P1: 'left', P2: 'right' };
  const resolvedProfiles: Record<SelfPlayParticipantId, ResolvedSelfPlayProfile | null> = { left: null, right: null };

  const initialState = createInitialGameState({
    mapId: config.mapId,
    settings: createSelfPlaySettings(config.fogOfWar, config.baseSettings),
  });
  let state = initialState;
  const turnActivities: SelfPlayTurnActivity[] = [];

  while (!state.winner && state.turn <= config.maxTurns) {
    const side = state.currentPlayerId;
    const participantId = sideAssignments[side];
    const participant = config.participants[participantId];
    const previousActionLogLength = state.actionLog.length;
    const aiResult = runAiTurnAnalysis(buildTurnState(state, side, participant, resolvedProfiles[participantId]), {
      difficulty: participant.difficulty,
      deps: { rng },
    });
    const nextState = aiResult.finalState;
    resolvedProfiles[participantId] = (nextState.resolvedAiProfile ?? null) as ResolvedSelfPlayProfile | null;
    const objective = aiResult.operationalObjective ?? 'capture';
    const newEntries = nextState.actionLog
      .slice(previousActionLogLength)
      .filter((entry) => entry.turn === state.turn && entry.playerId === side);
    turnActivities.push(summarizeTurnActivity(newEntries, state.turn, side, participantId, objective));
    state = nextState;
  }

  const leftSide: SelfPlaySide = sideAssignments.P1 === 'left' ? 'P1' : 'P2';
  const rightSide: SelfPlaySide = sideAssignments.P1 === 'right' ? 'P1' : 'P2';
  const participantSummaries = {
    left: buildParticipantMatchSummary(state, initialState, leftSide, config.participants.left, resolvedProfiles.left, turnActivities),
    right: buildParticipantMatchSummary(state, initialState, rightSide, config.participants.right, resolvedProfiles.right, turnActivities),
  };

  return {
    matchIndex: config.matchIndex,
    seed: config.seed,
    mapId: config.mapId,
    mapName: getMapName(config.mapId),
    turnsPlayed: state.winner ? state.turn : config.maxTurns,
    fogOfWar: config.fogOfWar,
    endedBy: state.winner ? 'victory' : 'turn_limit',
    winnerParticipantId: state.winner ? sideAssignments[state.winner] : null,
    winnerSide: state.winner,
    victoryReason: state.winner ? (state.victoryReason ?? null) : 'TURN_LIMIT',
    participants: participantSummaries,
    majorEvents: state.actionLog
      .filter((entry) => IMPORTANT_ACTIONS.has(entry.action))
      .slice(-8)
      .map((entry) => ({ turn: entry.turn, playerId: entry.playerId, action: entry.action, detail: entry.detail })),
    stall: buildMatchStallSummary(turnActivities, participantSummaries),
  };
};

export const runSelfPlaySeries = (config: SelfPlaySeriesConfig): SelfPlaySeriesReport => {
  if (config.maps.length === 0) {
    throw new Error('maps は1件以上指定してください。');
  }
  const swapSidesEveryMatch = config.swapSidesEveryMatch ?? true;
  const matches = Array.from({ length: config.matchCount }, (_, index) =>
    runSelfPlayMatch({
      ...config,
      mapId: config.maps[index % config.maps.length],
      matchIndex: index + 1,
      seed: config.seed + index,
      swapSides: swapSidesEveryMatch && index % 2 === 1,
    }));

  const mapBreakdown = config.maps.map((mapId) => {
    const mapMatches = matches.filter((match) => match.mapId === mapId);
    const leftWins = mapMatches.filter((match) => match.winnerParticipantId === 'left').length;
    const rightWins = mapMatches.filter((match) => match.winnerParticipantId === 'right').length;
    return {
      mapId,
      mapName: getMapName(mapId),
      matches: mapMatches.length,
      averageTurns: round(average(mapMatches.map((match) => match.turnsPlayed))),
      wins: {
        left: leftWins,
        right: rightWins,
      },
      winRates: {
        left: round(rate(leftWins, mapMatches.length)),
        right: round(rate(rightWins, mapMatches.length)),
      },
      draws: mapMatches.filter((match) => match.winnerParticipantId === null).length,
    };
  });

  const buildResponseRate = (
    summaries: SelfPlayParticipantMatchSummary[],
    threatKey: keyof SelfPlayThreatResponseSnapshot,
    responseKey: keyof SelfPlayThreatResponseSnapshot,
  ): SelfPlayResponseRateSummary => {
    const opportunityCount = summaries.filter((summary) => Boolean(summary.threatResponse[threatKey])).length;
    const responseCount = summaries.filter((summary) => Boolean(summary.threatResponse[threatKey]) && Boolean(summary.threatResponse[responseKey])).length;
    return {
      rate: round(rate(responseCount, opportunityCount)),
      opportunityCount,
    };
  };

  const buildParticipantAggregate = (participantId: SelfPlayParticipantId) => {
    const summaries = matches.map((match) => match.participants[participantId]);
    const wins = matches.filter((match) => match.winnerParticipantId === participantId).length;
    const draws = matches.filter((match) => match.winnerParticipantId === null).length;
    const firstMatches = summaries.filter((summary) => summary.side === 'P1');
    const secondMatches = summaries.filter((summary) => summary.side === 'P2');
    const firstPlayerWins = matches.filter((match) => match.winnerParticipantId === participantId && match.participants[participantId].side === 'P1').length;
    const secondPlayerWins = matches.filter((match) => match.winnerParticipantId === participantId && match.participants[participantId].side === 'P2').length;
    const totalScoutAvailable = summaries.reduce((sum, summary) => sum + summary.scoutAvailable, 0);
    const totalScoutSurvivors = summaries.reduce((sum, summary) => sum + summary.scoutSurvivorCount, 0);
    const totalSupportAvailable = summaries.reduce((sum, summary) => sum + summary.supportAvailable, 0);
    const totalSupportSurvivors = summaries.reduce((sum, summary) => sum + summary.supportSurvivorCount, 0);
    const mapWinRates = mapBreakdown.filter((item) => item.matches > 0).map((item) => item.winRates[participantId]);
    const averageInactiveTurnRate = round(average(matches.map((match) => match.stall.inactiveTurnRates[participantId])));
    const averageLongestInactiveStreak = round(average(matches.map((match) => match.stall.longestInactiveStreaks[participantId])));
    const stallMatchRate = round(rate(matches.filter((match) =>
      match.stall.longestInactiveStreaks[participantId] >= 5 || match.stall.inactiveTurnRates[participantId] >= 0.6).length, matches.length));
    const resolvedProfileCounts = new Map<string, number>();
    const reasonCounts = new Map<string, number>();
    const objectiveCounts = { ...EMPTY_OBJECTIVE_BREAKDOWN };
    for (const summary of summaries) {
      const key = summary.resolvedAiProfile ?? summary.selectedAiProfile;
      resolvedProfileCounts.set(key, (resolvedProfileCounts.get(key) ?? 0) + 1);
      for (const objective of OBJECTIVES) {
        objectiveCounts[objective] += summary.objectiveBreakdown[objective];
      }
    }
    for (const match of matches) {
      for (const reason of match.stall.reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      }
    }
    const totalObjectiveTurns = OBJECTIVES.reduce((sum, objective) => sum + objectiveCounts[objective], 0);
    const objectiveRates = OBJECTIVES.reduce<SelfPlayObjectiveBreakdown>((acc, objective) => {
      acc[objective] = round(rate(objectiveCounts[objective], totalObjectiveTurns));
      return acc;
    }, { ...EMPTY_OBJECTIVE_BREAKDOWN });
    const dominantObjective = OBJECTIVES.reduce<SelfPlayObjective>(
      (best, objective) => objectiveCounts[objective] > objectiveCounts[best] ? objective : best,
      'capture',
    );
    return {
      label: config.participants[participantId].label,
      wins,
      draws,
      losses: matches.length - wins - draws,
      winRate: round(rate(wins, matches.length)),
      averageFunds: round(average(summaries.map((summary) => summary.funds))),
      averagePropertyCount: round(average(summaries.map((summary) => summary.propertyCount))),
      averageAliveUnitCount: round(average(summaries.map((summary) => summary.aliveUnitCount))),
      firstPlayerWins,
      firstPlayerMatches: firstMatches.length,
      firstPlayerWinRate: round(rate(firstPlayerWins, firstMatches.length)),
      secondPlayerWins,
      secondPlayerMatches: secondMatches.length,
      secondPlayerWinRate: round(rate(secondPlayerWins, secondMatches.length)),
      averagePropertyCaptures: round(average(summaries.map((summary) => summary.propertyCaptureCount))),
      averageProductionCount: round(average(summaries.map((summary) => summary.productionCount))),
      averageHighValueUnitsLost: round(average(summaries.map((summary) => summary.highValueUnitsLost))),
      averageHighValueEnemyUnitsDestroyed: round(average(summaries.map((summary) => summary.highValueEnemyUnitsDestroyed))),
      averageHighValueTradeBalance: round(average(summaries.map((summary) => summary.highValueEnemyUnitsDestroyed - summary.highValueUnitsLost))),
      averageLowSupplyUnitCount: round(average(summaries.map((summary) => summary.lowSupplyUnitCount))),
      averageHqCaptureTurn: averageNullable(matches
        .filter((match) => match.winnerParticipantId === participantId && match.victoryReason === 'HQ_CAPTURE')
        .map((match) => match.turnsPlayed)),
      scoutSurvivalRate: round(rate(totalScoutSurvivors, totalScoutAvailable)),
      supportSurvivalRate: round(rate(totalSupportSurvivors, totalSupportAvailable)),
      responseRates: {
        antiAir: buildResponseRate(summaries, 'enemyUsedAir', 'hadAirCounter'),
        antiDrone: buildResponseRate(summaries, 'enemyUsedDrone', 'hadDroneCounter'),
        antiSub: buildResponseRate(summaries, 'enemyUsedSubmarine', 'hadSubCounter'),
      },
      compositionShares: {
        frontline: round(average(summaries.map((summary) => summary.compositionShares.frontline))),
        scout: round(average(summaries.map((summary) => summary.compositionShares.scout))),
        support: round(average(summaries.map((summary) => summary.compositionShares.support))),
        air: round(average(summaries.map((summary) => summary.compositionShares.air))),
        naval: round(average(summaries.map((summary) => summary.compositionShares.naval))),
        drone: round(average(summaries.map((summary) => summary.compositionShares.drone))),
        other: round(average(summaries.map((summary) => summary.compositionShares.other))),
      },
      mapWinRateSpread: mapWinRates.length === 0 ? 0 : round(Math.max(...mapWinRates) - Math.min(...mapWinRates)),
      sideWinRateGap: round(Math.abs(rate(firstPlayerWins, firstMatches.length) - rate(secondPlayerWins, secondMatches.length))),
      averageInactiveTurnRate,
      averageLongestInactiveStreak,
      stallMatchRate,
      suspectedStallReasons: Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([reason]) => reason),
      objectiveRates,
      dominantObjective,
      resolvedProfileBreakdown: Array.from(resolvedProfileCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([profile, count]) => ({ profile, matches: count })),
    };
  };

  return {
    generatedAt: new Date().toISOString(),
    config: {
      maps: [...config.maps],
      matchCount: config.matchCount,
      maxTurns: config.maxTurns,
      seed: config.seed,
      fogOfWar: config.fogOfWar,
      swapSidesEveryMatch,
      participants: config.participants,
    },
    aggregate: {
      totalMatches: matches.length,
      averageTurns: round(average(matches.map((match) => match.turnsPlayed))),
      hqCaptureRate: round(rate(matches.filter((match) => match.victoryReason === 'HQ_CAPTURE').length, matches.length)),
      annihilationRate: round(rate(matches.filter((match) => match.victoryReason === 'ANNIHILATION').length, matches.length)),
      turnLimitRate: round(rate(matches.filter((match) => match.endedBy === 'turn_limit').length, matches.length)),
      participants: {
        left: buildParticipantAggregate('left'),
        right: buildParticipantAggregate('right'),
      },
      mapBreakdown,
    },
    matches,
  };
};

export const compareSelfPlayReports = (before: SelfPlaySeriesReport, after: SelfPlaySeriesReport): SelfPlayComparisonReport => {
  const beforeLeft = getParticipantAggregate(before, 'left');
  const beforeRight = getParticipantAggregate(before, 'right');
  const afterLeft = getParticipantAggregate(after, 'left');
  const afterRight = getParticipantAggregate(after, 'right');

  return {
    generatedAt: new Date().toISOString(),
    beforeGeneratedAt: before.generatedAt,
    afterGeneratedAt: after.generatedAt,
    turnDelta: round(after.aggregate.averageTurns - before.aggregate.averageTurns),
    hqCaptureRateDelta: round(after.aggregate.hqCaptureRate - before.aggregate.hqCaptureRate),
    annihilationRateDelta: round(after.aggregate.annihilationRate - before.aggregate.annihilationRate),
    turnLimitRateDelta: round(after.aggregate.turnLimitRate - before.aggregate.turnLimitRate),
    participants: {
      left: {
        label: afterLeft.label,
        winRateDelta: round(afterLeft.winRate - beforeLeft.winRate),
        averageFundsDelta: round(afterLeft.averageFunds - beforeLeft.averageFunds),
        averagePropertyCountDelta: round(afterLeft.averagePropertyCount - beforeLeft.averagePropertyCount),
        averageAliveUnitCountDelta: round(afterLeft.averageAliveUnitCount - beforeLeft.averageAliveUnitCount),
        firstPlayerWinRateDelta: round(afterLeft.firstPlayerWinRate - beforeLeft.firstPlayerWinRate),
        secondPlayerWinRateDelta: round(afterLeft.secondPlayerWinRate - beforeLeft.secondPlayerWinRate),
        averagePropertyCapturesDelta: round(afterLeft.averagePropertyCaptures - beforeLeft.averagePropertyCaptures),
        averageHighValueTradeBalanceDelta: round(afterLeft.averageHighValueTradeBalance - beforeLeft.averageHighValueTradeBalance),
        averageLowSupplyUnitCountDelta: round(afterLeft.averageLowSupplyUnitCount - beforeLeft.averageLowSupplyUnitCount),
        scoutSurvivalRateDelta: round(afterLeft.scoutSurvivalRate - beforeLeft.scoutSurvivalRate),
        supportSurvivalRateDelta: round(afterLeft.supportSurvivalRate - beforeLeft.supportSurvivalRate),
        antiAirResponseRateDelta: round(afterLeft.responseRates.antiAir.rate - beforeLeft.responseRates.antiAir.rate),
        antiDroneResponseRateDelta: round(afterLeft.responseRates.antiDrone.rate - beforeLeft.responseRates.antiDrone.rate),
        antiSubResponseRateDelta: round(afterLeft.responseRates.antiSub.rate - beforeLeft.responseRates.antiSub.rate),
        mapWinRateSpreadDelta: round(afterLeft.mapWinRateSpread - beforeLeft.mapWinRateSpread),
        sideWinRateGapDelta: round(afterLeft.sideWinRateGap - beforeLeft.sideWinRateGap),
        averageInactiveTurnRateDelta: round(afterLeft.averageInactiveTurnRate - beforeLeft.averageInactiveTurnRate),
        averageLongestInactiveStreakDelta: round(afterLeft.averageLongestInactiveStreak - beforeLeft.averageLongestInactiveStreak),
        stallMatchRateDelta: round(afterLeft.stallMatchRate - beforeLeft.stallMatchRate),
      },
      right: {
        label: afterRight.label,
        winRateDelta: round(afterRight.winRate - beforeRight.winRate),
        averageFundsDelta: round(afterRight.averageFunds - beforeRight.averageFunds),
        averagePropertyCountDelta: round(afterRight.averagePropertyCount - beforeRight.averagePropertyCount),
        averageAliveUnitCountDelta: round(afterRight.averageAliveUnitCount - beforeRight.averageAliveUnitCount),
        firstPlayerWinRateDelta: round(afterRight.firstPlayerWinRate - beforeRight.firstPlayerWinRate),
        secondPlayerWinRateDelta: round(afterRight.secondPlayerWinRate - beforeRight.secondPlayerWinRate),
        averagePropertyCapturesDelta: round(afterRight.averagePropertyCaptures - beforeRight.averagePropertyCaptures),
        averageHighValueTradeBalanceDelta: round(afterRight.averageHighValueTradeBalance - beforeRight.averageHighValueTradeBalance),
        averageLowSupplyUnitCountDelta: round(afterRight.averageLowSupplyUnitCount - beforeRight.averageLowSupplyUnitCount),
        scoutSurvivalRateDelta: round(afterRight.scoutSurvivalRate - beforeRight.scoutSurvivalRate),
        supportSurvivalRateDelta: round(afterRight.supportSurvivalRate - beforeRight.supportSurvivalRate),
        antiAirResponseRateDelta: round(afterRight.responseRates.antiAir.rate - beforeRight.responseRates.antiAir.rate),
        antiDroneResponseRateDelta: round(afterRight.responseRates.antiDrone.rate - beforeRight.responseRates.antiDrone.rate),
        antiSubResponseRateDelta: round(afterRight.responseRates.antiSub.rate - beforeRight.responseRates.antiSub.rate),
        mapWinRateSpreadDelta: round(afterRight.mapWinRateSpread - beforeRight.mapWinRateSpread),
        sideWinRateGapDelta: round(afterRight.sideWinRateGap - beforeRight.sideWinRateGap),
        averageInactiveTurnRateDelta: round(afterRight.averageInactiveTurnRate - beforeRight.averageInactiveTurnRate),
        averageLongestInactiveStreakDelta: round(afterRight.averageLongestInactiveStreak - beforeRight.averageLongestInactiveStreak),
        stallMatchRateDelta: round(afterRight.stallMatchRate - beforeRight.stallMatchRate),
      },
    },
  };
};

const formatPercent = (value: number): string => `${round(value * 100, 1)}%`;
const formatResponseRate = (summary: SelfPlayResponseRateSummary): string => `${formatPercent(summary.rate)} (${summary.opportunityCount}試合)`;
const formatNullableTurn = (value: number | null): string => value == null ? '該当なし' : `${value}ターン`;
const formatObjectiveSummary = (participant: SelfPlayParticipantAggregate): string =>
  `dominant ${participant.dominantObjective} / capture ${formatPercent(participant.objectiveRates.capture)} / hq_push ${formatPercent(participant.objectiveRates.hq_push)} / regroup ${formatPercent(participant.objectiveRates.regroup)} / defend_hq ${formatPercent(participant.objectiveRates.defend_hq)}`;

const renderParticipantAggregateLines = (participant: SelfPlayParticipantAggregate): string[] => [
  `### ${participant.label}`,
  `- 勝率: ${formatPercent(participant.winRate)} (${participant.wins}勝 ${participant.draws}分 ${participant.losses}敗)`,
  `- 先手勝率: ${formatPercent(participant.firstPlayerWinRate)} / 後手勝率: ${formatPercent(participant.secondPlayerWinRate)}`,
  `- 平均資金: ${participant.averageFunds} / 平均施設数: ${participant.averagePropertyCount} / 平均生存数: ${participant.averageAliveUnitCount}`,
  `- 平均占領完了回数: ${participant.averagePropertyCaptures} / 平均生産回数: ${participant.averageProductionCount}`,
  `- 高額撃破: ${participant.averageHighValueEnemyUnitsDestroyed} / 高額損失: ${participant.averageHighValueUnitsLost} / 高額収支: ${participant.averageHighValueTradeBalance}`,
  `- 平均低補給残存数: ${participant.averageLowSupplyUnitCount} / 平均HQ制圧ターン: ${formatNullableTurn(participant.averageHqCaptureTurn)}`,
  `- 平均停滞ターン率: ${formatPercent(participant.averageInactiveTurnRate)} / 平均最長停滞連続: ${participant.averageLongestInactiveStreak} / stall試合率: ${formatPercent(participant.stallMatchRate)}`,
  `- stall要因候補: ${participant.suspectedStallReasons.length > 0 ? participant.suspectedStallReasons.join(', ') : '顕著な停滞なし'}`,
  `- objective内訳: capture ${formatPercent(participant.objectiveRates.capture)} / hq_push ${formatPercent(participant.objectiveRates.hq_push)} / regroup ${formatPercent(participant.objectiveRates.regroup)} / defend_hq ${formatPercent(participant.objectiveRates.defend_hq)} / dominant ${participant.dominantObjective}`,
  `- 偵察生存率: ${formatPercent(participant.scoutSurvivalRate)} / 補給生存率: ${formatPercent(participant.supportSurvivalRate)}`,
  `- 対空応答率: ${formatResponseRate(participant.responseRates.antiAir)}`,
  `- 対ドローン応答率: ${formatResponseRate(participant.responseRates.antiDrone)}`,
  `- 対潜応答率: ${formatResponseRate(participant.responseRates.antiSub)}`,
  `- マップ勝率差: ${formatPercent(participant.mapWinRateSpread)} / 先後勝率差: ${formatPercent(participant.sideWinRateGap)}`,
  `- 終盤編成: 前線${formatPercent(participant.compositionShares.frontline)} / 偵察${formatPercent(participant.compositionShares.scout)} / 補給${formatPercent(participant.compositionShares.support)} / 空${formatPercent(participant.compositionShares.air)} / 海${formatPercent(participant.compositionShares.naval)} / ドローン${formatPercent(participant.compositionShares.drone)}`,
  `- 解決プロファイル: ${participant.resolvedProfileBreakdown.length > 0 ? participant.resolvedProfileBreakdown.map((item) => `${item.profile}(${item.matches})`).join(', ') : 'なし'}`,
  '',
];

export const renderSelfPlayMarkdown = (report: SelfPlaySeriesReport): string => [
  '# AI自己対戦レポート',
  '',
  `生成日時: ${report.generatedAt}`,
  '',
  '## 実行条件',
  `- 試行回数: ${report.config.matchCount}`,
  `- マップ: ${report.config.maps.join(', ')}`,
  `- 最大ターン: ${report.config.maxTurns}`,
  `- Fog of War: ${report.config.fogOfWar ? 'あり' : 'なし'}`,
  `- left: ${report.config.participants.left.label} / ${report.config.participants.left.difficulty} / ${report.config.participants.left.selectedAiProfile}`,
  `- right: ${report.config.participants.right.label} / ${report.config.participants.right.difficulty} / ${report.config.participants.right.selectedAiProfile}`,
  '',
  '## 集計',
  `- 平均ターン数: ${report.aggregate.averageTurns}`,
  `- HQ制圧率: ${formatPercent(report.aggregate.hqCaptureRate)}`,
  `- 全滅率: ${formatPercent(report.aggregate.annihilationRate)}`,
  `- ターン上限率: ${formatPercent(report.aggregate.turnLimitRate)}`,
  `- ${report.aggregate.participants.left.label} 勝率: ${formatPercent(report.aggregate.participants.left.winRate)}`,
  `- ${report.aggregate.participants.right.label} 勝率: ${formatPercent(report.aggregate.participants.right.winRate)}`,
  `- ${report.aggregate.participants.left.label} objective要約: ${formatObjectiveSummary(report.aggregate.participants.left)}`,
  `- ${report.aggregate.participants.right.label} objective要約: ${formatObjectiveSummary(report.aggregate.participants.right)}`,
  '',
  '## nightmare調整向け詳細指標',
  ...renderParticipantAggregateLines(report.aggregate.participants.left),
  ...renderParticipantAggregateLines(report.aggregate.participants.right),
  '## マップ別',
  ...report.aggregate.mapBreakdown.map((item) => `- ${item.mapName}: ${item.matches}試合 / 平均${item.averageTurns}ターン / left=${item.wins.left}(${formatPercent(item.winRates.left)}) / right=${item.wins.right}(${formatPercent(item.winRates.right)}) / draw=${item.draws}`),
  '',
  '## 試合一覧',
  ...report.matches.map((match) => `- Match ${match.matchIndex} ${match.mapName}: ${match.winnerParticipantId ? `${match.participants[match.winnerParticipantId].label}勝利` : '引き分け'} / ${match.victoryReason} / ${match.turnsPlayed}ターン`),
  '',
].join('\n');

export const renderSelfPlayComparisonMarkdown = (comparison: SelfPlayComparisonReport): string => [
  '# AI自己対戦 差分レポート',
  '',
  `生成日時: ${comparison.generatedAt}`,
  `- before: ${comparison.beforeGeneratedAt}`,
  `- after: ${comparison.afterGeneratedAt}`,
  '',
  '## 全体差分',
  `- 平均ターン差: ${comparison.turnDelta}`,
  `- HQ制圧率差: ${formatPercent(comparison.hqCaptureRateDelta)}`,
  `- 全滅率差: ${formatPercent(comparison.annihilationRateDelta)}`,
  `- ターン上限率差: ${formatPercent(comparison.turnLimitRateDelta)}`,
  '',
  '## 参加者差分',
  `- ${comparison.participants.left.label}: 勝率差=${formatPercent(comparison.participants.left.winRateDelta)} / 先手差=${formatPercent(comparison.participants.left.firstPlayerWinRateDelta)} / 後手差=${formatPercent(comparison.participants.left.secondPlayerWinRateDelta)} / 高額収支差=${comparison.participants.left.averageHighValueTradeBalanceDelta} / 低補給差=${comparison.participants.left.averageLowSupplyUnitCountDelta}`,
  `- ${comparison.participants.left.label}: 停滞率差=${formatPercent(comparison.participants.left.averageInactiveTurnRateDelta)} / 最長停滞差=${comparison.participants.left.averageLongestInactiveStreakDelta} / stall試合差=${formatPercent(comparison.participants.left.stallMatchRateDelta)}`,
  `- ${comparison.participants.left.label}: 偵察差=${formatPercent(comparison.participants.left.scoutSurvivalRateDelta)} / 補給差=${formatPercent(comparison.participants.left.supportSurvivalRateDelta)} / 対空差=${formatPercent(comparison.participants.left.antiAirResponseRateDelta)} / 対ドローン差=${formatPercent(comparison.participants.left.antiDroneResponseRateDelta)} / 対潜差=${formatPercent(comparison.participants.left.antiSubResponseRateDelta)}`,
  `- ${comparison.participants.right.label}: 勝率差=${formatPercent(comparison.participants.right.winRateDelta)} / 先手差=${formatPercent(comparison.participants.right.firstPlayerWinRateDelta)} / 後手差=${formatPercent(comparison.participants.right.secondPlayerWinRateDelta)} / 高額収支差=${comparison.participants.right.averageHighValueTradeBalanceDelta} / 低補給差=${comparison.participants.right.averageLowSupplyUnitCountDelta}`,
  `- ${comparison.participants.right.label}: 停滞率差=${formatPercent(comparison.participants.right.averageInactiveTurnRateDelta)} / 最長停滞差=${comparison.participants.right.averageLongestInactiveStreakDelta} / stall試合差=${formatPercent(comparison.participants.right.stallMatchRateDelta)}`,
  `- ${comparison.participants.right.label}: 偵察差=${formatPercent(comparison.participants.right.scoutSurvivalRateDelta)} / 補給差=${formatPercent(comparison.participants.right.supportSurvivalRateDelta)} / 対空差=${formatPercent(comparison.participants.right.antiAirResponseRateDelta)} / 対ドローン差=${formatPercent(comparison.participants.right.antiDroneResponseRateDelta)} / 対潜差=${formatPercent(comparison.participants.right.antiSubResponseRateDelta)}`,
  '',
].join('\n');

const sortProposalTargetIds = (report: SelfPlaySeriesReport): SelfPlayParticipantId[] => {
  const ids: SelfPlayParticipantId[] = ['left', 'right'];
  return ids.sort((a, b) => {
    const aNightmare = report.config.participants[a].difficulty === 'nightmare' ? 0 : 1;
    const bNightmare = report.config.participants[b].difficulty === 'nightmare' ? 0 : 1;
    if (aNightmare !== bNightmare) return aNightmare - bNightmare;
    return a.localeCompare(b);
  });
};

export const buildSelfPlayImprovementProposal = (
  report: SelfPlaySeriesReport,
  comparison?: SelfPlayComparisonReport,
): SelfPlayImprovementProposal => {
  const targets = sortProposalTargetIds(report).map((participantId) => {
    const config = report.config.participants[participantId];
    const aggregate = getParticipantAggregate(report, participantId);
    const deltas = comparison?.participants[participantId];
    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];
    const nextExperiments: string[] = [];

    if (aggregate.winRate >= 0.6) strengths.push(`勝率 ${formatPercent(aggregate.winRate)} で、現状の総合強度は高めです。`);
    else if (aggregate.winRate < 0.5) {
      concerns.push(`勝率 ${formatPercent(aggregate.winRate)} で、基準の 50% を下回っています。`);
      recommendations.push('攻撃評価と生産評価の両方を見直し、序盤から中盤の勝ち筋に寄る重みを強める。');
    }

    if (aggregate.sideWinRateGap <= 0.12) strengths.push(`先後勝率差 ${formatPercent(aggregate.sideWinRateGap)} で、手番差に比較的安定しています。`);
    else {
      concerns.push(`先後勝率差 ${formatPercent(aggregate.sideWinRateGap)} が大きく、先手依存または後手脆弱性があります。`);
      recommendations.push('初動の展開ルーチンを見直し、後手時の偵察・防衛・施設確保の重みを上げる。');
    }

    if (aggregate.mapWinRateSpread <= 0.18) strengths.push(`マップ勝率差 ${formatPercent(aggregate.mapWinRateSpread)} で、地形相性は比較的安定しています。`);
    else {
      concerns.push(`マップ勝率差 ${formatPercent(aggregate.mapWinRateSpread)} が大きく、特定マップへの相性差が強いです。`);
      recommendations.push('マップ依存の弱点を切り出し、海戦・航空戦・施設密集マップで別重みを検討する。');
    }

    if (aggregate.averageHighValueTradeBalance >= 0) strengths.push(`高額ユニット収支 ${aggregate.averageHighValueTradeBalance} で、高額戦力の扱いは概ね良好です。`);
    else {
      concerns.push(`高額ユニット収支 ${aggregate.averageHighValueTradeBalance} で、不利交換が出ています。`);
      recommendations.push('高額ユニットの前進条件を厳格化し、退路と補給可能性の評価を強める。');
    }

    if (aggregate.averageLowSupplyUnitCount <= 0.5) strengths.push(`平均低補給残存数 ${aggregate.averageLowSupplyUnitCount} で、補給運用は安定しています。`);
    else {
      concerns.push(`平均低補給残存数 ${aggregate.averageLowSupplyUnitCount} で、補給切れ寸前の残存が多めです。`);
      recommendations.push('補給役の生産優先度と、低補給時の帰投・再補給ルーチンを強化する。');
    }

    if (report.config.fogOfWar && aggregate.scoutSurvivalRate < 0.5) {
      concerns.push(`Fog of War 下の偵察生存率 ${formatPercent(aggregate.scoutSurvivalRate)} が低いです。`);
      recommendations.push('偵察役と主力役の分離を進め、索敵ユニットの安全距離評価を強める。');
    } else if (aggregate.scoutSurvivalRate >= 0.5) strengths.push(`偵察生存率 ${formatPercent(aggregate.scoutSurvivalRate)} で、索敵役の維持は悪くありません。`);

    if (aggregate.supportSurvivalRate < 0.5 && aggregate.averageLowSupplyUnitCount > 0.5) {
      concerns.push(`補給生存率 ${formatPercent(aggregate.supportSurvivalRate)} が低く、補給役が前線で失われています。`);
      recommendations.push('補給ユニットの護衛条件と後方待機ロジックを強化する。');
    }

    if (aggregate.responseRates.antiAir.opportunityCount > 0 && aggregate.responseRates.antiAir.rate < 0.7) {
      concerns.push(`対空応答率 ${formatPercent(aggregate.responseRates.antiAir.rate)} が低く、航空対応が不足しています。`);
      recommendations.push('敵航空の確認時に FIGHTER / ANTI_AIR / MISSILE_AA 系の生産閾値を早める。');
    }
    if (aggregate.responseRates.antiDrone.opportunityCount > 0 && aggregate.responseRates.antiDrone.rate < 0.7) {
      concerns.push(`対ドローン応答率 ${formatPercent(aggregate.responseRates.antiDrone.rate)} が低く、ドローン対処が遅れています。`);
      recommendations.push('COUNTER_DRONE_AA と護衛前進の評価を強め、ドローン戦への切替判定を早める。');
    }
    if (aggregate.responseRates.antiSub.opportunityCount > 0 && aggregate.responseRates.antiSub.rate < 0.7) {
      concerns.push(`対潜応答率 ${formatPercent(aggregate.responseRates.antiSub.rate)} が低く、海戦で潜水艦に押されやすいです。`);
      recommendations.push('DESTROYER / ATTACKER / CARRIER の対潜優先度を引き上げ、海上索敵を厚くする。');
    }

    if (aggregate.averagePropertyCaptures < 1 && report.aggregate.turnLimitRate > 0.25) {
      concerns.push(`平均占領完了回数 ${aggregate.averagePropertyCaptures} に対してターン上限率 ${formatPercent(report.aggregate.turnLimitRate)} が高く、締め切り性能が弱いです。`);
      recommendations.push('占領役の温存と HQ 圧力の両立を見直し、中盤以降の施設圧迫を強める。');
    }

    if (aggregate.stallMatchRate >= 0.5 || aggregate.averageInactiveTurnRate >= 0.4) {
      concerns.push(`stall試合率 ${formatPercent(aggregate.stallMatchRate)} / 平均停滞ターン率 ${formatPercent(aggregate.averageInactiveTurnRate)} で、自己対戦中の行動停止が目立ちます。`);
      recommendations.push('調整前に stall detector の内訳を確認し、移動・生産・占領のどこで止まっているかを優先的に切り分ける。');
      if (aggregate.suspectedStallReasons.length > 0) {
        recommendations.push(`主な stall 要因候補: ${aggregate.suspectedStallReasons.join(' / ')}`);
      }
      nextExperiments.push('1試合分の turnActivities を確認し、最初に主要行動ゼロが連続し始めるターンを特定する。');
    }

    if (deltas?.winRateDelta != null) {
      if (deltas.winRateDelta >= 0.05) strengths.push(`比較対象比で勝率が ${formatPercent(deltas.winRateDelta)} 改善しています。`);
      if (deltas.winRateDelta <= -0.05) {
        concerns.push(`比較対象比で勝率が ${formatPercent(deltas.winRateDelta)} 悪化しています。`);
        recommendations.push('直近改修の回帰を疑い、攻撃・生産・移動評価の差分を切り戻し観点で点検する。');
      }
      if (deltas.averageLowSupplyUnitCountDelta > 0.3) concerns.push(`比較対象比で低補給残存数が ${deltas.averageLowSupplyUnitCountDelta} 増えています。`);
      if (deltas.mapWinRateSpreadDelta > 0.1) concerns.push(`比較対象比でマップ勝率差が ${formatPercent(deltas.mapWinRateSpreadDelta)} 広がっています。`);
    }

    if (recommendations.length === 0) recommendations.push('現状の重みは大崩れしていないため、局所的なマップ別チューニングから進める。');
    nextExperiments.push('同条件で 50 試合以上に増やし、先後差とマップ差が再現するか確認する。');
    if (report.config.fogOfWar) nextExperiments.push('Fog of War の有無を切り替えて、偵察生存率と勝率の相関を比較する。');
    if (aggregate.responseRates.antiAir.opportunityCount > 0 || aggregate.responseRates.antiDrone.opportunityCount > 0 || aggregate.responseRates.antiSub.opportunityCount > 0) {
      nextExperiments.push('航空・ドローン・潜水艦を含む専用マップで対処成功率の再計測を行う。');
    }

    return {
      participantId,
      label: config.label,
      difficulty: config.difficulty,
      selectedAiProfile: config.selectedAiProfile,
      strengths: strengths.length > 0 ? strengths : ['大きな強みは未確定ですが、現状は致命的な崩れも見えていません。'],
      concerns: concerns.length > 0 ? concerns : ['今回の試行数では深刻なボトルネックは見えていません。'],
      recommendations,
      nextExperiments,
    };
  });

  const summary: string[] = [];
  const nightmareTargets = targets.filter((target) => target.difficulty === 'nightmare');
  if (nightmareTargets.length > 0) summary.push(`nightmare 対象は ${nightmareTargets.map((target) => target.label).join(', ')} です。詳細指標を優先して改善候補を抽出しています。`);
  summary.push(`平均ターン ${report.aggregate.averageTurns} / HQ制圧率 ${formatPercent(report.aggregate.hqCaptureRate)} / ターン上限率 ${formatPercent(report.aggregate.turnLimitRate)} を基準に総評しています。`);
  if (comparison) summary.push('比較対象との差分も加味し、勝率・補給・対策応答率の回帰を優先検知しています。');

  return {
    generatedAt: new Date().toISOString(),
    basedOnGeneratedAt: report.generatedAt,
    comparisonGeneratedAt: comparison?.generatedAt,
    summary,
    targets,
  };
};

export const renderSelfPlayImprovementProposalMarkdown = (proposal: SelfPlayImprovementProposal): string => [
  '# AI自己対戦 改善提案',
  '',
  `生成日時: ${proposal.generatedAt}`,
  `- 対象レポート: ${proposal.basedOnGeneratedAt}`,
  ...(proposal.comparisonGeneratedAt ? [`- 差分参照: ${proposal.comparisonGeneratedAt}`] : []),
  '',
  '## 要約',
  ...proposal.summary.map((line) => `- ${line}`),
  '',
  ...proposal.targets.flatMap((target) => [
    `## ${target.label}`,
    `- 参加者: ${target.participantId}`,
    `- 難易度: ${target.difficulty}`,
    `- プロファイル: ${target.selectedAiProfile}`,
    '',
    '### 強み',
    ...target.strengths.map((line) => `- ${line}`),
    '',
    '### 課題',
    ...target.concerns.map((line) => `- ${line}`),
    '',
    '### 改善仮説',
    ...target.recommendations.map((line) => `- ${line}`),
    '',
    '### 次の検証',
    ...target.nextExperiments.map((line) => `- ${line}`),
    '',
  ]),
].join('\n');
