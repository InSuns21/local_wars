import { createInitialGameState } from '@core/engine/createInitialGameState';
import { nextTurnState } from '@core/engine/turnEngine';

describe('turnEngine 収入処理', () => {
  it('incomePerProperty 設定値がターン収入に反映される', () => {
    const state = createInitialGameState({
      settings: {
        aiDifficulty: 'normal',
        humanPlayerSide: 'P1',
        fogOfWar: false,
        initialFunds: 5000,
        incomePerProperty: 1500,
        hpRecoveryCity: 1,
        hpRecoveryFactory: 2,
        hpRecoveryHq: 3,
        enableAirUnits: true,
        enableNavalUnits: true,
        enableFuelSupply: true,
        enableAmmoSupply: true,
      },
    });

    const next = nextTurnState(state);
    // P2所有: HQ + FACTORY + CITY = 3拠点
    expect(next.players.P2.funds).toBe(5000 + 4500);
  });

  it('収入対象は都市・工場・司令部', () => {
    const state = createInitialGameState();
    state.incomePerProperty = 1000;
    const p2Before = state.players.P2.funds;

    const next = nextTurnState(state);

    // P2所有は CITY もあるが、収入対象は CITY/HQ/FACTORY の3拠点
    expect(next.players.P2.funds).toBe(p2Before + 3000);
  });
});

describe('turnEngine 補給処理', () => {
  it('補給ON時は自軍拠点上のユニットの燃料/弾薬が全快する', () => {
    const state = createInitialGameState();
    state.units.p2_inf.position = { x: 4, y: 3 }; // P2 FACTORY
    state.units.p2_inf.fuel = 10;
    state.units.p2_inf.ammo = 1;
    state.enableFuelSupply = true;
    state.enableAmmoSupply = true;

    const next = nextTurnState(state);

    expect(next.currentPlayerId).toBe('P2');
    expect(next.units.p2_inf.fuel).toBe(99);
    expect(next.units.p2_inf.ammo).toBe(9);
  });

  it('補給OFF時は自軍拠点上でも燃料/弾薬が回復しない', () => {
    const state = createInitialGameState();
    state.units.p2_inf.position = { x: 4, y: 3 }; // P2 FACTORY
    state.units.p2_inf.fuel = 10;
    state.units.p2_inf.ammo = 1;
    state.enableFuelSupply = false;
    state.enableAmmoSupply = false;

    const next = nextTurnState(state);

    expect(next.currentPlayerId).toBe('P2');
    expect(next.units.p2_inf.fuel).toBe(10);
    expect(next.units.p2_inf.ammo).toBe(1);
  });
});

describe('turnEngine HP回復処理', () => {
  it('自軍都市/工場/HQ上のユニットはデフォルト回復量で回復する', () => {
    const state = createInitialGameState();

    state.units.p2_inf.position = { x: 3, y: 3 }; // P2 CITY
    state.units.p2_inf.hp = 4;
    state.units.p2_tank.position = { x: 4, y: 3 }; // P2 FACTORY
    state.units.p2_tank.hp = 4;
    state.units.p1_inf.position = { x: 4, y: 4 }; // P2 HQ
    state.units.p1_inf.owner = 'P2';
    state.units.p1_inf.hp = 4;

    const next = nextTurnState(state);

    expect(next.currentPlayerId).toBe('P2');
    expect(next.units.p2_inf.hp).toBe(5);
    expect(next.units.p2_tank.hp).toBe(6);
    expect(next.units.p1_inf.hp).toBe(7);
  });

  it('設定した回復量が都市/工場/HQに反映される', () => {
    const state = createInitialGameState();
    state.hpRecoveryCity = 2;
    state.hpRecoveryFactory = 4;
    state.hpRecoveryHq = 6;

    state.units.p2_inf.position = { x: 3, y: 3 }; // P2 CITY
    state.units.p2_inf.hp = 3;
    state.units.p2_tank.position = { x: 4, y: 3 }; // P2 FACTORY
    state.units.p2_tank.hp = 3;
    state.units.p1_inf.position = { x: 4, y: 4 }; // P2 HQ
    state.units.p1_inf.owner = 'P2';
    state.units.p1_inf.hp = 3;

    const next = nextTurnState(state);

    expect(next.units.p2_inf.hp).toBe(5);
    expect(next.units.p2_tank.hp).toBe(7);
    expect(next.units.p1_inf.hp).toBe(9);
  });

  it('自軍拠点以外では回復せず、回復後HPは10を上限にする', () => {
    const state = createInitialGameState();
    state.hpRecoveryFactory = 5;

    state.units.p2_inf.position = { x: 2, y: 2 }; // plain
    state.units.p2_inf.hp = 6;
    state.units.p2_tank.position = { x: 4, y: 3 }; // P2 FACTORY
    state.units.p2_tank.hp = 8;

    const next = nextTurnState(state);

    expect(next.units.p2_inf.hp).toBe(6);
    expect(next.units.p2_tank.hp).toBe(10);
  });
});

describe('turnEngine 拠点耐久回復処理', () => {
  it('ターン終了時、敵ユニットがいない自軍HQ/工場/都市の拠点耐久は20まで回復する', () => {
    const state = createInitialGameState();

    state.map.tiles['0,0'] = { ...state.map.tiles['0,0'], capturePoints: 8 }; // P1 HQ
    state.map.tiles['0,1'] = { ...state.map.tiles['0,1'], capturePoints: 12 }; // P1 FACTORY
    state.map.tiles['1,1'] = { ...state.map.tiles['1,1'], capturePoints: 15 }; // P1 CITY

    state.units.p1_tank.position = { x: 0, y: 0 }; // 味方ユニットがいても回復

    const next = nextTurnState(state);

    expect(next.map.tiles['0,0']?.capturePoints).toBe(20);
    expect(next.map.tiles['0,1']?.capturePoints).toBe(20);
    expect(next.map.tiles['1,1']?.capturePoints).toBe(20);
  });

  it('ターン終了時、敵ユニットがいる自軍拠点の拠点耐久は回復しない', () => {
    const state = createInitialGameState();

    state.map.tiles['0,0'] = { ...state.map.tiles['0,0'], capturePoints: 8 }; // P1 HQ
    state.map.tiles['0,1'] = { ...state.map.tiles['0,1'], capturePoints: 12 }; // P1 FACTORY
    state.map.tiles['1,1'] = { ...state.map.tiles['1,1'], capturePoints: 15 }; // P1 CITY

    state.units.p2_tank.position = { x: 0, y: 0 }; // 敵がいるHQは回復しない
    state.units.p2_inf.position = { x: 0, y: 1 }; // 敵がいるFACTORYは回復しない
    state.units.p2_tank.hp = 10;
    state.units.p2_inf.hp = 10;

    const next = nextTurnState(state);

    expect(next.map.tiles['0,0']?.capturePoints).toBe(8);
    expect(next.map.tiles['0,1']?.capturePoints).toBe(12);
    expect(next.map.tiles['1,1']?.capturePoints).toBe(20);
  });
});

