import type { AiStrategy } from './types';

export const droneSwarmStrategy: AiStrategy = {
  profile: 'drone_swarm',
  chooseProductionOverride: (ctx) => {
    if (!(ctx.state.enableSuicideDrones ?? false)) {
      return null;
    }

    const enemyAirCount =
      ctx.enemyCounts.FIGHTER
      + ctx.enemyCounts.BOMBER
      + ctx.enemyCounts.ATTACKER
      + ctx.enemyCounts.STEALTH_BOMBER
      + ctx.enemyCounts.AIR_TANKER
      + ctx.enemyCounts.TRANSPORT_HELI;
    const droneThreat = ctx.enemyCounts.SUICIDE_DRONE + enemyAirCount;
    const desiredCounterDrone = droneThreat > 0 ? Math.max(1, Math.ceil(droneThreat / 2)) : 0;

    if (
      desiredCounterDrone > 0
      && ctx.canAfford('COUNTER_DRONE_AA')
      && ctx.ownCounts.COUNTER_DRONE_AA < desiredCounterDrone
    ) {
      return 'COUNTER_DRONE_AA';
    }

    return null;
  },
  chooseDroneProductionOverride: (ctx) => {
    if (!(ctx.state.enableSuicideDrones ?? false) || !ctx.canAfford('SUICIDE_DRONE')) {
      return null;
    }
    if (ctx.openSlots < 1) {
      return null;
    }
    const profileRatioLimit = Math.min(100, ctx.ratioLimit + 20);
    if (ctx.totalUnitCount > 0 && (ctx.activeDroneCount / ctx.totalUnitCount) * 100 >= profileRatioLimit) {
      return null;
    }
    return 'SUICIDE_DRONE';
  },
  getMoveScoreBonus: (ctx) => {
    let score = 0;

    if (ctx.unit.type === 'SUICIDE_DRONE') {
      if (ctx.nearestStrikeTargetDistance !== null) {
        score -= ctx.nearestStrikeTargetDistance * 3 * ctx.weights.droneBias;
      }
      score -= ctx.droneCounterPressure * 9 * ctx.weights.safetyBias;
      if (ctx.hasFrontlineOrCounterDroneNearby) {
        score += 5 * ctx.weights.droneBias;
      }
    }

    if (ctx.unit.type === 'COUNTER_DRONE_AA') {
      if (ctx.nearestDroneThreatDistance !== null) {
        score -= ctx.nearestDroneThreatDistance * 2.4 * ctx.weights.antiAirBias;
      }
      if (ctx.nearestCoreDistance !== null) {
        score -= ctx.nearestCoreDistance * 1.8 * ctx.weights.antiAirBias;
      }
      if (ctx.ownHq && Math.abs(ctx.to.x - ctx.ownHq.x) + Math.abs(ctx.to.y - ctx.ownHq.y) <= 2) {
        score += 8 * ctx.weights.antiAirBias;
      }
      if (ctx.hasHighValueOrDroneAllyNearby) {
        score += 4 * ctx.weights.antiAirBias;
      }
    }

    return score;
  },
};
