import type { GameSettings, SelectedAiProfile } from '../../app/types';
import { SKIRMISH_MAP_METAS } from '../../data/skirmishMaps';
import { createInitialGameState } from '../engine/createInitialGameState';
import { type AiDifficulty, runAiTurn } from '../engine/aiTurn';
import type { VictoryReason } from '../rules/victory';
import type { PlayerId } from '../types/game';
import type { GameState } from '../types/state';

export type SelfPlayParticipantId = 'left' | 'right';
export type SelfPlaySide = PlayerId;
type ResolvedSelfPlayProfile = Exclude<SelectedAiProfile, 'auto' | 'adaptive'>;

export type SelfPlayParticipantConfig = {
  id: SelfPlayParticipantId;
  label: string;
  difficulty: AiDifficulty;
  selectedAiProfile: SelectedAiProfile;
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
  victoryReason: VictoryReason | 'TURN_LIMIT';
  participants: Record<SelfPlayParticipantId, {
    label: string;
    side: SelfPlaySide;
    difficulty: AiDifficulty;
    selectedAiProfile: SelectedAiProfile;
    resolvedAiProfile: ResolvedSelfPlayProfile | null;
    funds: number;
    propertyCount: number;
    aliveUnitCount: number;
  }>;
  majorEvents: Array<{ turn: number; playerId: PlayerId; action: string; detail?: string }>;
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
    participants: Record<SelfPlayParticipantId, {
      label: string;
      wins: number;
      draws: number;
      losses: number;
      winRate: number;
      averageFunds: number;
      averagePropertyCount: number;
      averageAliveUnitCount: number;
    }>;
    mapBreakdown: Array<{
      mapId: string;
      mapName: string;
      matches: number;
      averageTurns: number;
      wins: Record<SelfPlayParticipantId, number>;
      draws: number;
    }>;
  };
  matches: SelfPlayMatchResult[];
};

export type SelfPlayComparisonReport = {
  generatedAt: string;
  beforeGeneratedAt: string;
  afterGeneratedAt: string;
  turnDelta: number;
  hqCaptureRateDelta: number;
  annihilationRateDelta: number;
  turnLimitRateDelta: number;
  participants: Record<SelfPlayParticipantId, {
    label: string;
    winRateDelta: number;
    averageFundsDelta: number;
    averagePropertyCountDelta: number;
    averageAliveUnitCountDelta: number;
  }>;
};

const CAPTURABLE_TERRAINS = new Set(['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT']);
const IMPORTANT_ACTIONS = new Set(['CAPTURE', 'ATTACK', 'ATTACK_TILE', 'FOG_ENCOUNTER', 'PRODUCE_UNIT']);

const round = (value: number, digits = 3): number => {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
};

const average = (values: number[]): number => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

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

const countAliveUnits = (state: GameState, playerId: PlayerId): number =>
  Object.values(state.units).filter((unit) => unit.owner === playerId && unit.hp > 0).length;

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

  let state = createInitialGameState({
    mapId: config.mapId,
    settings: createSelfPlaySettings(config.fogOfWar, config.baseSettings),
  });

  while (!state.winner && state.turn <= config.maxTurns) {
    const side = state.currentPlayerId;
    const participantId = sideAssignments[side];
    const participant = config.participants[participantId];
    const nextState = runAiTurn(buildTurnState(state, side, participant, resolvedProfiles[participantId]), {
      difficulty: participant.difficulty,
      deps: { rng },
    });
    resolvedProfiles[participantId] = (nextState.resolvedAiProfile ?? null) as ResolvedSelfPlayProfile | null;
    state = JSON.parse(JSON.stringify(nextState)) as GameState;
  }

  const leftSide: SelfPlaySide = sideAssignments.P1 === 'left' ? 'P1' : 'P2';
  const rightSide: SelfPlaySide = sideAssignments.P1 === 'right' ? 'P1' : 'P2';

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
    participants: {
      left: {
        label: config.participants.left.label,
        side: leftSide,
        difficulty: config.participants.left.difficulty,
        selectedAiProfile: config.participants.left.selectedAiProfile,
        resolvedAiProfile: resolvedProfiles.left,
        funds: state.players[leftSide].funds,
        propertyCount: countProperties(state, leftSide),
        aliveUnitCount: countAliveUnits(state, leftSide),
      },
      right: {
        label: config.participants.right.label,
        side: rightSide,
        difficulty: config.participants.right.difficulty,
        selectedAiProfile: config.participants.right.selectedAiProfile,
        resolvedAiProfile: resolvedProfiles.right,
        funds: state.players[rightSide].funds,
        propertyCount: countProperties(state, rightSide),
        aliveUnitCount: countAliveUnits(state, rightSide),
      },
    },
    majorEvents: state.actionLog
      .filter((entry) => IMPORTANT_ACTIONS.has(entry.action))
      .slice(-8)
      .map((entry) => ({ turn: entry.turn, playerId: entry.playerId, action: entry.action, detail: entry.detail })),
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
    return {
      mapId,
      mapName: getMapName(mapId),
      matches: mapMatches.length,
      averageTurns: round(average(mapMatches.map((match) => match.turnsPlayed))),
      wins: {
        left: mapMatches.filter((match) => match.winnerParticipantId === 'left').length,
        right: mapMatches.filter((match) => match.winnerParticipantId === 'right').length,
      },
      draws: mapMatches.filter((match) => match.winnerParticipantId === null).length,
    };
  });

  const buildParticipantAggregate = (participantId: SelfPlayParticipantId) => {
    const summaries = matches.map((match) => match.participants[participantId]);
    const wins = matches.filter((match) => match.winnerParticipantId === participantId).length;
    const draws = matches.filter((match) => match.winnerParticipantId === null).length;
    return {
      label: config.participants[participantId].label,
      wins,
      draws,
      losses: matches.length - wins - draws,
      winRate: round(wins / Math.max(1, matches.length)),
      averageFunds: round(average(summaries.map((summary) => summary.funds))),
      averagePropertyCount: round(average(summaries.map((summary) => summary.propertyCount))),
      averageAliveUnitCount: round(average(summaries.map((summary) => summary.aliveUnitCount))),
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
      hqCaptureRate: round(matches.filter((match) => match.victoryReason === 'HQ_CAPTURE').length / Math.max(1, matches.length)),
      annihilationRate: round(matches.filter((match) => match.victoryReason === 'ANNIHILATION').length / Math.max(1, matches.length)),
      turnLimitRate: round(matches.filter((match) => match.endedBy === 'turn_limit').length / Math.max(1, matches.length)),
      participants: {
        left: buildParticipantAggregate('left'),
        right: buildParticipantAggregate('right'),
      },
      mapBreakdown,
    },
    matches,
  };
};

export const compareSelfPlayReports = (before: SelfPlaySeriesReport, after: SelfPlaySeriesReport): SelfPlayComparisonReport => ({
  generatedAt: new Date().toISOString(),
  beforeGeneratedAt: before.generatedAt,
  afterGeneratedAt: after.generatedAt,
  turnDelta: round(after.aggregate.averageTurns - before.aggregate.averageTurns),
  hqCaptureRateDelta: round(after.aggregate.hqCaptureRate - before.aggregate.hqCaptureRate),
  annihilationRateDelta: round(after.aggregate.annihilationRate - before.aggregate.annihilationRate),
  turnLimitRateDelta: round(after.aggregate.turnLimitRate - before.aggregate.turnLimitRate),
  participants: {
    left: {
      label: after.aggregate.participants.left.label,
      winRateDelta: round(after.aggregate.participants.left.winRate - before.aggregate.participants.left.winRate),
      averageFundsDelta: round(after.aggregate.participants.left.averageFunds - before.aggregate.participants.left.averageFunds),
      averagePropertyCountDelta: round(after.aggregate.participants.left.averagePropertyCount - before.aggregate.participants.left.averagePropertyCount),
      averageAliveUnitCountDelta: round(after.aggregate.participants.left.averageAliveUnitCount - before.aggregate.participants.left.averageAliveUnitCount),
    },
    right: {
      label: after.aggregate.participants.right.label,
      winRateDelta: round(after.aggregate.participants.right.winRate - before.aggregate.participants.right.winRate),
      averageFundsDelta: round(after.aggregate.participants.right.averageFunds - before.aggregate.participants.right.averageFunds),
      averagePropertyCountDelta: round(after.aggregate.participants.right.averagePropertyCount - before.aggregate.participants.right.averagePropertyCount),
      averageAliveUnitCountDelta: round(after.aggregate.participants.right.averageAliveUnitCount - before.aggregate.participants.right.averageAliveUnitCount),
    },
  },
});

const formatPercent = (value: number): string => `${round(value * 100, 1)}%`;

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
  '',
  '## マップ別',
  ...report.aggregate.mapBreakdown.map((item) => `- ${item.mapName}: ${item.matches}試合 / 平均${item.averageTurns}ターン / left=${item.wins.left} / right=${item.wins.right} / draw=${item.draws}`),
  '',
  '## 試合一覧',
  ...report.matches.flatMap((match) => [
    `- Match ${match.matchIndex} ${match.mapName}: ${match.winnerParticipantId ? `${match.participants[match.winnerParticipantId].label}勝利` : '引き分け'} / ${match.victoryReason} / ${match.turnsPlayed}ターン`,
  ]),
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
  `- ${comparison.participants.left.label}: 勝率差=${formatPercent(comparison.participants.left.winRateDelta)} / 資金差=${comparison.participants.left.averageFundsDelta} / 施設差=${comparison.participants.left.averagePropertyCountDelta}`,
  `- ${comparison.participants.right.label}: 勝率差=${formatPercent(comparison.participants.right.winRateDelta)} / 資金差=${comparison.participants.right.averageFundsDelta} / 施設差=${comparison.participants.right.averagePropertyCountDelta}`,
  '',
].join('\n');
