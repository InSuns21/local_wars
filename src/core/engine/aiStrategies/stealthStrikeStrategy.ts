import type { AiStrategy } from './types';

export const stealthStrikeStrategy: AiStrategy = {
  profile: 'stealth_strike',
  chooseAirportProductionOverride: (ctx) => {
    if (ctx.enemyHighValueGround && ctx.canAfford('STEALTH_BOMBER')) {
      return 'STEALTH_BOMBER';
    }
    if (ctx.canAfford('AIR_TANKER') && ctx.ownAirCount >= 2 && ctx.ownTankerCount === 0) {
      return 'AIR_TANKER';
    }
    return null;
  },
  chooseNavalProductionPriorityOverride: (ctx) => {
    if (ctx.canAfford('SUBMARINE') && ctx.ownCounts.SUBMARINE === 0) {
      return 'SUBMARINE';
    }
    return null;
  },
  chooseNavalProductionFallbackOverride: (ctx) => {
    if (ctx.canAfford('SUBMARINE')) {
      return 'SUBMARINE';
    }
    return null;
  },
};
