import { createGameStore } from '@store/gameStore';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('gameStore simulateCombat', () => {
  it('移動後に隣接する自走砲は反撃予測なしになる', () => {
    const state = createInitialGameState();
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'ARTILLERY',
      position: { x: 4, y: 2 },
    };

    const store = createGameStore(state, { rng: () => 0.5 });
    const forecast = store.getState().simulateCombat('p1_tank', 'p2_tank', { x: 3, y: 2 });

    expect(forecast).not.toBeNull();
    expect(forecast?.defenderToAttacker).toBeNull();
  });

  it('距離2から自走砲へ攻撃する予測では反撃が残る', () => {
    const state = createInitialGameState();
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'ARTILLERY',
      position: { x: 4, y: 2 },
    };

    const store = createGameStore(state, { rng: () => 0.5 });
    const forecast = store.getState().simulateCombat('p1_tank', 'p2_tank', { x: 2, y: 2 });

    expect(forecast).not.toBeNull();
    expect(forecast?.defenderToAttacker).not.toBeNull();
  });
});

