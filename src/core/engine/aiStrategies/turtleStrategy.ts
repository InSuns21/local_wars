import type { AiStrategy } from './types';

export const turtleStrategy: AiStrategy = {
  profile: 'turtle',
  chooseProductionOverride: (ctx) => {
    if (
      ctx.ownFrontlineCount >= 1
      && ctx.ownCounts.ARTILLERY < Math.max(1, Math.floor(ctx.ownFrontlineCount / 2))
      && ctx.canAfford('ARTILLERY')
    ) {
      return 'ARTILLERY';
    }

    if (
      ctx.canAfford('MISSILE_AA')
      && ctx.ownCounts.MISSILE_AA === 0
      && (
        Object.values(ctx.state.map.tiles).some((tile) => tile.terrainType === 'AIRPORT')
        || (ctx.state.enableSuicideDrones ?? false)
      )
    ) {
      return 'MISSILE_AA';
    }

    return null;
  },
  getMoveScoreBonus: (ctx) => {
    if (ctx.tileOwnerIsUnitOwner && ctx.tileIsCapturableTerrain) {
      return 6;
    }
    return 0;
  },
};
