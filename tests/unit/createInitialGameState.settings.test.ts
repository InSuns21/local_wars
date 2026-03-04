import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('createInitialGameState 設定反映', () => {
  it('人間担当陣営をP2に設定した場合、開始手番がP2になる', () => {
    const state = createInitialGameState({
      settings: {
        aiDifficulty: 'normal',
        humanPlayerSide: 'P2',
        fogOfWar: false,
        initialFunds: 10000,
        incomePerProperty: 1000,
        hpRecoveryCity: 1,
        hpRecoveryFactory: 2,
        hpRecoveryHq: 3,
        enableAirUnits: true,
        enableNavalUnits: true,
        enableFuelSupply: true,
        enableAmmoSupply: true,
      },
    });

    expect(state.currentPlayerId).toBe('P2');
  });

  it('人間担当陣営をP1に設定した場合、開始手番がP1になる', () => {
    const state = createInitialGameState({
      settings: {
        aiDifficulty: 'normal',
        humanPlayerSide: 'P1',
        fogOfWar: false,
        initialFunds: 10000,
        incomePerProperty: 1000,
        hpRecoveryCity: 1,
        hpRecoveryFactory: 2,
        hpRecoveryHq: 3,
        enableAirUnits: true,
        enableNavalUnits: true,
        enableFuelSupply: true,
        enableAmmoSupply: true,
      },
    });

    expect(state.currentPlayerId).toBe('P1');
  });

  it('索敵/燃料/弾薬の設定値がstateへ反映される', () => {
    const state = createInitialGameState({
      settings: {
        aiDifficulty: 'easy',
        humanPlayerSide: 'P1',
        fogOfWar: true,
        initialFunds: 10000,
        incomePerProperty: 1000,
        hpRecoveryCity: 1,
        hpRecoveryFactory: 2,
        hpRecoveryHq: 3,
        enableAirUnits: true,
        enableNavalUnits: true,
        enableFuelSupply: false,
        enableAmmoSupply: false,
      },
    });

    expect(state.fogOfWar).toBe(true);
    expect(state.enableFuelSupply).toBe(false);
    expect(state.enableAmmoSupply).toBe(false);
  });
});

