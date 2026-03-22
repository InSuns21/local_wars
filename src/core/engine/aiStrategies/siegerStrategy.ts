import type { AiStrategy } from './types';

export const siegerStrategy: AiStrategy = {
  profile: 'sieger',
  chooseProductionOverride: (ctx) => {
    if (
      ctx.ownFrontlineCount >= 1
      && ctx.ownCounts.ARTILLERY < Math.max(1, Math.floor(ctx.ownFrontlineCount / 2))
      && ctx.canAfford('ARTILLERY')
    ) {
      return 'ARTILLERY';
    }

    return null;
  },
  getMoveScoreBonus: (ctx) => {
    if (ctx.hasIndirectSupportNearby && ctx.isFrontlineUnit) {
      return 5;
    }
    return 0;
  },
};
