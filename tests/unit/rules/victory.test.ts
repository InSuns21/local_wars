import { checkVictory } from '@core/rules/victory';
import type { GameState } from '@core/types/state';

const createBaseState = (): GameState => ({
  turn: 1,
  currentPlayerId: 'P1',
  phase: 'command',
  map: {
    width: 3,
    height: 3,
    commandHqByPlayer: {
      P1: { x: 0, y: 0 },
      P2: { x: 2, y: 2 },
    },
    tiles: {
      '0,0': { coord: { x: 0, y: 0 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 },
      '2,2': { coord: { x: 2, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 },
    },
  },
  units: {
    p1: {
      id: 'p1',
      owner: 'P1',
      type: 'INFANTRY',
      hp: 10,
      fuel: 99,
      ammo: 9,
      position: { x: 1, y: 0 },
      moved: false,
      acted: false,
    },
    p2: {
      id: 'p2',
      owner: 'P2',
      type: 'INFANTRY',
      hp: 10,
      fuel: 99,
      ammo: 9,
      position: { x: 1, y: 2 },
      moved: false,
      acted: false,
    },
  },
  players: {
    P1: { id: 'P1', funds: 0, vp: 0 },
    P2: { id: 'P2', funds: 0, vp: 0 },
  },
  rngSeed: 1,
  actionLog: [],
  winner: null,
});

describe('勝利判定ルール', () => {
  it('司令部占領で勝利する', () => {
    const state = createBaseState();
    state.map.tiles['2,2'].owner = 'P1';

    const result = checkVictory(state);
    expect(result.winner).toBe('P1');
    expect(result.reason).toBe('HQ_CAPTURE');
  });

  it('左右端でないHQ配置でも開始時に誤って勝敗が確定しない', () => {
    const state = createBaseState();
    state.map.commandHqByPlayer = {
      P1: { x: 1, y: 0 },
      P2: { x: 10, y: 9 },
    };
    state.map.tiles = {
      '1,0': { coord: { x: 1, y: 0 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 },
      '10,9': { coord: { x: 10, y: 9 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 },
    };

    const result = checkVictory(state);
    expect(result.winner).toBeNull();
    expect(result.reason).toBeNull();
  });

  it('複数HQでもcommandHqByPlayerで指定したHQのみ勝敗判定に使う', () => {
    const state = createBaseState();
    state.map.commandHqByPlayer = {
      P1: { x: 1, y: 0 },
      P2: { x: 10, y: 9 },
    };
    state.map.tiles = {
      '1,0': { coord: { x: 1, y: 0 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 },
      '10,9': { coord: { x: 10, y: 9 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 },
      '8,8': { coord: { x: 8, y: 8 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 },
    };

    state.map.tiles['8,8'].owner = 'P2';
    const resultNoWin = checkVictory(state);
    expect(resultNoWin.winner).toBeNull();

    state.map.tiles['10,9'].owner = 'P1';
    const resultWin = checkVictory(state);
    expect(resultWin.winner).toBe('P1');
    expect(resultWin.reason).toBe('HQ_CAPTURE');
  });

  it('全滅で勝利する', () => {
    const state = createBaseState();
    state.units.p2.hp = 0;

    const result = checkVictory(state);
    expect(result.winner).toBe('P1');
    expect(result.reason).toBe('ANNIHILATION');
  });

  it('P1が全滅した場合はP2勝利になる', () => {
    const state = createBaseState();
    state.units.p1.hp = 0;

    const result = checkVictory(state);
    expect(result.winner).toBe('P2');
    expect(result.reason).toBe('ANNIHILATION');
  });

  it('VP上限到達で勝利する', () => {
    const state = createBaseState();
    state.players.P2.vp = 15;

    const result = checkVictory(state, { vpLimit: 10 });
    expect(result.winner).toBe('P2');
    expect(result.reason).toBe('VP_LIMIT');
  });

  it('VP上限でP1も勝利判定される', () => {
    const state = createBaseState();
    state.players.P1.vp = 20;

    const result = checkVictory(state, { vpLimit: 10 });
    expect(result.winner).toBe('P1');
    expect(result.reason).toBe('VP_LIMIT');
  });

  it('commandHqByPlayer未指定でもHQをx座標で解決して判定できる', () => {
    const state = createBaseState();
    delete state.map.commandHqByPlayer;
    state.map.tiles = {
      '5,1': { coord: { x: 5, y: 1 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 },
      '20,1': { coord: { x: 20, y: 1 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 },
    };

    state.map.tiles['20,1'].owner = 'P1';
    const result = checkVictory(state);
    expect(result.winner).toBe('P1');
    expect(result.reason).toBe('HQ_CAPTURE');
  });

  it('HQが2つ未満のマップではHQ占領勝利は発生しない', () => {
    const state = createBaseState();
    delete state.map.commandHqByPlayer;
    state.map.tiles = {
      '0,0': { coord: { x: 0, y: 0 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 },
    };

    state.units.p1.hp = 0;
    state.units.p2.hp = 0;

    const result = checkVictory(state);
    expect(result.winner).toBeNull();
    expect(result.reason).toBeNull();
  });
});
