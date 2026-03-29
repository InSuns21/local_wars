import { applyNightmareWeightMultipliers } from '@core/engine/aiNightmareTuning';

describe('aiNightmareTuning', () => {
  it('nightmare以外では重みを変更しない', () => {
    const base = {
      captureBias: 1,
      killBias: 1,
      safetyBias: 1,
      hqPressureBias: 1,
      artilleryBias: 1,
      antiAirBias: 1,
      droneBias: 1,
      stealthBias: 1,
      navalBias: 1,
      supplyBias: 1,
      scoutBias: 1,
    };

    expect(applyNightmareWeightMultipliers(base, 'captain', 'hard')).toEqual(base);
  });
});

