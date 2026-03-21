import { manhattanDistance } from '@/utils/coord';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { UnitState } from '@core/types/unit';
import { createGameStore } from '@store/gameStore';

const BASE_SETTINGS = {
  aiDifficulty: 'normal' as const,
  selectedAiProfile: 'balanced' as const,
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

const finalizePlayback = (store: ReturnType<typeof createGameStore>) => {
  if (store.getState().aiPlaybackStatus === 'running') {
    store.getState().skipAiPlayback();
  }
  return store.getState().gameState;
};

describe('store AI手番統合', () => {
  it('END_TURN後にAI手番が自動進行する', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'easy',
      },
    });

    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();
    const next = finalizePlayback(store);

    expect(result.ok).toBe(true);
    expect(next.currentPlayerId).toBe('P1');
    expect(next.turn).toBe(2);
    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'END_TURN')).toBe(true);
  });

  it('hard設定でもAI手番が自動進行する', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'hard',
        selectedAiProfile: 'captain',
      },
    });

    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();
    const next = finalizePlayback(store);

    expect(result.ok).toBe(true);
    expect(next.currentPlayerId).toBe('P1');
    expect(next.resolvedAiProfile).toBe('captain');
  });

  it('nightmare設定でもAI手番が自動進行する', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'nightmare',
        selectedAiProfile: 'captain',
      },
    });

    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();
    const next = finalizePlayback(store);

    expect(result.ok).toBe(true);
    expect(next.currentPlayerId).toBe('P1');
    expect(next.resolvedAiProfile).toBe('captain');
    expect(next.aiDifficulty).toBe('nightmare');
  });

  it('adaptiveは人間ターン終了後のAIターン開始時にだけ再抽選する', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'hard',
        selectedAiProfile: 'adaptive',
      },
    });
    initial.turn = 2;
    initial.resolvedAiProfile = 'hunter';
    initial.players.P2.funds = 0;

    for (const tile of Object.values(initial.map.tiles)) {
      if (['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT'].includes(tile.terrainType) && tile.owner === 'P2') {
        tile.owner = undefined;
      }
    }

    const store = createGameStore(initial, { rng: () => 0.3 });
    const result = store.getState().endTurn();
    const next = finalizePlayback(store);

    expect(result.ok).toBe(true);
    expect(next.currentPlayerId).toBe('P1');
    expect(next.turn).toBe(3);
    expect(next.resolvedAiProfile).toBe('captain');
  });

  it('FoW下では記憶した不可視航空脅威をAIターン統合でも生産判断に使う', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
        fogOfWar: true,
      },
    });
    initial.players.P2.funds = 9000;
    initial.units = {
      p2_inf_1: makeUnit({ id: 'p2_inf_1', owner: 'P2', type: 'INFANTRY', position: { x: 0, y: 4 } }),
      p2_inf_2: makeUnit({ id: 'p2_inf_2', owner: 'P2', type: 'INFANTRY', position: { x: 1, y: 4 } }),
      p2_inf_3: makeUnit({ id: 'p2_inf_3', owner: 'P2', type: 'INFANTRY', position: { x: 2, y: 4 } }),
      p2_inf_4: makeUnit({ id: 'p2_inf_4', owner: 'P2', type: 'INFANTRY', position: { x: 3, y: 4 } }),
      p2_inf_5: makeUnit({ id: 'p2_inf_5', owner: 'P2', type: 'INFANTRY', position: { x: 0, y: 3 } }),
      p1_bomber: makeUnit({ id: 'p1_bomber', owner: 'P1', type: 'BOMBER', position: { x: 4, y: 0 } }),
    };
    initial.enemyMemory = {
      p1_bomber: {
        unitId: 'p1_bomber',
        position: { x: 4, y: 0 },
        lastSeenTurn: 1,
        type: 'BOMBER',
        hpEstimate: 10,
        confidence: 0.8,
      },
    };

    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();
    const next = finalizePlayback(store);
    const produceLogs = next.actionLog.filter((log) => log.playerId === 'P2' && log.action === 'PRODUCE_UNIT');

    expect(result.ok).toBe(true);
    expect(produceLogs.some((log) => /^(MISSILE_AA|ANTI_AIR|FLAK_TANK)/.test(log.detail ?? ''))).toBe(true);
    expect(next.enemyMemory?.p1_bomber).toBeDefined();
  });

  it('drone_swarmはAIターン統合でもドローン攻撃後に本隊を前進させる', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
        selectedAiProfile: 'drone_swarm',
        enableSuicideDrones: true,
      },
    });
    initial.players.P2.funds = 0;
    initial.units = {
      p2_drone: makeUnit({ id: 'p2_drone', owner: 'P2', type: 'SUICIDE_DRONE', position: { x: 2, y: 2 } }),
      p2_tank: makeUnit({ id: 'p2_tank', owner: 'P2', type: 'TANK', position: { x: 0, y: 2 } }),
      p1_art: makeUnit({ id: 'p1_art', owner: 'P1', type: 'ARTILLERY', position: { x: 3, y: 2 } }),
      p1_guard: makeUnit({ id: 'p1_guard', owner: 'P1', type: 'TANK', position: { x: 4, y: 2 } }),
    };

    const before = manhattanDistance(initial.units.p2_tank.position, initial.units.p1_art.position);
    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();
    const next = finalizePlayback(store);

    expect(result.ok).toBe(true);
    expect(next.units.p1_art?.hp ?? 0).toBeLessThan(10);
    expect(manhattanDistance(next.units.p2_tank.position, { x: 3, y: 2 })).toBeLessThan(before);
  });

  it('stealth_strikeはAIターン統合でも低燃料のステルス爆撃機を空港へ戻そうとする', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'hard',
        selectedAiProfile: 'stealth_strike',
      },
    });
    initial.players.P2.funds = 0;
    initial.map.tiles['0,4'] = { coord: { x: 0, y: 4 }, terrainType: 'AIRPORT', owner: 'P2', capturePoints: 20 };
    initial.units = {
      p2_stealth: makeUnit({ id: 'p2_stealth', owner: 'P2', type: 'STEALTH_BOMBER', position: { x: 4, y: 1 }, fuel: 24 }),
      p1_inf: makeUnit({ id: 'p1_inf', owner: 'P1', type: 'INFANTRY', position: { x: 4, y: 4 } }),
    };

    const before = manhattanDistance(initial.units.p2_stealth.position, { x: 0, y: 4 });
    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();

    expect(result.ok).toBe(true);
    expect(manhattanDistance(finalizePlayback(store).units.p2_stealth.position, { x: 0, y: 4 })).toBeLessThan(before);
  });

  it('stealth_strikeはAIターン統合でも低燃料の潜水艦を港へ戻そうとする', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
        selectedAiProfile: 'stealth_strike',
      },
    });
    initial.players.P2.funds = 0;
    initial.map.tiles['0,4'] = { coord: { x: 0, y: 4 }, terrainType: 'PORT', owner: 'P2', capturePoints: 20 };
    initial.map.tiles['1,4'] = { coord: { x: 1, y: 4 }, terrainType: 'SEA' };
    initial.map.tiles['2,4'] = { coord: { x: 2, y: 4 }, terrainType: 'SEA' };
    initial.map.tiles['3,4'] = { coord: { x: 3, y: 4 }, terrainType: 'SEA' };
    initial.units = {
      p2_sub: makeUnit({ id: 'p2_sub', owner: 'P2', type: 'SUBMARINE', position: { x: 3, y: 4 }, fuel: 26 }),
      p1_inf: makeUnit({ id: 'p1_inf', owner: 'P1', type: 'INFANTRY', position: { x: 4, y: 0 } }),
    };

    const before = manhattanDistance(initial.units.p2_sub.position, { x: 0, y: 4 });
    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();

    expect(result.ok).toBe(true);
    expect(manhattanDistance(finalizePlayback(store).units.p2_sub.position, { x: 0, y: 4 })).toBeLessThan(before);
  });

  it('可視戦闘では再生が始まり、スキップでAI最終状態が反映される', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
      },
    });
    initial.players.P2.funds = 0;
    initial.units = {
      p2_tank: makeUnit({ id: 'p2_tank', owner: 'P2', type: 'TANK', position: { x: 2, y: 2 } }),
      p1_tank: makeUnit({ id: 'p1_tank', owner: 'P1', type: 'TANK', position: { x: 2, y: 1 } }),
    };

    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();

    expect(result.ok).toBe(true);
    expect(store.getState().aiPlaybackStatus).toBe('running');
    expect(store.getState().currentAiPlaybackEvent?.type).toBe('attack');

    store.getState().skipAiPlayback();

    expect(store.getState().aiPlaybackStatus).toBe('idle');
    const next = store.getState().gameState;
    expect(next.currentPlayerId).toBe('P1');
    expect(next.units.p1_tank.hp).toBeLessThan(10);
  });

  it('可視移動では再生中の中間位置がstoreへ順に反映される', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
      },
    });
    initial.players.P2.funds = 0;
    initial.units = {
      p2_tank: makeUnit({ id: 'p2_tank', owner: 'P2', type: 'TANK', position: { x: 0, y: 4 } }),
      p1_tank: makeUnit({ id: 'p1_tank', owner: 'P1', type: 'TANK', position: { x: 4, y: 0 } }),
    };

    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();

    expect(result.ok).toBe(true);
    expect(store.getState().aiPlaybackStatus).toBe('running');
    expect(store.getState().currentAiPlaybackEvent?.type).toBe('move');
    expect(store.getState().aiPlaybackEvents.filter((event) => event.type === 'move').length).toBeGreaterThan(1);

    const firstPos = { ...store.getState().gameState.units.p2_tank.position };
    store.getState().stepAiPlayback();
    const secondPos = store.getState().gameState.units.p2_tank.position;

    expect(secondPos).not.toEqual(firstPos);

    store.getState().skipAiPlayback();
    expect(store.getState().gameState.currentPlayerId).toBe('P1');
  });

  it('FoWでの新規視認は再生後にターン開始サマリーへ残る', () => {
    const initial = createInitialGameState({
      settings: {
        ...BASE_SETTINGS,
        aiDifficulty: 'normal',
        fogOfWar: true,
      },
    });
    initial.players.P2.funds = 0;
    initial.units = {
      p1_tank: makeUnit({ id: 'p1_tank', owner: 'P1', type: 'TANK', position: { x: 0, y: 0 } }),
      p2_tank: makeUnit({ id: 'p2_tank', owner: 'P2', type: 'TANK', position: { x: 2, y: 0 } }),
    };
    initial.map.tiles['2,0'] = { coord: { x: 2, y: 0 }, terrainType: 'FOREST' };

    const store = createGameStore(initial, { rng: () => 0.5 });
    const result = store.getState().endTurn();

    expect(result.ok).toBe(true);
    store.getState().skipAiPlayback();

    const summaryMessages = store.getState().aiTurnSummary.map((item) => item.message).join(' | ');
    expect(summaryMessages).toContain('新たに敵戦車を視認');
    expect(summaryMessages).toContain('HQ周辺に敵戦車が接近');
  });
});
