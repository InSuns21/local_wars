import { applyCommand } from '@core/engine/commandApplier';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('commandApplier 統合テスト', () => {
  it('移動コマンドで座標と移動経路が更新される', () => {
    const state = createInitialGameState();
    const { state: next, result } = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(result.ok).toBe(true);
    expect(next.units.p1_tank.position).toEqual({ x: 2, y: 2 });
    expect(next.units.p1_tank.moved).toBe(true);
    expect(next.units.p1_tank.lastMovePath).toEqual([{ x: 2, y: 2 }]);
  });

  it('燃料消費ON時は移動で燃料を消費する', () => {
    const state = createInitialGameState();
    state.enableFuelSupply = true;

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_tank.fuel).toBe(69);
  });

  it('燃料消費ONかつ燃料0のとき移動できない', () => {
    const state = createInitialGameState();
    state.enableFuelSupply = true;
    state.units.p1_tank.fuel = 0;

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(false);
    expect(moved.result.reason).toBe('移動経路を確定できません。');
  });

  it('燃料消費OFF時は移動しても燃料を消費しない', () => {
    const state = createInitialGameState();
    state.enableFuelSupply = false;

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_tank.fuel).toBe(70);
  });

  it('攻撃コマンドで被害が反映される', () => {
    const state = createInitialGameState();
    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    ).state;

    const attacked = applyCommand(
      moved,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p2_tank?.hp ?? 0).toBeLessThan(10);
  });
  it('攻撃ログ詳細に味方/敵HPの戦闘前後が記録される', () => {
    const state = createInitialGameState();
    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    ).state;

    const attacked = applyCommand(
      moved,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    const attackLog = attacked.state.actionLog.find((log) => log.action === 'ATTACK');
    expect(attackLog).toBeDefined();
    expect(attackLog?.detail).toContain('味方HP:');
    expect(attackLog?.detail).toContain('敵HP:');
    expect(attackLog?.detail).toContain('->');
  });

  it('弾薬消費ON時は攻撃で弾薬を1消費する', () => {
    const state = createInitialGameState();
    state.enableAmmoSupply = true;
    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    ).state;

    const attacked = applyCommand(
      moved,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p1_tank.ammo).toBe(5);
  });

  it('弾薬0の防御側は反撃できない', () => {
    const state = createInitialGameState();
    state.enableAmmoSupply = true;
    state.units.p2_tank.ammo = 0;

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    ).state;

    const attacked = applyCommand(
      moved,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p1_tank.hp).toBe(10);
  });

  it('戦闘でHP0になったユニットは消滅する', () => {
    const state = createInitialGameState();
    state.units.p2_tank.hp = 1;

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    ).state;

    const attacked = applyCommand(
      moved,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p2_tank).toBeUndefined();
  });

  it('弾薬消費OFF時は攻撃しても弾薬を消費しない', () => {
    const state = createInitialGameState();
    state.enableAmmoSupply = false;
    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    ).state;

    const attacked = applyCommand(
      moved,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p1_tank.ammo).toBe(6);
  });

  it('弾薬消費ONかつ弾薬0なら攻撃できない', () => {
    const state = createInitialGameState();
    state.enableAmmoSupply = true;
    state.units.p1_tank.ammo = 0;

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    ).state;

    const attacked = applyCommand(
      moved,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(false);
    expect(attacked.result.reason).toBe('弾薬が不足しています。');
  });

  it('ターン終了で手番が交代し次手番へ拠点収入が加算される', () => {
    const state = createInitialGameState();
    const p2Before = state.players.P2.funds;

    const { state: next, result } = applyCommand(state, { type: 'END_TURN' }, { rng: () => 0.5 });

    expect(result.ok).toBe(true);
    expect(next.currentPlayerId).toBe('P2');
    expect(next.turn).toBe(1);
    // P2所有: HQ(1) + FACTORY(1) + CITY(1) + AIRPORT(1) = 4拠点、既定収入1000
    expect(next.players.P2.funds).toBe(p2Before + 4000);
  });

  it('生産コマンドで資金消費とユニット追加が行われる', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 1, y: 1 };

    const { state: next, result } = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 0, y: 1 },
        unitType: 'INFANTRY',
      },
      { rng: () => 0.5 },
    );

    expect(result.ok).toBe(true);
    expect(next.players.P1.funds).toBe(9000);
    expect(Object.values(next.units).some((u) => u.id.startsWith('P1_INFANTRY_'))).toBe(true);
  });

  it('空港では航空ユニットを生産できる', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 1, y: 1 };
    state.players.P1.funds = 20000;

    const { state: next, result } = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 0, y: 2 },
        unitType: 'FIGHTER',
      },
      { rng: () => 0.5 },
    );

    expect(result.ok).toBe(true);
    expect(Object.values(next.units).some((u) => u.id.startsWith('P1_FIGHTER_'))).toBe(true);
  });

  it('工場では間接対空地上ユニットを生産できる', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 1, y: 1 };
    state.players.P1.funds = 12000;

    const { state: next, result } = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 0, y: 1 },
        unitType: 'MISSILE_AA',
      },
      { rng: () => 0.5 },
    );

    expect(result.ok).toBe(true);
    expect(Object.values(next.units).some((u) => u.id.startsWith('P1_MISSILE_AA_'))).toBe(true);
  });

  it('工場では重戦車を生産できる', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 1, y: 1 };
    state.players.P1.funds = 15000;

    const { state: next, result } = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 0, y: 1 },
        unitType: 'HEAVY_TANK',
      },
      { rng: () => 0.5 },
    );

    expect(result.ok).toBe(true);
    expect(Object.values(next.units).some((u) => u.id.startsWith('P1_HEAVY_TANK_'))).toBe(true);
  });

  it('工場では輸送車を生産できる', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 1, y: 1 };
    state.players.P1.funds = 10000;

    const { state: next, result } = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 0, y: 1 },
        unitType: 'TRANSPORT_TRUCK',
      },
      { rng: () => 0.5 },
    );

    expect(result.ok).toBe(true);
    expect(Object.values(next.units).some((u) => u.id.startsWith('P1_TRANSPORT_TRUCK_'))).toBe(true);
  });

  it('空港では輸送ヘリを生産できる', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 1, y: 1 };
    state.players.P1.funds = 20000;

    const { state: next, result } = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 0, y: 2 },
        unitType: 'TRANSPORT_HELI',
      },
      { rng: () => 0.5 },
    );

    expect(result.ok).toBe(true);
    expect(Object.values(next.units).some((u) => u.id.startsWith('P1_TRANSPORT_HELI_'))).toBe(true);
  });

  it('輸送車は軽地上ユニットを搭載して降車できる', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'TRANSPORT_TRUCK',
      fuel: 80,
      ammo: 0,
      position: { x: 2, y: 1 },
      moved: false,
      acted: false,
      cargo: [],
    };
    state.units.p1_inf.position = { x: 1, y: 1 };
    delete state.units.p2_tank;

    const loaded = applyCommand(
      state,
      { type: 'LOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf' },
      { rng: () => 0.5 },
    );

    expect(loaded.result.ok).toBe(true);
    expect(loaded.state.units.p1_inf).toBeUndefined();
    expect(loaded.state.units.p1_tank.cargo?.map((unit) => unit.id)).toEqual(['p1_inf']);

    loaded.state.units.p1_tank.acted = false;
    const unloaded = applyCommand(
      loaded.state,
      { type: 'UNLOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf', to: { x: 3, y: 1 } },
      { rng: () => 0.5 },
    );

    expect(unloaded.result.ok).toBe(true);
    expect(unloaded.state.units.p1_inf.position).toEqual({ x: 3, y: 1 });
    expect(unloaded.state.units.p1_inf.moved).toBe(true);
    expect(unloaded.state.units.p1_inf.acted).toBe(true);
  });

  it('輸送ヘリは歩兵のみを移動後でも降車できる', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'TRANSPORT_HELI',
      fuel: 70,
      ammo: 0,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      cargo: [],
    };
    state.units.p1_inf.position = { x: 2, y: 1 };
    delete state.units.p2_tank;

    const loaded = applyCommand(
      state,
      { type: 'LOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf' },
      { rng: () => 0.5 },
    );
    expect(loaded.result.ok).toBe(true);

    loaded.state.units.p1_tank.moved = true;
    const unloaded = applyCommand(
      loaded.state,
      { type: 'UNLOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf', to: { x: 2, y: 3 } },
      { rng: () => 0.5 },
    );

    expect(unloaded.result.ok).toBe(true);
    expect(unloaded.state.units.p1_inf.position).toEqual({ x: 2, y: 3 });
  });

  it('搭載後も輸送ユニットは移動できる', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'TRANSPORT_TRUCK',
      fuel: 80,
      ammo: 0,
      position: { x: 2, y: 1 },
      moved: false,
      acted: false,
      cargo: [],
    };
    state.units.p1_inf.position = { x: 1, y: 1 };
    delete state.units.p2_tank;

    const loaded = applyCommand(
      state,
      { type: 'LOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf' },
      { rng: () => 0.5 },
    );

    expect(loaded.result.ok).toBe(true);
    expect(loaded.state.units.p1_tank.acted).toBe(false);

    const moved = applyCommand(
      loaded.state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 3, y: 1 } },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_tank.position).toEqual({ x: 3, y: 1 });
  });

  it('降車後も輸送ユニットは移動できる', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'TRANSPORT_TRUCK',
      fuel: 80,
      ammo: 0,
      position: { x: 2, y: 1 },
      moved: false,
      acted: false,
      cargo: [
        {
          ...state.units.p1_inf,
          position: { x: 2, y: 1 },
          moved: true,
          acted: true,
          lastMovePath: [],
        },
      ],
    };
    delete state.units.p1_inf;
    delete state.units.p2_tank;

    const unloaded = applyCommand(
      state,
      { type: 'UNLOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf', to: { x: 3, y: 1 } },
      { rng: () => 0.5 },
    );

    expect(unloaded.result.ok).toBe(true);
    expect(unloaded.state.units.p1_tank.acted).toBe(false);

    const moved = applyCommand(
      unloaded.state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_tank.position).toEqual({ x: 2, y: 2 });
  });

  it('輸送ユニットは移動後でも搭載と降車ができる', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'TRANSPORT_TRUCK',
      fuel: 80,
      ammo: 0,
      position: { x: 1, y: 2 },
      moved: false,
      acted: false,
      cargo: [],
    };
    state.units.p1_inf.position = { x: 2, y: 1 };
    delete state.units.p2_tank;

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_tank.moved).toBe(true);
    expect(moved.state.units.p1_tank.acted).toBe(false);

    const loaded = applyCommand(
      moved.state,
      { type: 'LOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf' },
      { rng: () => 0.5 },
    );

    expect(loaded.result.ok).toBe(true);
    expect(loaded.state.units.p1_inf).toBeUndefined();

    const unloaded = applyCommand(
      loaded.state,
      { type: 'UNLOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf', to: { x: 3, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(unloaded.result.ok).toBe(true);
    expect(unloaded.state.units.p1_inf.position).toEqual({ x: 3, y: 2 });
  });

  it('搭載は1ターンに1回までしか実行できない', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'TRANSPORT_TRUCK',
      fuel: 80,
      ammo: 0,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      cargo: [],
    };
    state.units.p1_inf.position = { x: 2, y: 1 };
    state.units.p2_inf = {
      ...state.units.p2_inf,
      owner: 'P1',
      position: { x: 3, y: 2 },
      moved: false,
      acted: false,
    };
    state.units.p2_tank.position = { x: 5, y: 5 };

    const firstLoad = applyCommand(
      state,
      { type: 'LOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p1_inf' },
      { rng: () => 0.5 },
    );

    expect(firstLoad.result.ok).toBe(true);

    const secondLoad = applyCommand(
      firstLoad.state,
      { type: 'LOAD', transportUnitId: 'p1_tank', cargoUnitId: 'p2_inf' },
      { rng: () => 0.5 },
    );

    expect(secondLoad.result.ok).toBe(false);
    expect(secondLoad.result.reason).toBe('搭載は1ターンに1回までです。');
  });

  it('降車は1ターンに1回までしか実行できない', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'TRANSPORT_TRUCK',
      fuel: 80,
      ammo: 0,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      cargo: [
        {
          ...state.units.p1_inf,
          id: 'cargo_inf_1',
          position: { x: 2, y: 2 },
          moved: true,
          acted: true,
          lastMovePath: [],
        },
        {
          ...state.units.p1_inf,
          id: 'cargo_inf_2',
          position: { x: 2, y: 2 },
          moved: true,
          acted: true,
          lastMovePath: [],
        },
      ],
    };
    delete state.units.p1_inf;
    delete state.units.p2_tank;

    const firstUnload = applyCommand(
      state,
      { type: 'UNLOAD', transportUnitId: 'p1_tank', cargoUnitId: 'cargo_inf_1', to: { x: 3, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(firstUnload.result.ok).toBe(true);

    const secondUnload = applyCommand(
      firstUnload.state,
      { type: 'UNLOAD', transportUnitId: 'p1_tank', cargoUnitId: 'cargo_inf_2', to: { x: 2, y: 3 } },
      { rng: () => 0.5 },
    );

    expect(secondUnload.result.ok).toBe(false);
    expect(secondUnload.result.reason).toBe('降車は1ターンに1回までです。');
  });

  it('輸送ユニットが破壊されると cargo もまとめて失われる', () => {
    const state = createInitialGameState();
    state.currentPlayerId = 'P2';
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'TRANSPORT_TRUCK',
      hp: 1,
      position: { x: 2, y: 2 },
      cargo: [
        {
          ...state.units.p1_inf,
          position: { x: 2, y: 2 },
          moved: true,
          acted: true,
        },
      ],
    };
    delete state.units.p1_inf;
    state.units.p2_tank.position = { x: 3, y: 2 };

    const attacked = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p2_tank', defenderId: 'p1_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p1_tank).toBeUndefined();
    expect(Object.values(attacked.state.units).some((unit) => unit.id === 'p1_inf')).toBe(false);
  });

  it('攻撃機は施設爆撃できない', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'ATTACKER',
      position: { x: 1, y: 1 },
      ammo: 6,
      moved: false,
      acted: false,
    };
    state.map.tiles['2,1'] = {
      coord: { x: 2, y: 1 },
      terrainType: 'CITY',
      owner: 'P2',
      capturePoints: 10,
      structureHp: 10,
      operational: true,
    };

    const attacked = applyCommand(
      state,
      { type: 'ATTACK_TILE', attackerId: 'p1_tank', target: { x: 2, y: 1 } },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(false);
    expect(attacked.result.reason).toBe('このユニットは施設爆撃できません。');
  });

  it('爆撃機は施設を爆撃して機能停止にできる', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 4, y: 4 };
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'BOMBER',
      position: { x: 1, y: 1 },
      ammo: 6,
      moved: false,
      acted: false,
    };
    state.map.tiles['2,1'] = {
      coord: { x: 2, y: 1 },
      terrainType: 'CITY',
      owner: 'P2',
      capturePoints: 10,
      structureHp: 1,
      operational: true,
    };

    const attacked = applyCommand(
      state,
      { type: 'ATTACK_TILE', attackerId: 'p1_tank', target: { x: 2, y: 1 } },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.map.tiles['2,1'].operational).toBe(false);
    expect(attacked.state.map.tiles['2,1'].owner).toBeUndefined();
    expect(attacked.state.map.tiles['2,1'].captureTargetOverride).toBeGreaterThan(10);
  });

  it('防御補正が同じ同兵種の近接戦闘は双方の被害が同程度になる', () => {
    const state = createInitialGameState();
    state.units.p1_tank.position = { x: 2, y: 2 };
    state.units.p2_tank.position = { x: 3, y: 2 };

    state.map.tiles['2,2'] = { ...state.map.tiles['2,2'], terrainType: 'ROAD' };
    state.map.tiles['3,2'] = { ...state.map.tiles['3,2'], terrainType: 'BRIDGE' };

    const attacked = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);

    const attackerLoss = 10 - (attacked.state.units.p1_tank?.hp ?? 0);
    const defenderLoss = 10 - (attacked.state.units.p2_tank?.hp ?? 0);
    expect(Math.abs(attackerLoss - defenderLoss)).toBeLessThanOrEqual(1);
  });
  it('mountain infantry defense bonus reduces damage', () => {
    const plainState = createInitialGameState();
    plainState.units.p1_tank.position = { x: 2, y: 2 };
    plainState.units.p2_inf.position = { x: 3, y: 2 };
    plainState.units.p2_tank.position = { x: 4, y: 4 };
    plainState.map.tiles['3,2'] = {
      ...plainState.map.tiles['3,2'],
      terrainType: 'PLAIN',
    };

    const mountainState = createInitialGameState();
    mountainState.units.p1_tank.position = { x: 2, y: 2 };
    mountainState.units.p2_inf.position = { x: 3, y: 2 };
    mountainState.units.p2_tank.position = { x: 4, y: 4 };
    mountainState.map.tiles['3,2'] = {
      ...mountainState.map.tiles['3,2'],
      terrainType: 'MOUNTAIN',
    };

    const plainAttack = applyCommand(
      plainState,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_inf' },
      { rng: () => 0.5 },
    );

    const mountainAttack = applyCommand(
      mountainState,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_inf' },
      { rng: () => 0.5 },
    );

    expect(plainAttack.result.ok).toBe(true);
    expect(mountainAttack.result.ok).toBe(true);

    const plainDamage = 10 - (plainAttack.state.units.p2_inf?.hp ?? 0);
    const mountainDamage = 10 - (mountainAttack.state.units.p2_inf?.hp ?? 0);

    expect(mountainDamage).toBeLessThan(plainDamage);
  });

  it('中立工場では生産できない', () => {
    const state = createInitialGameState();

    const produced = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 2, y: 0 },
        unitType: 'INFANTRY',
      },
      { rng: () => 0.5 },
    );

    expect(produced.result.ok).toBe(false);
    expect(produced.result.reason).toBe('自軍生産拠点でのみ生産できます。');
  });

  it('FoWで不可視敵に接触すると移動中断して遭遇戦になる（移動側は先制不可）', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.currentPlayerId = 'P1';
    state.enableAmmoSupply = true;

    state.units = {
      p1_inf: {
        ...state.units.p1_inf,
        position: { x: 1, y: 2 },
        hp: 10,
        ammo: 0,
        moved: false,
        acted: false,
        lastMovePath: [],
      },
      p2_tank: {
        ...state.units.p2_tank,
        position: { x: 4, y: 2 },
        hp: 10,
        ammo: 6,
        moved: false,
        acted: false,
        lastMovePath: [],
      },
    };

    const moved = applyCommand(
      state,
      {
        type: 'MOVE_UNIT',
        unitId: 'p1_inf',
        to: { x: 4, y: 2 },
        path: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
      },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_inf).toBeDefined();
    expect(moved.state.units.p1_inf.position).toEqual({ x: 3, y: 2 });
    expect(moved.state.units.p1_inf.moved).toBe(true);
    expect(moved.state.units.p1_inf.acted).toBe(true);
    expect(moved.state.units.p1_inf.lastMovePath).toEqual([{ x: 2, y: 2 }, { x: 3, y: 2 }]);
    expect(moved.state.units.p1_inf.hp).toBeLessThan(10);
    expect(moved.state.units.p2_tank.hp).toBe(10);

    expect(moved.state.actionLog.some((log) => log.action === 'FOG_ENCOUNTER')).toBe(true);
    expect(moved.state.actionLog.some((log) => log.action === 'MOVE_UNIT')).toBe(false);
  });

  it('FoWで可視敵が移動経路上にいる場合は遭遇戦にならず移動失敗になる', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.currentPlayerId = 'P1';

    state.units = {
      p1_tank: {
        ...state.units.p1_tank,
        position: { x: 1, y: 2 },
        moved: false,
        acted: false,
      },
      p2_inf: {
        ...state.units.p2_inf,
        position: { x: 4, y: 2 },
        hp: 10,
        moved: false,
        acted: false,
      },
    };

    const moved = applyCommand(
      state,
      {
        type: 'MOVE_UNIT',
        unitId: 'p1_tank',
        to: { x: 4, y: 2 },
        path: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }],
      },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(false);
    expect(moved.result.reason).toBe('移動経路を確定できません。');
  });

  it('移動後の残移動量が0のときは攻撃できない', () => {
    const state = createInitialGameState();
    state.enableFuelSupply = true;
    state.units.p1_tank.fuel = 1;
    state.units.p2_tank.position = { x: 3, y: 2 };

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_tank.movePointsRemaining).toBe(0);

    const attacked = applyCommand(
      moved.state,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(false);
    expect(attacked.result.reason).toBe('移動余裕がないため攻撃できません。');
  });

  it('移動後の残移動量が1以上なら攻撃できる', () => {
    const state = createInitialGameState();
    state.enableFuelSupply = true;
    state.units.p1_tank.fuel = 2;
    state.units.p2_tank.position = { x: 3, y: 2 };

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_tank.movePointsRemaining).toBe(1);

    const attacked = applyCommand(
      moved.state,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
  });

  it('移動経路上に味方ユニットがいても通過して移動できる', () => {
    const state = createInitialGameState();

    state.units.p1_inf.position = { x: 2, y: 2 };
    state.units.p1_tank.position = { x: 1, y: 2 };

    const moved = applyCommand(
      state,
      {
        type: 'MOVE_UNIT',
        unitId: 'p1_tank',
        to: { x: 2, y: 1 },
        path: [{ x: 2, y: 2 }, { x: 2, y: 1 }],
      },
      { rng: () => 0.5 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_tank.position).toEqual({ x: 2, y: 1 });
  });

  it('工場で補給車を生産でき、初期補給回数が設定値で入る', () => {
    const state = createInitialGameState();
    state.maxSupplyCharges = 5;
    state.players.P1.funds = 10000;
    state.units.p1_inf.position = { x: 1, y: 1 };

    const produced = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 0, y: 1 },
        unitType: 'SUPPLY_TRUCK',
      },
      { rng: () => 0.5 },
    );

    expect(produced.result.ok).toBe(true);
    const truck = Object.values(produced.state.units).find((unit) => unit.type === 'SUPPLY_TRUCK');
    expect(truck?.supplyCharges).toBe(5);
  });

  it('空港で空中補給機を生産できる', () => {
    const state = createInitialGameState();
    state.players.P1.funds = 20000;
    state.units.p1_inf.position = { x: 1, y: 1 };

    const produced = applyCommand(
      state,
      {
        type: 'PRODUCE_UNIT',
        playerId: 'P1',
        factoryCoord: { x: 0, y: 2 },
        unitType: 'AIR_TANKER',
      },
      { rng: () => 0.5 },
    );

    expect(produced.result.ok).toBe(true);
    expect(Object.values(produced.state.units).some((unit) => unit.type === 'AIR_TANKER')).toBe(true);
  });

  it('補給コマンドで周囲1マスの味方地上ユニットをまとめて補給する', () => {
    const state = createInitialGameState();
    state.maxSupplyCharges = 4;
    state.units.p1_truck = {
      id: 'p1_truck',
      owner: 'P1',
      type: 'SUPPLY_TRUCK',
      hp: 10,
      fuel: 20,
      ammo: 0,
      supplyCharges: 3,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };
    state.units.p1_tank.position = { x: 2, y: 1 };
    state.units.p1_tank.fuel = 10;
    state.units.p1_tank.ammo = 1;
    state.units.p1_inf.position = { x: 3, y: 2 };
    state.units.p1_inf.fuel = 12;
    state.units.p1_inf.ammo = 2;

    const supplied = applyCommand(
      state,
      { type: 'SUPPLY', unitId: 'p1_truck' },
      { rng: () => 0.5 },
    );

    expect(supplied.result.ok).toBe(true);
    expect(supplied.state.units.p1_tank.fuel).toBe(70);
    expect(supplied.state.units.p1_tank.ammo).toBe(6);
    expect(supplied.state.units.p1_inf.fuel).toBe(99);
    expect(supplied.state.units.p1_inf.ammo).toBe(9);
    expect(supplied.state.units.p1_truck.supplyCharges).toBe(2);
    expect(supplied.state.units.p1_truck.acted).toBe(true);
  });

  it('空中補給機は航空ユニットだけを補給する', () => {
    const state = createInitialGameState();
    state.units.p1_tanker = {
      id: 'p1_tanker',
      owner: 'P1',
      type: 'AIR_TANKER',
      hp: 10,
      fuel: 30,
      ammo: 0,
      supplyCharges: 2,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };
    state.units.p1_fighter = {
      id: 'p1_fighter',
      owner: 'P1',
      type: 'FIGHTER',
      hp: 10,
      fuel: 5,
      ammo: 1,
      position: { x: 2, y: 1 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };
    state.units.p1_tank.position = { x: 3, y: 2 };
    state.units.p1_tank.fuel = 4;
    state.units.p1_tank.ammo = 1;

    const supplied = applyCommand(
      state,
      { type: 'SUPPLY', unitId: 'p1_tanker' },
      { rng: () => 0.5 },
    );

    expect(supplied.result.ok).toBe(true);
    expect(supplied.state.units.p1_fighter.fuel).toBe(80);
    expect(supplied.state.units.p1_fighter.ammo).toBe(6);
    expect(supplied.state.units.p1_tank.fuel).toBe(4);
  });

  it('戦車は補給車を通常の攻撃対象として攻撃できる', () => {
    const state = createInitialGameState();
    state.units.p1_tank.position = { x: 2, y: 2 };
    state.units.p2_inf = {
      ...state.units.p2_inf,
      type: 'SUPPLY_TRUCK',
      ammo: 0,
      fuel: 70,
      supplyCharges: 4,
      position: { x: 3, y: 2 },
      moved: false,
      acted: false,
    };

    const attacked = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_inf' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p2_inf?.hp ?? 0).toBeLessThan(10);
  });

  it('戦闘機は空中補給機を通常の攻撃対象として攻撃できる', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'FIGHTER',
      fuel: 80,
      ammo: 6,
      position: { x: 4, y: 4 },
      moved: false,
      acted: false,
    };
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'AIR_TANKER',
      fuel: 80,
      ammo: 0,
      supplyCharges: 4,
      position: { x: 5, y: 4 },
      moved: false,
      acted: false,
    };

    const attacked = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p1_tank', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p2_tank?.hp ?? 0).toBeLessThan(10);
  });

  it('自爆ドローンは工場から複数生産され周辺5マスへ自動配置される', () => {
    const state = createInitialGameState();
    state.enableSuicideDrones = true;
    state.players.P1.funds = 10000;

    const produced1 = applyCommand(
      state,
      { type: 'PRODUCE_UNIT', playerId: 'P1', factoryCoord: { x: 0, y: 1 }, unitType: 'SUICIDE_DRONE' },
      { rng: () => 0.5 },
    );
    const produced2 = applyCommand(
      produced1.state,
      { type: 'PRODUCE_UNIT', playerId: 'P1', factoryCoord: { x: 0, y: 1 }, unitType: 'SUICIDE_DRONE' },
      { rng: () => 0.5 },
    );

    expect(produced1.result.ok).toBe(true);
    expect(produced2.result.ok).toBe(true);
    const drones = Object.values(produced2.state.units).filter((unit) => unit.type === 'SUICIDE_DRONE');
    expect(drones).toHaveLength(2);
    expect(drones.some((unit) => unit.position.x === 0 && unit.position.y === 1)).toBe(true);
    expect(drones.every((unit) => unit.originFactoryCoord?.x === 0 && unit.originFactoryCoord?.y === 1)).toBe(true);
    expect(produced2.state.factoryProductionState?.['0,1']?.droneProducedCount).toBe(2);
  });

  it('自爆ドローンは攻撃後に消滅する', () => {
    const state = createInitialGameState();
    state.enableSuicideDrones = true;
    state.units.p1_drone = {
      id: 'p1_drone',
      owner: 'P1',
      type: 'SUICIDE_DRONE',
      hp: 10,
      fuel: 50,
      ammo: 1,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
      originFactoryCoord: { x: 0, y: 1 },
    };
    state.units.p2_tank.position = { x: 3, y: 2 };

    const attacked = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p1_drone', defenderId: 'p2_tank' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p1_drone).toBeUndefined();
    expect(attacked.state.units.p2_tank?.hp ?? 0).toBeLessThan(10);
  });

  it('対ドローン防空車は移動侵入した自爆ドローンを迎撃できる', () => {
    const state = createInitialGameState({ mapId: 'river-crossing' });
    state.enableSuicideDrones = true;
    state.droneInterceptionChancePercent = 100;
    state.droneInterceptionMaxPerTurn = 2;
    state.units.p1_drone = {
      id: 'p1_drone',
      owner: 'P1',
      type: 'SUICIDE_DRONE',
      hp: 10,
      fuel: 50,
      ammo: 1,
      position: { x: 4, y: 4 },
      moved: false,
      acted: false,
      lastMovePath: [],
      originFactoryCoord: { x: 0, y: 1 },
    };
    state.units.p2_counter = {
      id: 'p2_counter',
      owner: 'P2',
      type: 'COUNTER_DRONE_AA',
      hp: 10,
      fuel: 60,
      ammo: 6,
      position: { x: 7, y: 4 },
      moved: false,
      acted: false,
      lastMovePath: [],
      interceptsUsedThisTurn: 0,
    };

    const moved = applyCommand(
      state,
      { type: 'MOVE_UNIT', unitId: 'p1_drone', to: { x: 6, y: 4 }, path: [{ x: 5, y: 4 }, { x: 6, y: 4 }] },
      { rng: () => 0 },
    );

    expect(moved.result.ok).toBe(true);
    expect(moved.state.units.p1_drone).toBeUndefined();
    expect(moved.state.units.p2_counter.ammo).toBe(5);
    expect(moved.state.actionLog.some((entry) => entry.action === 'DRONE_INTERCEPT' && entry.detail?.includes('迎撃成功'))).toBe(true);
  });

});






