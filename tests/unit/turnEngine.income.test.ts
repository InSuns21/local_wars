import { createInitialGameState } from '@core/engine/createInitialGameState';
import { nextTurnState } from '@core/engine/turnEngine';

describe('turnEngine 収入処理', () => {
  it('収入設定が未指定でも都市/工場/HQ/空港/港湾は既定値1000で加算される', () => {
    const state = createInitialGameState();
    state.incomePerProperty = undefined;
    state.incomeAirport = undefined;
    state.incomePort = undefined;
    state.map.tiles['4,2'] = {
      coord: { x: 4, y: 2 },
      terrainType: 'AIRPORT',
      owner: 'P2',
      capturePoints: 20,
    };
    state.map.tiles['4,1'] = {
      coord: { x: 4, y: 1 },
      terrainType: 'PORT',
      owner: 'P2',
      capturePoints: 20,
    };
    state.map.tiles['2,2'] = {
      coord: { x: 2, y: 2 },
      terrainType: 'PLAIN',
      owner: 'P2',
    };

    const next = nextTurnState(state);

    expect(next.players.P2.funds).toBe(10000 + 5000);
  });

  it('incomePerProperty 設定値がターン収入に反映される', () => {
    const state = createInitialGameState({
      settings: {
        aiDifficulty: 'normal',
        humanPlayerSide: 'P1',
        fogOfWar: false,
        initialFunds: 5000,
        incomePerProperty: 1500,
        incomeAirport: 1200,
        incomePort: 800,
        hpRecoveryCity: 1,
        hpRecoveryFactory: 2,
        hpRecoveryHq: 3,
        maxSupplyCharges: 4,
        enableAirUnits: true,
        enableNavalUnits: true,
        enableFuelSupply: true,
        enableAmmoSupply: true,
        enableSuicideDrones: false,
        droneInterceptionChancePercent: 70,
        droneInterceptionMaxPerTurn: 2,
        droneAiProductionRatioLimitPercent: 50,
      },
    });

    state.map.tiles['4,2'] = {
      coord: { x: 4, y: 2 },
      terrainType: 'AIRPORT',
      owner: 'P2',
      capturePoints: 20,
    };
    state.map.tiles['4,1'] = {
      coord: { x: 4, y: 1 },
      terrainType: 'PORT',
      owner: 'P2',
      capturePoints: 20,
    };

    const nextWithAirAndPort = nextTurnState(state);
    // P2所有: HQ + FACTORY + CITY + AIRPORT + PORT
    expect(nextWithAirAndPort.players.P2.funds).toBe(5000 + 1500 + 1500 + 1500 + 1200 + 800);
  });

  it('空港・港湾も収入対象になり、設定値ごとに加算される', () => {
    const state = createInitialGameState();
    state.incomePerProperty = 1000;
    state.incomeAirport = 1400;
    state.incomePort = 600;
    state.map.tiles['4,2'] = {
      coord: { x: 4, y: 2 },
      terrainType: 'AIRPORT',
      owner: 'P2',
      capturePoints: 20,
    };
    state.map.tiles['4,1'] = {
      coord: { x: 4, y: 1 },
      terrainType: 'PORT',
      owner: 'P2',
      capturePoints: 20,
    };
    const p2Before = state.players.P2.funds;

    const next = nextTurnState(state);

    expect(next.players.P2.funds).toBe(p2Before + 3000 + 1400 + 600);
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

  it('空港上の航空ユニットは燃料と弾薬が補給される', () => {
    const state = createInitialGameState();
    state.map.tiles['4,2'] = {
      coord: { x: 4, y: 2 },
      terrainType: 'AIRPORT',
      owner: 'P2',
      capturePoints: 20,
    };
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'FIGHTER',
      position: { x: 4, y: 2 },
      fuel: 3,
      ammo: 1,
      owner: 'P2',
    };
    state.enableFuelSupply = true;
    state.enableAmmoSupply = true;

    const next = nextTurnState(state);

    expect(next.units.p2_tank.fuel).toBe(80);
    expect(next.units.p2_tank.ammo).toBe(6);
  });

  it('空港でターン終了した航空ユニットは工場準拠の回復量でHP回復する', () => {
    const state = createInitialGameState();
    state.hpRecoveryFactory = 4;
    state.map.tiles['4,2'] = {
      coord: { x: 4, y: 2 },
      terrainType: 'AIRPORT',
      owner: 'P2',
      capturePoints: 20,
      operational: true,
    };
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'FIGHTER',
      position: { x: 4, y: 2 },
      hp: 5,
      fuel: 10,
      ammo: 2,
      owner: 'P2',
    };

    const next = nextTurnState(state);

    expect(next.units.p2_tank.hp).toBe(9);
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

describe('turnEngine 航空燃料処理', () => {
  it('空港外で燃料切れした航空ユニットはターン終了時に消滅しログが残る', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'FIGHTER',
      position: { x: 2, y: 2 },
      fuel: 1,
      ammo: 3,
      owner: 'P1',
    };

    const next = nextTurnState(state);

    expect(next.units.p1_tank).toBeUndefined();
    expect(next.actionLog.some((entry) => entry.action === 'AIR_FUEL_DEPLETION' && entry.detail?.includes('p1_tank'))).toBe(true);
  });

  it('空港上の航空ユニットは燃料1でもターン終了時補給で消滅せず満タンになる', () => {
    const state = createInitialGameState();
    state.map.tiles['0,2'] = {
      coord: { x: 0, y: 2 },
      terrainType: 'AIRPORT',
      owner: 'P1',
      capturePoints: 20,
      operational: true,
    };
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'FIGHTER',
      position: { x: 0, y: 2 },
      fuel: 1,
      ammo: 0,
      owner: 'P1',
    };

    const next = nextTurnState(state);

    expect(next.units.p1_tank).toBeDefined();
    expect(next.units.p1_tank.fuel).toBe(80);
    expect(next.units.p1_tank.ammo).toBe(6);
  });

  it('空港上の航空ユニットは燃料0でもターン終了時補給で消滅せず満タンになる', () => {
    const state = createInitialGameState();
    state.map.tiles['0,2'] = {
      coord: { x: 0, y: 2 },
      terrainType: 'AIRPORT',
      owner: 'P1',
      capturePoints: 20,
      operational: true,
    };
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'FIGHTER',
      position: { x: 0, y: 2 },
      fuel: 0,
      ammo: 1,
      owner: 'P1',
    };

    const next = nextTurnState(state);

    expect(next.units.p1_tank).toBeDefined();
    expect(next.units.p1_tank.fuel).toBe(80);
    expect(next.units.p1_tank.ammo).toBe(6);
  });

  it('航空ユニットは待機だけでもターン終了時に燃料を消費する', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'FIGHTER',
      position: { x: 2, y: 2 },
      fuel: 3,
    };

    const next = nextTurnState(state);

    expect(next.units.p1_tank).toBeDefined();
    expect(next.units.p1_tank.fuel).toBe(2);
  });

  it('補給車は味方工場でターン終了すると補給回数が全回復する', () => {
    const state = createInitialGameState();
    state.maxSupplyCharges = 5;
    state.units.p1_truck = {
      id: 'p1_truck',
      owner: 'P1',
      type: 'SUPPLY_TRUCK',
      hp: 10,
      fuel: 20,
      ammo: 0,
      supplyCharges: 1,
      position: { x: 0, y: 1 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };

    const next = nextTurnState(state);

    expect(next.units.p1_truck.supplyCharges).toBe(5);
  });

  it('空中補給機は味方空港でターン終了すると補給回数が全回復する', () => {
    const state = createInitialGameState();
    state.maxSupplyCharges = 6;
    state.units.p1_tanker = {
      id: 'p1_tanker',
      owner: 'P1',
      type: 'AIR_TANKER',
      hp: 10,
      fuel: 10,
      ammo: 0,
      supplyCharges: 2,
      position: { x: 0, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };

    const next = nextTurnState(state);

    expect(next.units.p1_tanker.supplyCharges).toBe(6);
  });

  it('ステルス機は待機時に燃料を2消費する', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'STEALTH_BOMBER',
      position: { x: 2, y: 2 },
      fuel: 3,
    };

    const next = nextTurnState(state);

    expect(next.units.p1_tank).toBeDefined();
    expect(next.units.p1_tank.fuel).toBe(1);
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
  it('ターン終了時、敵ユニットがいない自軍HQ/工場/都市の拠点耐久は地形ごとの上限まで回復する', () => {
    const state = createInitialGameState();

    state.map.tiles['0,0'] = { ...state.map.tiles['0,0'], capturePoints: 8 }; // P1 HQ
    state.map.tiles['0,1'] = { ...state.map.tiles['0,1'], capturePoints: 12 }; // P1 FACTORY
    state.map.tiles['1,1'] = { ...state.map.tiles['1,1'], capturePoints: 3 }; // P1 CITY

    state.units.p1_tank.position = { x: 0, y: 0 }; // 味方ユニットがいても回復

    const next = nextTurnState(state);

    expect(next.map.tiles['0,0']?.capturePoints).toBe(20);
    expect(next.map.tiles['0,1']?.capturePoints).toBe(20);
    expect(next.map.tiles['1,1']?.capturePoints).toBe(10);
  });

  it('ターン終了時、敵ユニットがいる自軍拠点の拠点耐久は回復しない', () => {
    const state = createInitialGameState();

    state.map.tiles['0,0'] = { ...state.map.tiles['0,0'], capturePoints: 8 }; // P1 HQ
    state.map.tiles['0,1'] = { ...state.map.tiles['0,1'], capturePoints: 12 }; // P1 FACTORY
    state.map.tiles['1,1'] = { ...state.map.tiles['1,1'], capturePoints: 3 }; // P1 CITY

    state.units.p2_tank.position = { x: 0, y: 0 }; // 敵がいるHQは回復しない
    state.units.p2_inf.position = { x: 0, y: 1 }; // 敵がいるFACTORYは回復しない
    state.units.p2_tank.hp = 10;
    state.units.p2_inf.hp = 10;

    const next = nextTurnState(state);

    expect(next.map.tiles['0,0']?.capturePoints).toBe(8);
    expect(next.map.tiles['0,1']?.capturePoints).toBe(12);
    expect(next.map.tiles['1,1']?.capturePoints).toBe(10);
  });
});


