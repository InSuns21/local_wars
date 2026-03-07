import { createInitialGameState } from '@core/engine/createInitialGameState';
import { createGameStore } from '@store/gameStore';

describe('store AI手番統合', () => {
  it('END_TURN後にAI手番が自動進行する', () => {
    const initial = createInitialGameState({
      settings: {
        aiDifficulty: 'easy',
        humanPlayerSide: 'P1',
        fogOfWar: false,
        initialFunds: 10000,
        incomePerProperty: 1000,
        incomeAirport: 1000,
        incomePort: 1000,
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

    const store = createGameStore(initial, { rng: () => 0.5 });

    const result = store.getState().endTurn();
    expect(result.ok).toBe(true);

    const next = store.getState().gameState;
    expect(next.currentPlayerId).toBe('P1');
    expect(next.turn).toBe(2);
    expect(next.actionLog.some((log) => log.playerId === 'P2' && log.action === 'END_TURN')).toBe(true);
  });
});
