import { createInitialGameState } from '@core/engine/createInitialGameState';
import { createGameStore } from '@store/gameStore';

describe('gameStore 追加カバレッジ', () => {
  it('dispatchCommandでUNDOを渡すとundo分岐を通る', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });

    const result = store.getState().dispatchCommand({ type: 'UNDO' });

    expect(result.ok).toBe(false);
  });

  it('simulateCombatはID不正時null、正常時は予測を返す', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });

    expect(store.getState().simulateCombat('nope', 'p2_tank')).toBeNull();

    const forecast = store.getState().simulateCombat('p1_tank', 'p2_tank');
    expect(forecast).not.toBeNull();
  });

  it('getAttackRangeとbuildMovePathは存在しないユニットIDで空/nullを返す', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });

    expect(store.getState().getAttackRange('unknown')).toEqual([]);
    expect(store.getState().buildMovePath('unknown', { x: 1, y: 1 })).toBeNull();
  });

  it('setGameStateで履歴がリセットされる', () => {
    const state = createInitialGameState();
    const store = createGameStore(state, { rng: () => 0.5 });

    store.getState().dispatchCommand({ type: 'MOVE_UNIT', unitId: 'p1_tank', to: { x: 2, y: 2 } });
    expect(store.getState().history.length).toBeGreaterThan(0);

    const next = createInitialGameState({ mapId: 'river-crossing' });
    store.getState().setGameState(next);

    expect(store.getState().history).toHaveLength(0);
    expect(store.getState().gameState.map.width).toBe(14);
  });
});
