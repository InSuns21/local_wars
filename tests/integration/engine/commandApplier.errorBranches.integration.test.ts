import { applyCommand } from '@core/engine/commandApplier';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('commandApplier 失敗分岐', () => {
  it('勝敗確定後はコマンドを受け付けない', () => {
    const state = createInitialGameState();
    state.winner = 'P1';

    const res = applyCommand(state, { type: 'END_TURN' }, { rng: () => 0.5 });

    expect(res.result.ok).toBe(false);
  });

  it('UNDOコマンドはエンジン層では失敗を返す', () => {
    const state = createInitialGameState();

    const res = applyCommand(state, { type: 'UNDO' }, { rng: () => 0.5 });

    expect(res.result.ok).toBe(false);
  });

  it('MOVE_UNITで経路終点が不一致なら失敗する', () => {
    const state = createInitialGameState();

    const res = applyCommand(
      state,
      {
        type: 'MOVE_UNIT',
        unitId: 'p1_tank',
        to: { x: 2, y: 2 },
        path: [{ x: 2, y: 3 }],
      },
      { rng: () => 0.5 },
    );

    expect(res.result.ok).toBe(false);
  });

  it('MOVE_UNITで不正経路なら失敗する', () => {
    const state = createInitialGameState();

    const res = applyCommand(
      state,
      {
        type: 'MOVE_UNIT',
        unitId: 'p1_tank',
        to: { x: 3, y: 1 },
        path: [{ x: 3, y: 1 }],
      },
      { rng: () => 0.5 },
    );

    expect(res.result.ok).toBe(false);
  });

  it('ATTACKで攻撃対象不正/味方攻撃/射程外を弾く', () => {
    const state = createInitialGameState();

    const invalidTarget = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'nope' },
      { rng: () => 0.5 },
    );
    expect(invalidTarget.result.ok).toBe(false);

    const friendly = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p1_inf' },
      { rng: () => 0.5 },
    );
    expect(friendly.result.ok).toBe(false);

    const outRange = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_inf' },
      { rng: () => 0.5 },
    );
    expect(outRange.result.ok).toBe(false);
  });

  it('CAPTUREで占領不可ユニットは失敗する', () => {
    const state = createInitialGameState();
    state.units.p1_tank.position = { x: 2, y: 2 };

    const res = applyCommand(state, { type: 'CAPTURE', unitId: 'p1_tank' }, { rng: () => 0.5 });

    expect(res.result.ok).toBe(false);
  });

  it('PRODUCE_UNITで手番不一致/工場外/工場占有/拠点不適合/資金不足を弾く', () => {
    const state = createInitialGameState();

    const wrongTurn = applyCommand(
      state,
      { type: 'PRODUCE_UNIT', playerId: 'P2', factoryCoord: { x: 4, y: 3 }, unitType: 'INFANTRY' },
      { rng: () => 0.5 },
    );
    expect(wrongTurn.result.ok).toBe(false);

    const notFactory = applyCommand(
      state,
      { type: 'PRODUCE_UNIT', playerId: 'P1', factoryCoord: { x: 2, y: 2 }, unitType: 'INFANTRY' },
      { rng: () => 0.5 },
    );
    expect(notFactory.result.ok).toBe(false);

    state.units.p1_inf.position = { x: 0, y: 1 };
    const occupied = applyCommand(
      state,
      { type: 'PRODUCE_UNIT', playerId: 'P1', factoryCoord: { x: 0, y: 1 }, unitType: 'INFANTRY' },
      { rng: () => 0.5 },
    );
    expect(occupied.result.ok).toBe(false);

    const wrongProductionSite = applyCommand(
      createInitialGameState(),
      { type: 'PRODUCE_UNIT', playerId: 'P1', factoryCoord: { x: 0, y: 1 }, unitType: 'FIGHTER' },
      { rng: () => 0.5 },
    );
    expect(wrongProductionSite.result.ok).toBe(false);
    expect(wrongProductionSite.result.reason).toBe('この拠点ではそのユニットを生産できません。');

    const poorState = createInitialGameState();
    poorState.players.P1.funds = 0;
    const noFunds = applyCommand(
      poorState,
      { type: 'PRODUCE_UNIT', playerId: 'P1', factoryCoord: { x: 0, y: 1 }, unitType: 'INFANTRY' },
      { rng: () => 0.5 },
    );
    expect(noFunds.result.ok).toBe(false);
    expect(noFunds.result.reason).toBe('資金が不足しています。');
  });

  it('ATTACK_TILEで占有タイル/弾薬不足/射程外を弾く', () => {
    const occupiedState = createInitialGameState();
    occupiedState.units.p1_tank = {
      ...occupiedState.units.p1_tank,
      type: 'BOMBER',
      position: { x: 1, y: 1 },
      ammo: 6,
      moved: false,
      acted: false,
    };
    occupiedState.units.p1_inf.position = { x: 4, y: 4 };
    occupiedState.units.p2_inf.position = { x: 2, y: 1 };
    occupiedState.map.tiles['2,1'] = {
      coord: { x: 2, y: 1 },
      terrainType: 'CITY',
      owner: 'P2',
      capturePoints: 10,
      structureHp: 10,
      operational: true,
    };
    const occupied = applyCommand(
      occupiedState,
      { type: 'ATTACK_TILE', attackerId: 'p1_tank', target: { x: 2, y: 1 } },
      { rng: () => 0.5 },
    );
    expect(occupied.result.ok).toBe(false);
    expect(occupied.result.reason).toContain('ユニット');

    const noAmmoState = createInitialGameState();
    noAmmoState.units.p1_tank = {
      ...noAmmoState.units.p1_tank,
      type: 'BOMBER',
      position: { x: 1, y: 1 },
      ammo: 0,
      moved: false,
      acted: false,
    };
    noAmmoState.units.p1_inf.position = { x: 4, y: 4 };
    noAmmoState.map.tiles['2,1'] = {
      coord: { x: 2, y: 1 },
      terrainType: 'CITY',
      owner: 'P2',
      capturePoints: 10,
      structureHp: 10,
      operational: true,
    };
    const noAmmo = applyCommand(
      noAmmoState,
      { type: 'ATTACK_TILE', attackerId: 'p1_tank', target: { x: 2, y: 1 } },
      { rng: () => 0.5 },
    );
    expect(noAmmo.result.ok).toBe(false);
    expect(noAmmo.result.reason).toBe('弾薬が不足しています。');

    const outOfRangeState = createInitialGameState();
    outOfRangeState.units.p1_tank = {
      ...outOfRangeState.units.p1_tank,
      type: 'BOMBER',
      position: { x: 0, y: 0 },
      ammo: 6,
      moved: false,
      acted: false,
    };
    outOfRangeState.units.p1_inf.position = { x: 4, y: 4 };
    outOfRangeState.map.tiles['4,1'] = {
      coord: { x: 4, y: 1 },
      terrainType: 'CITY',
      owner: 'P2',
      capturePoints: 10,
      structureHp: 10,
      operational: true,
    };
    const outOfRange = applyCommand(
      outOfRangeState,
      { type: 'ATTACK_TILE', attackerId: 'p1_tank', target: { x: 4, y: 1 } },
      { rng: () => 0.5 },
    );
    expect(outOfRange.result.ok).toBe(false);
    expect(outOfRange.result.reason).toBe('射程外です。');
  });

  it('SUPPLYで補給回数0または対象なしを弾く', () => {
    const noChargeState = createInitialGameState();
    noChargeState.units.p1_truck = {
      id: 'p1_truck',
      owner: 'P1',
      type: 'SUPPLY_TRUCK',
      hp: 10,
      fuel: 30,
      ammo: 0,
      supplyCharges: 0,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };

    const noCharge = applyCommand(
      noChargeState,
      { type: 'SUPPLY', unitId: 'p1_truck' },
      { rng: () => 0.5 },
    );
    expect(noCharge.result.ok).toBe(false);
    expect(noCharge.result.reason).toBe('補給回数が残っていません。');

    const noTargetState = createInitialGameState();
    noTargetState.units.p1_truck = {
      id: 'p1_truck',
      owner: 'P1',
      type: 'SUPPLY_TRUCK',
      hp: 10,
      fuel: 30,
      ammo: 0,
      supplyCharges: 1,
      position: { x: 4, y: 0 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };

    const noTarget = applyCommand(
      noTargetState,
      { type: 'SUPPLY', unitId: 'p1_truck' },
      { rng: () => 0.5 },
    );
    expect(noTarget.result.ok).toBe(false);
    expect(noTarget.result.reason).toBe('補給対象が隣接していません。');
  });

  it('補給ユニットは攻撃できない', () => {
    const state = createInitialGameState();
    state.units.p1_truck = {
      id: 'p1_truck',
      owner: 'P1',
      type: 'SUPPLY_TRUCK',
      hp: 10,
      fuel: 30,
      ammo: 0,
      supplyCharges: 2,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };
    state.units.p2_inf.position = { x: 2, y: 1 };

    const attacked = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p1_truck', defenderId: 'p2_inf' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(false);
    expect(attacked.result.reason).toBe('このユニットはその対象を攻撃できません。');
  });

  it('未知コマンドは未対応エラーを返す', () => {
    const state = createInitialGameState();

    const res = applyCommand(
      state,
      { type: 'UNKNOWN' } as unknown as Parameters<typeof applyCommand>[1],
      { rng: () => 0.5 },
    );

    expect(res.result.ok).toBe(false);
  });
});

