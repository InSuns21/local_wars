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

  it('PRODUCE_UNITで手番不一致/工場外/工場占有を弾く', () => {
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
