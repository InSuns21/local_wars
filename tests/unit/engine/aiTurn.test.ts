import { manhattanDistance } from '@/utils/coord';
import { getAiOperationalObjectiveForProfile, runAiTurn, runAiTurnAnalysis, runAiTurnWithPlayback } from '@core/engine/aiTurn';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { getVisibleEnemyUnitIds } from '@core/rules/visibility';
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

const createAiState = (difficulty: 'easy' | 'normal' | 'hard' | 'nightmare'): GameState => {
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

  it('Hard難易度でAI手番を正常に実行できる', () => {
    const state = createAiState('hard');

    const next = runAiTurn(state, { difficulty: 'hard', deps: { rng: () => 0.5 } });

    expect(next.currentPlayerId).toBe('P1');
    expect(next.turn).toBe(2);
    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'END_TURN')).toBe(true);
  });

  it('Nightmare難易度でAI手番を正常に実行できる', () => {
    const state = createAiState('nightmare');

    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });

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

  it('Normalは防空歩兵でも占領可能なら占領を優先する', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 0;

    state.units = {
      p2_adi: makeUnit({
        id: 'p2_adi',
        owner: 'P2',
        type: 'AIR_DEFENSE_INFANTRY',
        position: { x: 2, y: 2 },
      }),
      p1_tank: makeUnit({
        id: 'p1_tank',
        owner: 'P1',
        type: 'TANK',
        position: { x: 3, y: 2 },
      }),
    };

    state.map.tiles['2,2'] = {
      coord: { x: 2, y: 2 },
      terrainType: 'CITY',
      owner: 'P1',
      capturePoints: 20,
    };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'CAPTURE' && log.detail?.includes('p2_adi'))).toBe(true);
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

  it('hq_push中の砲兵は前線を追い越しにくい', () => {
    const state = createAiState('nightmare');
    state.fogOfWar = true;
    state.selectedAiProfile = 'captain';
    state.players.P2.funds = 0;
    state.units = {
      p2_art: makeUnit({ id: 'p2_art', owner: 'P2', type: 'ARTILLERY', position: { x: 2, y: 2 } }),
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 5, y: 2 }, moved: true, acted: true }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'TANK', position: { x: 5, y: 3 }, moved: true, acted: true }),
      p2_tank_3: makeUnit({ id: 'p2_tank_3', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 2 }, moved: true, acted: true }),
      p2_tank_4: makeUnit({ id: 'p2_tank_4', owner: 'P2', type: 'ANTI_AIR', position: { x: 4, y: 3 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };
    state.map.tiles['6,1'] = { coord: { x: 6, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });

    expect(next.units.p2_art).toBeDefined();
    expect(next.units.p2_art.position.x).toBeLessThanOrEqual(5);
  });

  it('defend_hq中のMISSILE_AAはHQ周辺の防衛ラインに寄りやすい', () => {
    const state = createAiState('nightmare');
    state.selectedAiProfile = 'captain';
    state.players.P2.funds = 0;
    state.units = {
      p2_missile: makeUnit({ id: 'p2_missile', owner: 'P2', type: 'MISSILE_AA', position: { x: 5, y: 2 } }),
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 2, y: 2 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 2, y: 3 }, moved: true, acted: true }),
      p1_bomber: makeUnit({ id: 'p1_bomber', owner: 'P1', type: 'BOMBER', position: { x: 2, y: 0 } }),
      p1_inf: makeUnit({ id: 'p1_inf', owner: 'P1', type: 'INFANTRY', position: { x: 1, y: 1 } }),
    };

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };

    const beforeDistance = manhattanDistance(state.units.p2_missile.position, { x: 0, y: 2 });
    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });
    const afterDistance = manhattanDistance(next.units.p2_missile.position, { x: 0, y: 2 });

    expect(afterDistance).toBeLessThan(beforeDistance);
  });

  it('hq_push中のFLAK_TANKは前線カバーの防空ラインに寄りやすい', () => {
    const state = createAiState('nightmare');
    state.fogOfWar = true;
    state.selectedAiProfile = 'captain';
    state.players.P2.funds = 0;
    state.units = {
      p2_flak: makeUnit({ id: 'p2_flak', owner: 'P2', type: 'FLAK_TANK', position: { x: 1, y: 2 } }),
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 5, y: 2 }, moved: true, acted: true }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'TANK', position: { x: 5, y: 3 }, moved: true, acted: true }),
      p2_tank_3: makeUnit({ id: 'p2_tank_3', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 2 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };
    state.map.tiles['6,1'] = { coord: { x: 6, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const beforeFrontlineDistance = Math.min(
      manhattanDistance(state.units.p2_flak.position, state.units.p2_tank_1.position),
      manhattanDistance(state.units.p2_flak.position, state.units.p2_tank_2.position),
    );
    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });
    const afterFrontlineDistance = Math.min(
      manhattanDistance(next.units.p2_flak.position, next.units.p2_tank_1.position),
      manhattanDistance(next.units.p2_flak.position, next.units.p2_tank_2.position),
    );

    expect(afterFrontlineDistance).toBeLessThan(beforeFrontlineDistance);
    expect(next.units.p2_flak.position.x).toBeLessThanOrEqual(5);
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

  it('ground-onlyでは輸送車の生産をかなり抑える', () => {
    const state = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'nightmare',
        enableAirUnits: false,
        enableNavalUnits: false,
        enableSuicideDrones: false,
      },
    });
    state.currentPlayerId = 'P2';
    state.selectedAiProfile = 'captain';
    state.players.P2.funds = UNIT_DEFINITIONS.TRANSPORT_TRUCK.cost;
    state.units = {
      p2_inf: makeUnit({
        id: 'p2_inf',
        owner: 'P2',
        type: 'INFANTRY',
        position: { x: 1, y: 1 },
        moved: true,
        acted: true,
      }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['1,1'] = { coord: { x: 1, y: 1 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['3,1'] = { coord: { x: 3, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });
    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

    expect(produceLogs.some((log) => log.detail?.startsWith('TRANSPORT_TRUCK'))).toBe(false);
  });

  it('Normalは既に輸送ヘリがいると追加の輸送ヘリを連打しない', () => {
    const state = createInitialGameState({
      mapId: 'carrier-strike',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
      },
    });
    state.currentPlayerId = 'P2';
    state.players.P2.funds = UNIT_DEFINITIONS.TRANSPORT_HELI.cost;

    for (const unit of Object.values(state.units)) {
      if (unit.owner === 'P2') {
        unit.moved = true;
        unit.acted = true;
      }
    }

    state.units.p2_transport_heli = makeUnit({
      id: 'p2_transport_heli',
      owner: 'P2',
      type: 'TRANSPORT_HELI',
      position: { x: 21, y: 15 },
      moved: true,
      acted: true,
    });

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

    expect(produceLogs.some((log) => log.detail?.startsWith('TRANSPORT_HELI'))).toBe(false);
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

  it('auto傾向は無効候補を除いて解決される', () => {
    const state = createAiState('hard');
    state.selectedAiProfile = 'auto';
    state.enableSuicideDrones = false;
    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'PLAIN' };
    state.map.tiles['4,2'] = { coord: { x: 4, y: 2 }, terrainType: 'PLAIN' };
    state.map.tiles['0,1'] = { coord: { x: 0, y: 1 }, terrainType: 'PLAIN' };
    state.map.tiles['4,3'] = { coord: { x: 4, y: 3 }, terrainType: 'PLAIN' };
    state.players.P2.funds = 0;

    const next = runAiTurn(state, { difficulty: 'hard', deps: { rng: () => 0.99 } });

    expect(next.resolvedAiProfile).toBeDefined();
    expect(next.resolvedAiProfile).not.toBe('drone_swarm');
    expect(next.resolvedAiProfile).not.toBe('stealth_strike');
  });

  it('FoWありでは不可視の敵航空だけでは対空生産に寄らない', () => {
    const state = createInitialGameState({
      mapId: 'carrier-strike',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
        fogOfWar: true,
      },
    });
    state.currentPlayerId = 'P2';
    state.players.P2.funds = 9000;
    state.units = {
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 20, y: 14 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 20, y: 13 }, moved: true, acted: true }),
      p2_inf_3: makeUnit({ id: 'p2_inf_3', owner: 'P2', type: 'INFANTRY', position: { x: 21, y: 14 }, moved: true, acted: true }),
      p2_inf_4: makeUnit({ id: 'p2_inf_4', owner: 'P2', type: 'INFANTRY', position: { x: 21, y: 13 }, moved: true, acted: true }),
      p1_bomber: makeUnit({ id: 'p1_bomber', owner: 'P1', type: 'BOMBER', position: { x: 2, y: 1 } }),
    };

    expect(getVisibleEnemyUnitIds(state, 'P2').has('p1_bomber')).toBe(false);

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

    expect(produceLogs.some((log) => /^(MISSILE_AA|ANTI_AIR|FLAK_TANK)/.test(log.detail ?? ''))).toBe(false);
  });

  it('adaptiveは施設劣勢を検知すると再抽選する', () => {
    const state = createAiState('hard');
    state.turn = 2;
    state.selectedAiProfile = 'adaptive';
    state.resolvedAiProfile = 'hunter';
    state.players.P2.funds = 0;

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType) && tile.owner === 'P2') {
        tile.owner = undefined;
      }
    }

    const next = runAiTurn(state, { difficulty: 'hard', deps: { rng: () => 0.3 } });

    expect(next.resolvedAiProfile).toBe('captain');
  });

  it('FoW下では可視敵をenemyMemoryへ記録する', () => {
    const state = createAiState('normal');
    state.fogOfWar = true;
    state.selectedAiProfile = 'balanced';
    state.players.P2.funds = 0;
    state.units = {
      p2_inf: makeUnit({ id: 'p2_inf', owner: 'P2', type: 'INFANTRY', position: { x: 0, y: 0 }, moved: true, acted: true }),
      p1_bomber: makeUnit({ id: 'p1_bomber', owner: 'P1', type: 'BOMBER', position: { x: 4, y: 4 } }),
    };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    expect(next.enemyMemory?.p1_bomber).toMatchObject({
      unitId: 'p1_bomber',
      type: 'BOMBER',
      lastSeenTurn: 1,
      confidence: 1,
    });
    expect(next.enemyMemory?.p1_bomber?.position).toEqual({ x: 4, y: 4 });
  });

  it('FoWで敵が見えなくても歩兵は中立施設へ前進する', () => {
    const state = createAiState('normal');
    state.fogOfWar = true;
    state.players.P2.funds = 0;
    state.units = {
      p2_inf: makeUnit({ id: 'p2_inf', owner: 'P2', type: 'INFANTRY', position: { x: 1, y: 1 } }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['1,1'] = { coord: { x: 1, y: 1 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['2,1'] = { coord: { x: 2, y: 1 }, terrainType: 'PLAIN' };
    state.map.tiles['3,1'] = { coord: { x: 3, y: 1 }, terrainType: 'PLAIN' };
    state.map.tiles['4,1'] = { coord: { x: 4, y: 1 }, terrainType: 'PLAIN' };
    state.map.tiles['5,1'] = { coord: { x: 5, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const movedInfantry = next.units.p2_inf;

    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'MOVE_UNIT' && log.detail?.includes('p2_inf'))).toBe(true);
    expect(manhattanDistance(movedInfantry.position, { x: 5, y: 1 })).toBeLessThan(manhattanDistance({ x: 1, y: 1 }, { x: 5, y: 1 }));
  });

  it('hq_push中の補給車は前線に出過ぎても敵HQ側へ踏み込み続けにくい', () => {
    const state = createAiState('nightmare');
    state.fogOfWar = true;
    state.players.P2.funds = 0;
    state.units = {
      p2_supply: makeUnit({ id: 'p2_supply', owner: 'P2', type: 'SUPPLY_TRUCK', position: { x: 6, y: 2 }, fuel: 30, ammo: 0 }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'TANK', position: { x: 5, y: 3 }, fuel: 30, ammo: 3, moved: true, acted: true }),
      p2_tank_3: makeUnit({ id: 'p2_tank_3', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 3 }, fuel: 40, ammo: 3, moved: true, acted: true }),
      p2_tank_4: makeUnit({ id: 'p2_tank_4', owner: 'P2', type: 'TANK', position: { x: 5, y: 4 }, fuel: 30, ammo: 3, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = undefined;
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };

    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });

    expect(next.units.p2_supply).toBeDefined();
    expect(next.units.p2_supply.position.x).toBeLessThanOrEqual(6);
  });

  it('hq_pushでは前線維持用の間接支援が不足していると砲兵を生産しやすい', () => {
    const state = createAiState('nightmare');
    state.fogOfWar = true;
    state.selectedAiProfile = 'captain';
    state.players.P2.funds = UNIT_DEFINITIONS.ARTILLERY.cost;
    state.units = {
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 5, y: 2 }, moved: true, acted: true }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'TANK', position: { x: 5, y: 3 }, moved: true, acted: true }),
      p2_tank_3: makeUnit({ id: 'p2_tank_3', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 2 }, moved: true, acted: true }),
      p2_tank_4: makeUnit({ id: 'p2_tank_4', owner: 'P2', type: 'ANTI_AIR', position: { x: 4, y: 3 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };
    state.map.tiles['6,1'] = { coord: { x: 6, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });
    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

    expect(produceLogs.some((log) => log.detail?.startsWith('ARTILLERY'))).toBe(true);
  });

  it('ground-onlyでは緩和条件でhq_pushへ移行しやすい', () => {
    const state = createInitialGameState({
      mapId: 'plains-clash',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'nightmare',
        fogOfWar: true,
        enableAirUnits: false,
        enableNavalUnits: false,
        enableSuicideDrones: false,
      },
    });
    state.currentPlayerId = 'P2';
    state.selectedAiProfile = 'captain';
    state.units = {
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 5, y: 2 }, moved: true, acted: true }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 2 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };
    state.map.tiles['6,1'] = { coord: { x: 6, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['6,3'] = { coord: { x: 6, y: 3 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['5,1'] = { coord: { x: 5, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const objective = getAiOperationalObjectiveForProfile(state, 'P2', 'nightmare', 'captain');

    expect(objective).toBe('hq_push');
  });

  it('ground-onlyのcaptainは単発のHQ脅威だけではdefend_hqに寄りすぎない', () => {
    const state = createInitialGameState({
      mapId: 'plains-clash',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'nightmare',
        fogOfWar: true,
        enableAirUnits: false,
        enableNavalUnits: false,
        enableSuicideDrones: false,
      },
    });
    state.currentPlayerId = 'P2';
    state.selectedAiProfile = 'captain';
    state.units = {
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 5, y: 2 }, moved: true, acted: true }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 2 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
      p1_inf: makeUnit({ id: 'p1_inf', owner: 'P1', type: 'INFANTRY', position: { x: 0, y: 5 } }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };
    state.map.tiles['6,1'] = { coord: { x: 6, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['6,3'] = { coord: { x: 6, y: 3 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['5,1'] = { coord: { x: 5, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const objective = getAiOperationalObjectiveForProfile(state, 'P2', 'nightmare', 'captain');

    expect(objective).toBe('hq_push');
  });

  it('ground-onlyのhunterは押し込める盤面でhq_pushへ移行しやすい', () => {
    const state = createInitialGameState({
      mapId: 'plains-clash',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'nightmare',
        fogOfWar: true,
        enableAirUnits: false,
        enableNavalUnits: false,
        enableSuicideDrones: false,
      },
    });
    state.currentPlayerId = 'P2';
    state.selectedAiProfile = 'hunter';
    state.units = {
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 5, y: 2 }, moved: true, acted: true }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 2 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };
    state.map.tiles['6,1'] = { coord: { x: 6, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['6,3'] = { coord: { x: 6, y: 3 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['5,1'] = { coord: { x: 5, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['4,0'] = { coord: { x: 4, y: 0 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    const objective = getAiOperationalObjectiveForProfile(state, 'P2', 'nightmare', 'hunter');

    expect(objective).toBe('hq_push');
  });

  it('hunterは偵察車を必要数以上は量産しにくい', () => {
    const state = createInitialGameState({
      mapId: 'plains-clash',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'nightmare',
        fogOfWar: true,
        enableAirUnits: false,
        enableNavalUnits: false,
        enableSuicideDrones: false,
      },
    });
    state.currentPlayerId = 'P2';
    state.selectedAiProfile = 'hunter';
    state.players.P2.funds = UNIT_DEFINITIONS.RECON.cost;
    state.units = {
      p2_recon_1: makeUnit({ id: 'p2_recon_1', owner: 'P2', type: 'RECON', position: { x: 2, y: 2 }, moved: true, acted: true }),
      p2_recon_2: makeUnit({ id: 'p2_recon_2', owner: 'P2', type: 'RECON', position: { x: 3, y: 2 }, moved: true, acted: true }),
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 5, y: 2 }, moved: true, acted: true }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 2 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };
    state.map.tiles['6,1'] = { coord: { x: 6, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });
    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

    expect(produceLogs.some((log) => log.detail?.startsWith('RECON'))).toBe(false);
  });

  it('defend_hqでは航空脅威があるとMISSILE_AAかFLAK_TANKを優先しやすい', () => {
    const state = createAiState('nightmare');
    state.selectedAiProfile = 'captain';
    state.players.P2.funds = UNIT_DEFINITIONS.MISSILE_AA.cost;
    state.units = {
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 2, y: 3 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 3 }, moved: true, acted: true }),
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 2, y: 2 }, moved: true, acted: true }),
      p1_bomber: makeUnit({ id: 'p1_bomber', owner: 'P1', type: 'BOMBER', position: { x: 2, y: 0 } }),
      p1_inf: makeUnit({ id: 'p1_inf', owner: 'P1', type: 'INFANTRY', position: { x: 1, y: 1 } }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };

    const next = runAiTurn(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });
    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

    expect(produceLogs.some((log) => /^(MISSILE_AA|FLAK_TANK)/.test(log.detail ?? ''))).toBe(true);
  });

  it('記憶した不可視航空脅威を対空生産に使う', () => {
    const state = createAiState('normal');
    state.fogOfWar = true;
    state.players.P2.funds = 9000;
    state.units = {
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 0, y: 4 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 1, y: 4 }, moved: true, acted: true }),
      p2_inf_3: makeUnit({ id: 'p2_inf_3', owner: 'P2', type: 'INFANTRY', position: { x: 2, y: 4 }, moved: true, acted: true }),
      p2_inf_4: makeUnit({ id: 'p2_inf_4', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 4 }, moved: true, acted: true }),
      p2_inf_5: makeUnit({ id: 'p2_inf_5', owner: 'P2', type: 'INFANTRY', position: { x: 0, y: 3 }, moved: true, acted: true }),
      p1_bomber: makeUnit({ id: 'p1_bomber', owner: 'P1', type: 'BOMBER', position: { x: 4, y: 0 } }),
    };
    state.enemyMemory = {
      p1_bomber: {
        unitId: 'p1_bomber',
        position: { x: 4, y: 0 },
        lastSeenTurn: 1,
        type: 'BOMBER',
        hpEstimate: 10,
        confidence: 0.8,
      },
    };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

    expect(produceLogs.some((log) => /^(MISSILE_AA|ANTI_AIR|FLAK_TANK)/.test(log.detail ?? ''))).toBe(true);
  });

  it('Normalは港を持つ海戦マップで海上ユニットを生産する', () => {
    const state = createInitialGameState({
      mapId: 'island-landing',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
      },
    });
    state.currentPlayerId = 'P2';
    state.players.P2.funds = 20000;
    delete state.units.p2_destroyer;
    delete state.units.p2_lander;

    for (const unit of Object.values(state.units)) {
      if (unit.owner === 'P2') {
        unit.moved = true;
        unit.acted = true;
      }
    }

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');
    expect(produceLogs.length).toBeGreaterThan(0);
    expect(produceLogs.some((log) => /^(DESTROYER|LANDER|CARRIER|SUPPLY_SHIP)/.test(log.detail ?? ''))).toBe(true);
  });

  it('Normalは海戦マップの港で駆逐艦生産を優先する', () => {
    const state = createInitialGameState({
      mapId: 'carrier-strike',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
      },
    });
    state.currentPlayerId = 'P2';
    state.players.P2.funds = UNIT_DEFINITIONS.DESTROYER.cost;
    delete state.units.p2_destroyer;

    for (const tile of Object.values(state.map.tiles)) {
      if (tile.owner === 'P2' && (tile.terrainType === 'FACTORY' || tile.terrainType === 'AIRPORT')) {
        tile.owner = undefined;
      }
    }

    for (const unit of Object.values(state.units)) {
      if (unit.owner === 'P2') {
        unit.moved = true;
        unit.acted = true;
      }
    }

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT' && log.detail?.startsWith('DESTROYER'))).toBe(true);
  });

  it.each(['balanced', 'captain', 'hunter', 'turtle', 'sieger', 'drone_swarm'] as const)(
    '%sは必要数の揚陸艦があると揚陸艦を連打しない',
    (profile) => {
      const state = createInitialGameState({
        mapId: 'carrier-strike',
        settings: {
          ...BASE_SETTINGS,
          aiDifficulty: 'normal',
          enableSuicideDrones: profile === 'drone_swarm',
        },
      });
      state.currentPlayerId = 'P2';
      state.selectedAiProfile = profile;
      state.players.P2.funds = UNIT_DEFINITIONS.LANDER.cost;

      for (const tile of Object.values(state.map.tiles)) {
        if (tile.owner === 'P2' && (tile.terrainType === 'FACTORY' || tile.terrainType === 'AIRPORT')) {
          tile.owner = undefined;
        }
      }

      state.units = {
        p2_destroyer: makeUnit({ id: 'p2_destroyer', owner: 'P2', type: 'DESTROYER', position: { x: 18, y: 14 }, moved: true, acted: true }),
        p2_lander: makeUnit({ id: 'p2_lander', owner: 'P2', type: 'LANDER', position: { x: 19, y: 17 }, moved: true, acted: true }),
        p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 20, y: 14 }, moved: true, acted: true }),
        p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'ANTI_TANK', position: { x: 20, y: 13 }, moved: true, acted: true }),
        p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 21, y: 14 }, moved: true, acted: true }),
        p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 21, y: 13 }, moved: true, acted: true }),
        p1_carrier: makeUnit({ id: 'p1_carrier', owner: 'P1', type: 'CARRIER', position: { x: 6, y: 4 } }),
      };

      const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
      const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

      expect(produceLogs.some((log) => log.detail?.startsWith('LANDER'))).toBe(false);
    },
  );


  it('drone_swarmは自爆ドローンで高価値の航空目標を優先する', () => {
    const state = createAiState('normal');
    state.enableSuicideDrones = true;
    state.selectedAiProfile = 'drone_swarm';
    state.players.P2.funds = 0;
    state.units = {
      p2_drone: makeUnit({ id: 'p2_drone', owner: 'P2', type: 'SUICIDE_DRONE', position: { x: 2, y: 2 } }),
      p1_inf: makeUnit({ id: 'p1_inf', owner: 'P1', type: 'INFANTRY', position: { x: 2, y: 1 } }),
      p1_bomber: makeUnit({ id: 'p1_bomber', owner: 'P1', type: 'BOMBER', position: { x: 3, y: 2 } }),
    };

    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    expect(next.units.p1_bomber?.hp ?? 0).toBeLessThan(10);
    expect(next.units.p1_inf?.hp ?? 10).toBe(10);
  });


  it('stealth_strikeは低燃料のステルス爆撃機を空港へ戻そうとする', () => {
    const state = createAiState('hard');
    state.selectedAiProfile = 'stealth_strike';
    state.players.P2.funds = 0;
    state.map.tiles['0,4'] = { coord: { x: 0, y: 4 }, terrainType: 'AIRPORT', owner: 'P2', capturePoints: 20 };
    state.units = {
      p2_stealth: makeUnit({ id: 'p2_stealth', owner: 'P2', type: 'STEALTH_BOMBER', position: { x: 4, y: 1 }, fuel: 24 }),
    };

    const before = manhattanDistance(state.units.p2_stealth.position, { x: 0, y: 4 });
    const next = runAiTurn(state, { difficulty: 'hard', deps: { rng: () => 0.5 } });
    const stealth = next.units.p2_stealth;

    expect(stealth).toBeDefined();
    expect(manhattanDistance(stealth.position, { x: 0, y: 4 })).toBeLessThan(before);
  });

  it('stealth_strikeは低燃料の潜水艦を港へ戻そうとする', () => {
    const state = createAiState('normal');
    state.selectedAiProfile = 'stealth_strike';
    state.players.P2.funds = 0;
    state.map.tiles['0,4'] = { coord: { x: 0, y: 4 }, terrainType: 'PORT', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,4'] = { coord: { x: 1, y: 4 }, terrainType: 'SEA' };
    state.map.tiles['2,4'] = { coord: { x: 2, y: 4 }, terrainType: 'SEA' };
    state.map.tiles['3,4'] = { coord: { x: 3, y: 4 }, terrainType: 'SEA' };
    state.units = {
      p2_sub: makeUnit({ id: 'p2_sub', owner: 'P2', type: 'SUBMARINE', position: { x: 3, y: 4 }, fuel: 26 }),
    };

    const before = manhattanDistance(state.units.p2_sub.position, { x: 0, y: 4 });
    const next = runAiTurn(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const submarine = next.units.p2_sub;

    expect(submarine).toBeDefined();
    expect(manhattanDistance(submarine.position, { x: 0, y: 4 })).toBeLessThan(before);
  });

  it('Hardは次ターンに壊滅しやすい悪い攻撃を見送る', () => {
    const createTradeTrapState = (difficulty: 'normal' | 'hard' | 'nightmare') => {
      const state = createAiState(difficulty);
      state.players.P2.funds = 0;
      state.units = {
        p2_heavy: makeUnit({ id: 'p2_heavy', owner: 'P2', type: 'HEAVY_TANK', position: { x: 2, y: 2 } }),
        p1_inf: makeUnit({ id: 'p1_inf', owner: 'P1', type: 'INFANTRY', position: { x: 2, y: 1 } }),
        p1_tank: makeUnit({ id: 'p1_tank', owner: 'P1', type: 'TANK', position: { x: 3, y: 2 } }),
        p1_anti: makeUnit({ id: 'p1_anti', owner: 'P1', type: 'ANTI_TANK', position: { x: 1, y: 2 } }),
      };
      return state;
    };

    const normalNext = runAiTurn(createTradeTrapState('normal'), { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const hardNext = runAiTurn(createTradeTrapState('hard'), { difficulty: 'hard', deps: { rng: () => 0.5 } });
    const nightmareNext = runAiTurn(createTradeTrapState('nightmare'), { difficulty: 'nightmare', deps: { rng: () => 0.5 } });

    expect(normalNext.actionLog.some((log) => log.playerId === 'P2' && log.action === 'ATTACK')).toBe(true);
    expect(hardNext.actionLog.some((log) => log.playerId === 'P2' && log.action === 'ATTACK')).toBe(false);
    expect(nightmareNext.actionLog.some((log) => log.playerId === 'P2' && log.action === 'ATTACK')).toBe(false);
  });
  it('可視戦闘では攻撃と自軍被害の再生イベントを生成する', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 0;
    state.units = {
      p2_tank: makeUnit({ id: 'p2_tank', owner: 'P2', type: 'TANK', position: { x: 2, y: 2 } }),
      p1_tank: makeUnit({ id: 'p1_tank', owner: 'P1', type: 'TANK', position: { x: 2, y: 1 } }),
    };

    const result = runAiTurnWithPlayback(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const eventTypes = result.playbackEvents.map((event) => event.type);

    expect(eventTypes).toContain('attack');
    expect(eventTypes).toContain('damage_report');
    expect(result.finalState.units.p1_tank.hp).toBeLessThan(10);
  });

  it('playback付きAIターンは採用した作戦目標を返す', () => {
    const state = createInitialGameState({
      mapId: 'plains-clash',
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'nightmare',
        fogOfWar: true,
        enableAirUnits: false,
        enableNavalUnits: false,
        enableSuicideDrones: false,
      },
    });
    state.currentPlayerId = 'P2';
    state.selectedAiProfile = 'captain';
    state.units = {
      p2_tank_1: makeUnit({ id: 'p2_tank_1', owner: 'P2', type: 'TANK', position: { x: 5, y: 2 }, moved: true, acted: true }),
      p2_tank_2: makeUnit({ id: 'p2_tank_2', owner: 'P2', type: 'ANTI_TANK', position: { x: 4, y: 2 }, moved: true, acted: true }),
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 4, y: 1 }, moved: true, acted: true }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 1 }, moved: true, acted: true }),
    };

    for (const tile of Object.values(state.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType)) {
        tile.owner = 'P2';
        tile.capturePoints = 20;
      }
    }

    state.map.tiles['0,2'] = { coord: { x: 0, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 };
    state.map.tiles['1,2'] = { coord: { x: 1, y: 2 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20 };
    state.map.tiles['7,2'] = { coord: { x: 7, y: 2 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 };
    state.map.tiles['6,1'] = { coord: { x: 6, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['6,3'] = { coord: { x: 6, y: 3 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };
    state.map.tiles['5,1'] = { coord: { x: 5, y: 1 }, terrainType: 'CITY', owner: undefined, capturePoints: 20 };

    const result = runAiTurnWithPlayback(state, { difficulty: 'nightmare', deps: { rng: () => 0.5 } });
    const expectedObjective = getAiOperationalObjectiveForProfile(state, 'P2', 'nightmare', 'captain');

    expect(result.operationalObjective).toBe(expectedObjective);
  });

  it('analysis経路ではplaybackイベントを生成しない', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 0;
    state.units = {
      p2_tank: makeUnit({ id: 'p2_tank', owner: 'P2', type: 'TANK', position: { x: 2, y: 2 } }),
      p1_tank: makeUnit({ id: 'p1_tank', owner: 'P1', type: 'TANK', position: { x: 2, y: 1 } }),
    };

    const result = runAiTurnAnalysis(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });

    expect(result.playbackEvents).toEqual([]);
    expect(result.turnStartSummary).toEqual([]);
    expect(result.finalState.units.p1_tank.hp).toBeLessThan(10);
  });

  it('可視移動では1マスずつ再生イベントを生成する', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 0;
    state.units = {
      p2_tank: makeUnit({ id: 'p2_tank', owner: 'P2', type: 'TANK', position: { x: 0, y: 4 } }),
      p1_tank: makeUnit({ id: 'p1_tank', owner: 'P1', type: 'TANK', position: { x: 4, y: 0 } }),
    };

    const result = runAiTurnWithPlayback(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const moveEvents = result.playbackEvents.filter((event) => event.type === 'move');

    expect(moveEvents.length).toBeGreaterThan(1);
    expect(moveEvents[0]?.displayState.units.p2_tank.position).not.toEqual(state.units.p2_tank.position);
    expect(moveEvents[moveEvents.length - 1]?.displayState.units.p2_tank.position).toEqual(result.finalState.units.p2_tank.position);
  });

  it('FoWで新たに見えた敵はspottedイベントとターン開始サマリーへ入る', () => {
    const state = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
        selectedAiProfile: 'balanced',
        fogOfWar: true,
      },
    });
    state.currentPlayerId = 'P2';
    state.players.P2.funds = 0;
    state.units = {
      p1_tank: makeUnit({ id: 'p1_tank', owner: 'P1', type: 'TANK', position: { x: 0, y: 0 } }),
      p2_tank: makeUnit({ id: 'p2_tank', owner: 'P2', type: 'TANK', position: { x: 2, y: 0 } }),
    };
    state.map.tiles['2,0'] = { coord: { x: 2, y: 0 }, terrainType: 'FOREST' };

    const result = runAiTurnWithPlayback(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const spottedMessages = result.turnStartSummary.map((item) => item.message).join(' | ');

    expect(spottedMessages).toContain('新たに敵戦車を視認');
    expect(spottedMessages).toContain('HQ周辺に敵戦車が接近');
  });

  it('可視占領では占領と施設変化の再生イベントを生成する', () => {
    const state = createAiState('normal');
    state.players.P2.funds = 0;
    state.units = {
      p2_inf: makeUnit({ id: 'p2_inf', owner: 'P2', type: 'INFANTRY', position: { x: 2, y: 2 } }),
    };
    state.map.tiles['2,2'] = {
      coord: { x: 2, y: 2 },
      terrainType: 'CITY',
      owner: 'P1',
      capturePoints: 10,
    };

    const result = runAiTurnWithPlayback(state, { difficulty: 'normal', deps: { rng: () => 0.5 } });
    const eventTypes = result.playbackEvents.map((event) => event.type);

    expect(eventTypes).toContain('capture');
    expect(eventTypes).toContain('property_changed');
    expect(result.finalState.map.tiles['2,2']?.owner).toBe('P2');
  });
});

