import type { AiStrategy } from './types';

export const captainStrategy: AiStrategy = {
  profile: 'captain',
  getHqThreatContactThreshold: (ctx) => (ctx.groundOnlyBattle ? 2 : 1),
  canForceHqPush: (ctx) =>
    Boolean(
      ctx.enemyHq
      && ctx.capturableTargetCount <= (ctx.groundOnlyBattle ? 3 : 2),
    ),
  getDesiredReconCount: () => 1,
  chooseProductionOverride: (ctx) => {
    if (ctx.canAfford('RECON') && ctx.ownCounts.RECON === 0) {
      return 'RECON';
    }
    return null;
  },
  getMoveScoreBonus: (ctx) => {
    if (ctx.canCapture && ctx.hasFrontlineNearby) {
      return 5;
    }
    return 0;
  },
};
