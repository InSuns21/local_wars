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
    expect(attacked.state.units.p2_tank.hp).toBeLessThan(10);
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

});






