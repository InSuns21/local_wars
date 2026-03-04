import { createInitialGameState } from '@core/engine/createInitialGameState';
import { createGameStore } from '@store/gameStore';

describe('gameStore 燃料移動範囲', () => {
  it('燃料補給ON時は燃料残量で移動可能範囲が制限される', () => {
    const state = createInitialGameState();
    state.enableFuelSupply = true;
    state.units.p1_tank.fuel = 1;

    const store = createGameStore(state, { rng: () => 0.5 });
    const range = store.getState().getMoveRange('p1_tank');

    expect(range).toContainEqual({ x: 2, y: 2 });
    expect(range).not.toContainEqual({ x: 3, y: 2 });
  });

  it('燃料補給OFF時は燃料残量に関係なく移動力で移動可能範囲が決まる', () => {
    const state = createInitialGameState();
    state.enableFuelSupply = false;
    state.units.p1_tank.fuel = 1;

    const store = createGameStore(state, { rng: () => 0.5 });
    const range = store.getState().getMoveRange('p1_tank');

    expect(range).toContainEqual({ x: 1, y: 4 });
  });
});


