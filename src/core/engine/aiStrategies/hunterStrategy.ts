import type { AiStrategy } from './types';

export const hunterStrategy: AiStrategy = {
  profile: 'hunter',
  adjustDesiredCapturerCount: (ctx, base) =>
    Math.max(1, Math.min(base, ctx.groundOnlyBattle ? 2 : 3)),
  canForceHqPush: (ctx) =>
    Boolean(
      ctx.enemyHq
      && ctx.frontlineUnitCount >= Math.max(1, ctx.desiredFrontlineCount - 1)
      && ctx.capturerCount >= 1
      && ctx.frontlineCanReachEnemyHq
      && ctx.capturableTargetCount <= (ctx.groundOnlyBattle ? 4 : 3)
      && ctx.lowSupplyUnitCount <= ctx.lowSupplyLimit,
    ),
  getDesiredReconCount: (ctx) => {
    const base = (ctx.state.fogOfWar ?? false) ? 2 : 1;
    return Math.min(2, Math.max(1, Math.min(base, Math.ceil(ctx.plan.desiredFrontlineCount / 2))));
  },
  shouldAvoidEmergencySupportProduction: () => true,
  shouldAvoidSupplyShipProduction: () => true,
  chooseProductionOverride: (ctx) => {
    if (ctx.canAfford('TANK')) {
      return 'TANK';
    }
    return null;
  },
};
