import { manhattanDistance } from '@/utils/coord';
import { runAiTurn } from '@core/engine/aiTurn';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { GameState } from '@core/types/state';
import type { UnitState } from '@core/types/unit';

const BASE_SETTINGS = {
  aiDifficulty: 'normal' as const,
  humanPlayerSide: 'P1' as const,
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
};

const makeUnit = (overrides: Partial<UnitState> & Pick<UnitState, 'id' | 'owner' | 'type'>): UnitState => {
  const definition = UNIT_DEFINITIONS[overrides.type];

  return {
    id: overrides.id,
    owner: overrides.owner,
    type: overrides.type,
    hp: overrides.hp ?? 10,
    fuel: overrides.fuel ?? definition.maxFuel,
    ammo: overrides.ammo ?? definition.maxAmmo,
    position: overrides.position ?? { x: 0, y: 0 },
    moved: overrides.moved ?? false,
    acted: overrides.acted ?? false,
    lastMovePath: overrides.lastMovePath ?? [],
  };
};

const createAiState = (difficulty: 'easy' | 'normal'): GameState => {
  const state = createInitialGameState({
    settings: {
      ...BASE_SETTINGS,
      aiDifficulty: difficulty,
    },
  });
  state.currentPlayerId = 'P2';
  return state;
};

describe('aiターンの挙動テスト', () => {
  it('Easy難易度でAI手番を正常に実行できる', () => {
    const state = createAiState('easy');

    const next = runAiTurn(state, { difficulty: 'easy', deps: { rng: () => 0.5 } });

    expect(next.currentPlayerId).toBe('P1');
    expect(next.turn).toBe(2);
    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'END_TURN')).toBe(true);
  });

  it('Normal難易度でAI手番を正常に実行できる', () => {
    const state = createAiState('normal');

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    expect(next.currentPlayerId).toBe('P1');
    expect(next.turn).toBe(2);
    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'END_TURN')).toBe(true);
  });

  it('Normalは占領可能なら占領を優先する', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 0;

    state.units = {
      p2_inf: makeUnit({
        id: 'p2_inf',
        owner: 'P2',
        type: 'INFANTRY',
        position: { x: 2, y: 2 },
      }),
      p1_tank: makeUnit({
        id: 'p1_tank',
        owner: 'P1',
        type: 'TANK',
        position: { x: 2, y: 1 },
      }),
    };

    state.map.tiles['2,2'] = {
      coord: { x: 2, y: 2 },
      terrainType: 'CITY',
      owner: 'P1',
      capturePoints: 20,
    };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'CAPTURE' && log.detail?.includes('p2_inf'))).toBe(true);
    expect(next.map.tiles['2,2']?.capturePoints).toBe(10);
  });

  it('Normalの間接は危険距離へ不用意に近づかない', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 0;

    state.units = {
      p2_art: makeUnit({
        id: 'p2_art',
        owner: 'P2',
        type: 'ARTILLERY',
        position: { x: 0, y: 2 },
      }),
      p1_tank: makeUnit({
        id: 'p1_tank',
        owner: 'P1',
        type: 'TANK',
        position: { x: 4, y: 2 },
      }),
    };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    const artillery = next.units.p2_art;
    const enemy = next.units.p1_tank;
    expect(artillery).toBeDefined();
    expect(enemy).toBeDefined();
    expect(manhattanDistance(artillery.position, enemy.position)).toBeGreaterThanOrEqual(2);
  });

  it('Normalの生産は脅威ユニットに対して歩兵を優先する', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 10000;

    state.units = {
      p1_tank: makeUnit({
        id: 'p1_tank',
        owner: 'P1',
        type: 'TANK',
        position: { x: 1, y: 1 },
      }),
    };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');
    expect(produceLogs.length).toBeGreaterThan(0);
    expect(produceLogs.some((log) => log.detail?.startsWith('INFANTRY'))).toBe(true);
  });

  it('Normalの生産は敵航空ユニットがいる場合に対空を優先する', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 9000;

    state.units = {
      p2_inf_1: makeUnit({
        id: 'p2_inf_1',
        owner: 'P2',
        type: 'INFANTRY',
        position: { x: 0, y: 4 },
        moved: true,
        acted: true,
      }),
      p2_inf_2: makeUnit({
        id: 'p2_inf_2',
        owner: 'P2',
        type: 'INFANTRY',
        position: { x: 1, y: 4 },
        moved: true,
        acted: true,
      }),
      p2_inf_3: makeUnit({
        id: 'p2_inf_3',
        owner: 'P2',
        type: 'INFANTRY',
        position: { x: 2, y: 4 },
        moved: true,
        acted: true,
      }),
      p2_inf_4: makeUnit({
        id: 'p2_inf_4',
        owner: 'P2',
        type: 'INFANTRY',
        position: { x: 3, y: 4 },
        moved: true,
        acted: true,
      }),
      p2_inf_5: makeUnit({
        id: 'p2_inf_5',
        owner: 'P2',
        type: 'INFANTRY',
        position: { x: 0, y: 3 },
        moved: true,
        acted: true,
      }),
      p1_bomber: makeUnit({
        id: 'p1_bomber',
        owner: 'P1',
        type: 'BOMBER',
        position: { x: 2, y: 1 },
      }),
    };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');
    expect(produceLogs.length).toBeGreaterThan(0);
    expect(produceLogs.some((log) => /^(MISSILE_AA|ANTI_AIR|FLAK_TANK)/.test(log.detail ?? ''))).toBe(true);
  });
});
