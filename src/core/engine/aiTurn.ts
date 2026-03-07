import { applyCommand, type CommandDeps } from '@core/engine/commandApplier';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { canDealDamage, forecastCombat } from '@core/rules/combat';
import { canUnitProduceAtTile } from '@core/rules/facilities';
import { findMovePath, getReachableTiles } from '@core/rules/movement';
import type { Coord, PlayerId } from '@core/types/game';
import type { GameState } from '@core/types/state';
import type { UnitState, UnitType } from '@core/types/unit';
import { manhattanDistance, toCoordKey } from '@/utils/coord';

export type AiDifficulty = 'easy' | 'normal';

export type AiTurnOptions = {
  difficulty: AiDifficulty;
  deps: CommandDeps;
};

const CAPTURABLE_TERRAINS = new Set(['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT']);
const INDIRECT_SUPPORT_UNITS = new Set<UnitType>(['ARTILLERY', 'FLAK_TANK', 'MISSILE_AA']);
const getEnemyPlayer = (playerId: PlayerId): PlayerId => (playerId === 'P1' ? 'P2' : 'P1');

const getAliveUnits = (state: GameState, owner: PlayerId): UnitState[] =>
  Object.values(state.units).filter((u) => u.owner === owner && u.hp > 0);

const isTileOccupied = (state: GameState, coord: Coord): boolean =>
  Object.values(state.units).some(
    (u) => u.hp > 0 && u.position.x === coord.x && u.position.y === coord.y,
  );

const getEnemyHqCoord = (state: GameState, aiPlayer: PlayerId): Coord | null => {
  const enemy = getEnemyPlayer(aiPlayer);
  const hq = Object.values(state.map.tiles).find((tile) => tile.terrainType === 'HQ' && tile.owner === enemy);
  return hq ? hq.coord : null;
};

const canCaptureNow = (state: GameState, unit: UnitState): boolean => {
  if (unit.type !== 'INFANTRY') return false;
  const key = toCoordKey(unit.position);
  const tile = state.map.tiles[key];
  if (!tile) return false;
  if (!CAPTURABLE_TERRAINS.has(tile.terrainType)) return false;
  return tile.owner !== unit.owner;
};

const getAttackableEnemies = (state: GameState, unit: UnitState): UnitState[] => {
  const def = UNIT_DEFINITIONS[unit.type];
  const enemies = getAliveUnits(state, getEnemyPlayer(unit.owner));
  return enemies.filter((enemy) => {
    const distance = manhattanDistance(unit.position, enemy.position);
    return distance >= def.attackRangeMin && distance <= def.attackRangeMax && canDealDamage(unit.type, enemy.type);
  });
};

const getDefenseModifierAt = (state: GameState, unit: UnitState, coord: Coord): number => {
  const tile = state.map.tiles[toCoordKey(coord)];
  if (unit.type === 'INFANTRY' && tile?.terrainType === 'MOUNTAIN') {
    return 0.8;
  }
  return 1;
};

const scoreAttackTarget = (
  state: GameState,
  attacker: UnitState,
  target: UnitState,
  difficulty: AiDifficulty,
): number => {
  const forecast = forecastCombat(attacker, target);
  const damage = forecast.attackerToDefender.max;
  const retaliation = forecast.defenderToAttacker?.max ?? 0;

  if (difficulty === 'easy') {
    return damage * 10 - target.hp;
  }

  const attackerCost = UNIT_DEFINITIONS[attacker.type].cost;
  const targetCost = UNIT_DEFINITIONS[target.type].cost;

  let score = 0;
  score += damage * (4 + targetCost / 2000);
  score -= retaliation * (2 + attackerCost / 2500);

  if (damage >= target.hp) {
    score += 18 + targetCost / 500;
  }

  if (damage === 0) {
    score -= 25;
  }

  if (INDIRECT_SUPPORT_UNITS.has(target.type)) {
    score += 8;
  }

  if (UNIT_DEFINITIONS[target.type].movementType === 'AIR' && UNIT_DEFINITIONS[attacker.type].attackRangeMin > 1) {
    score += 6;
  }

  const targetTile = state.map.tiles[toCoordKey(target.position)];
  if (
    target.type === 'INFANTRY' &&
    targetTile &&
    CAPTURABLE_TERRAINS.has(targetTile.terrainType) &&
    targetTile.owner === attacker.owner
  ) {
    score += 10;
  }

  if (attacker.type === 'INFANTRY' && canCaptureNow(state, attacker) && damage < target.hp) {
    score -= 10;
  }

  return score;
};

const selectBestAttackTarget = (
  state: GameState,
  unit: UnitState,
  difficulty: AiDifficulty,
): UnitState | null => {
  const shouldConsumeAmmo = state.enableAmmoSupply ?? true;
  if (shouldConsumeAmmo && unit.ammo <= 0) {
    return null;
  }

  const targets = getAttackableEnemies(state, unit);
  if (targets.length === 0) return null;

  let best: UnitState | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const target of targets) {
    const score = scoreAttackTarget(state, unit, target, difficulty);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }

  return best;
};

type ThreatEstimate = {
  attackers: number;
  lethalThreats: number;
  incomingMax: number;
};

const estimateIncomingThreat = (state: GameState, unit: UnitState, coord: Coord): ThreatEstimate => {
  const enemies = getAliveUnits(state, getEnemyPlayer(unit.owner));
  const shouldConsumeAmmo = state.enableAmmoSupply ?? true;

  const defenderAtCoord: UnitState = { ...unit, position: coord };
  const defenderDefenseModifier = getDefenseModifierAt(state, defenderAtCoord, coord);

  let attackers = 0;
  let lethalThreats = 0;
  let incomingMax = 0;

  for (const enemy of enemies) {
    if (shouldConsumeAmmo && enemy.ammo <= 0) {
      continue;
    }

    const def = UNIT_DEFINITIONS[enemy.type];
    const distance = manhattanDistance(enemy.position, coord);
    if (distance < def.attackRangeMin || distance > def.attackRangeMax) {
      continue;
    }

    const forecast = forecastCombat(enemy, defenderAtCoord, {
      canCounter: false,
      defenderDefenseModifier,
    });
    const damage = forecast.attackerToDefender.max;

    attackers += 1;
    incomingMax += damage;
    if (damage >= unit.hp) {
      lethalThreats += 1;
    }
  }

  return { attackers, lethalThreats, incomingMax };
};

const evaluateNormalMoveScore = (
  state: GameState,
  unit: UnitState,
  to: Coord,
  enemies: UnitState[],
  enemyHq: Coord | null,
): number => {
  const movedUnit: UnitState = { ...unit, position: to };
  const tile = state.map.tiles[toCoordKey(to)];

  const nearestEnemyDist =
    enemies.length > 0
      ? Math.min(...enemies.map((enemy) => manhattanDistance(to, enemy.position)))
      : 6;
  const hqDist = enemyHq ? manhattanDistance(to, enemyHq) : 0;

  const threat = estimateIncomingThreat(state, unit, to);

  let score = 0;

  if (unit.type === 'INFANTRY') {
    if (tile && CAPTURABLE_TERRAINS.has(tile.terrainType) && tile.owner !== unit.owner) {
      score += 22;
    }
    score -= hqDist * 1.2;
    score -= nearestEnemyDist * 0.8;
  } else if (INDIRECT_SUPPORT_UNITS.has(unit.type)) {
    if (nearestEnemyDist >= 2 && nearestEnemyDist <= 4) score += 10;
    if (nearestEnemyDist === 1) score -= 18;
    if (nearestEnemyDist > 4) score -= (nearestEnemyDist - 4) * 2;
    score -= hqDist * 0.4;
  } else {
    if (nearestEnemyDist === 1) score += 6;
    score -= Math.abs(nearestEnemyDist - 1) * 1.5;
    score -= hqDist * 0.8;
  }

  const attackTarget = selectBestAttackTarget(state, movedUnit, 'normal');
  if (attackTarget) {
    const attackScore = scoreAttackTarget(state, movedUnit, attackTarget, 'normal');
    score += Math.max(0, attackScore * 0.35) + 5;
  }

  score -= threat.incomingMax * 2.4;
  score -= threat.lethalThreats * 20;
  score -= threat.attackers * 3;

  if (threat.incomingMax === 0) {
    score += 2;
  }

  if (tile?.owner === unit.owner && tile.terrainType === 'FACTORY' && unit.type !== 'INFANTRY') {
    score -= 2;
  }

  return score;
};

const selectBestMove = (
  state: GameState,
  unit: UnitState,
  difficulty: AiDifficulty,
): { to: Coord; path: Coord[] } | null => {
  const enemies = getAliveUnits(state, getEnemyPlayer(unit.owner));
  const maxMove = (state.enableFuelSupply ?? true)
    ? Math.min(UNIT_DEFINITIONS[unit.type].moveRange, unit.fuel)
    : UNIT_DEFINITIONS[unit.type].moveRange;

  const reachable = getReachableTiles({
    map: state.map,
    unit,
    enemyUnits: enemies,
    maxMove,
  }).filter((coord) => !isTileOccupied(state, coord));

  if (reachable.length === 0) return null;

  const enemyHq = getEnemyHqCoord(state, unit.owner);

  if (difficulty === 'easy') {
    let best: { to: Coord; path: Coord[] } | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const to of reachable) {
      const path = findMovePath({ map: state.map, unit, enemyUnits: enemies, maxMove }, to);
      if (!path || path.length === 0) continue;

      const nearestEnemyDist = enemies.length > 0
        ? Math.min(...enemies.map((enemy) => manhattanDistance(to, enemy.position)))
        : 0;

      const hqDist = enemyHq ? manhattanDistance(to, enemyHq) : 0;
      const score = -nearestEnemyDist * 3 - hqDist;

      if (score > bestScore) {
        bestScore = score;
        best = { to, path };
      }
    }

    return best;
  }

  const stayScore = evaluateNormalMoveScore(state, unit, unit.position, enemies, enemyHq);

  let best: { to: Coord; path: Coord[] } | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const to of reachable) {
    const path = findMovePath({ map: state.map, unit, enemyUnits: enemies, maxMove }, to);
    if (!path || path.length === 0) continue;

    const score = evaluateNormalMoveScore(state, unit, to, enemies, enemyHq);

    if (score > bestScore) {
      bestScore = score;
      best = { to, path };
    }
  }

  if (!best) {
    return null;
  }

  if (bestScore <= stayScore + 0.5) {
    return null;
  }

  return best;
};

const emptyUnitCountMap = (): Record<UnitType, number> => ({
  INFANTRY: 0,
  RECON: 0,
  TANK: 0,
  HEAVY_TANK: 0,
  ANTI_TANK: 0,
  ARTILLERY: 0,
  ANTI_AIR: 0,
  FLAK_TANK: 0,
  MISSILE_AA: 0,
  SUPPLY_TRUCK: 0,
  FIGHTER: 0,
  BOMBER: 0,
  ATTACKER: 0,
  STEALTH_BOMBER: 0,
  AIR_TANKER: 0,
  DESTROYER: 0,
  LANDER: 0,
});

const countUnitsByType = (units: UnitState[]): Record<UnitType, number> => {
  const counts = emptyUnitCountMap();
  for (const unit of units) {
    counts[unit.type] += 1;
  }
  return counts;
};

const selectNormalProductionUnit = (state: GameState, aiPlayer: PlayerId): UnitType | null => {
  const canAfford = (type: UnitType): boolean =>
    state.players[aiPlayer].funds >= UNIT_DEFINITIONS[type].cost;

  const own = getAliveUnits(state, aiPlayer);
  const enemy = getAliveUnits(state, getEnemyPlayer(aiPlayer));
  const ownCounts = countUnitsByType(own);
  const enemyCounts = countUnitsByType(enemy);

  const capturableCount = Object.values(state.map.tiles).filter(
    (tile) => CAPTURABLE_TERRAINS.has(tile.terrainType) && tile.owner !== aiPlayer,
  ).length;

  const targetInfantry = Math.max(2, Math.min(6, capturableCount));
  if (canAfford('INFANTRY') && ownCounts.INFANTRY < targetInfantry) {
    return 'INFANTRY';
  }

  const enemyAirCount = enemyCounts.FIGHTER + enemyCounts.BOMBER + enemyCounts.ATTACKER + enemyCounts.STEALTH_BOMBER;
  const antiAirTarget = Math.max(1, Math.ceil(enemyAirCount / 2));
  if (enemyAirCount > 0) {
    if (canAfford('MISSILE_AA') && ownCounts.MISSILE_AA < Math.max(1, Math.floor(enemyAirCount / 2))) {
      return 'MISSILE_AA';
    }
    if (canAfford('ANTI_AIR') && ownCounts.ANTI_AIR < antiAirTarget) {
      return 'ANTI_AIR';
    }
    if (canAfford('FLAK_TANK') && ownCounts.FLAK_TANK < 1) {
      return 'FLAK_TANK';
    }
  }

  const enemyArmorCount =
    enemyCounts.TANK + enemyCounts.HEAVY_TANK + enemyCounts.ANTI_TANK + enemyCounts.ARTILLERY + enemyCounts.ANTI_AIR + enemyCounts.FLAK_TANK + enemyCounts.MISSILE_AA;
  const ownAntiArmor = ownCounts.TANK + ownCounts.HEAVY_TANK + ownCounts.ANTI_TANK + ownCounts.ARTILLERY + ownCounts.FLAK_TANK;
  if (enemyArmorCount > ownAntiArmor && canAfford('ANTI_TANK')) {
    return 'ANTI_TANK';
  }

  const ownFrontline = ownCounts.TANK + ownCounts.HEAVY_TANK + ownCounts.ANTI_TANK + ownCounts.RECON + ownCounts.ANTI_AIR;
  if (ownFrontline >= 2 && ownCounts.ARTILLERY === 0 && canAfford('ARTILLERY')) {
    return 'ARTILLERY';
  }

  const candidates: UnitType[] = ['HEAVY_TANK', 'TANK', 'ANTI_TANK', 'RECON', 'INFANTRY', 'ARTILLERY', 'FLAK_TANK', 'MISSILE_AA'];
  for (const type of candidates) {
    if (canAfford(type)) return type;
  }

  return null;
};

const selectAiProductionUnitForTile = (
  state: GameState,
  aiPlayer: PlayerId,
  difficulty: AiDifficulty,
  coord: Coord,
): UnitType | null => {
  const tile = state.map.tiles[toCoordKey(coord)];
  if (!tile) return null;

  const easyPriorities: UnitType[] = tile.terrainType === 'AIRPORT'
    ? ['FIGHTER', 'ATTACKER']
    : ['INFANTRY', 'TANK', 'RECON'];

  if (difficulty === 'easy') {
    return easyPriorities.find(
      (unitType) => canUnitProduceAtTile(unitType, tile) && state.players[aiPlayer].funds >= UNIT_DEFINITIONS[unitType].cost,
    ) ?? null;
  }

  if (tile.terrainType === 'AIRPORT') {
    const enemy = getAliveUnits(state, getEnemyPlayer(aiPlayer));
    const enemyAir = enemy.filter((unit) => UNIT_DEFINITIONS[unit.type].movementType === 'AIR').length;
    if (enemyAir > 0 && state.players[aiPlayer].funds >= UNIT_DEFINITIONS.FIGHTER.cost) {
      return 'FIGHTER';
    }
    if (state.players[aiPlayer].funds >= UNIT_DEFINITIONS.ATTACKER.cost) {
      return 'ATTACKER';
    }
    if (state.players[aiPlayer].funds >= UNIT_DEFINITIONS.BOMBER.cost) {
      return 'BOMBER';
    }
    return null;
  }

  return selectNormalProductionUnit(state, aiPlayer);
};

const produceForAi = (
  state: GameState,
  aiPlayer: PlayerId,
  difficulty: AiDifficulty,
  deps: CommandDeps,
): GameState => {
  let working = state;

  const productionSites = Object.values(working.map.tiles)
    .filter((tile) => tile.owner === aiPlayer && (tile.terrainType === 'FACTORY' || tile.terrainType === 'AIRPORT'))
    .map((tile) => tile.coord)
    .filter((coord) => !isTileOccupied(working, coord));

  for (const coord of productionSites) {
    const affordable = selectAiProductionUnitForTile(working, aiPlayer, difficulty, coord);

    if (!affordable) continue;

    const applied = applyCommand(
      working,
      {
        type: 'PRODUCE_UNIT',
        playerId: aiPlayer,
        factoryCoord: coord,
        unitType: affordable,
      },
      deps,
    );

    if (applied.result.ok) {
      working = applied.state;
    }
  }

  return working;
};

const tryCapture = (working: GameState, unitId: string, deps: CommandDeps): GameState => {
  const unit = working.units[unitId];
  if (!unit || unit.acted || !canCaptureNow(working, unit)) {
    return working;
  }

  const captureApplied = applyCommand(
    working,
    { type: 'CAPTURE', unitId: unit.id },
    deps,
  );

  return captureApplied.result.ok ? captureApplied.state : working;
};

export const runAiTurn = (state: GameState, options: AiTurnOptions): GameState => {
  if (state.winner) return state;

  const aiPlayer = state.currentPlayerId;
  let working = state;

  const unitOrder = getAliveUnits(working, aiPlayer).map((u) => u.id);

  for (const unitId of unitOrder) {
    if (working.winner) break;

    const unit = working.units[unitId];
    if (!unit || unit.owner !== aiPlayer || unit.hp <= 0) continue;

    if (options.difficulty === 'normal') {
      const captured = tryCapture(working, unitId, options.deps);
      if (captured !== working) {
        working = captured;
        continue;
      }
    }

    const firstAttackTarget = selectBestAttackTarget(working, unit, options.difficulty);
    if (firstAttackTarget) {
      const attackApplied = applyCommand(
        working,
        { type: 'ATTACK', attackerId: unit.id, defenderId: firstAttackTarget.id },
        options.deps,
      );
      if (attackApplied.result.ok) {
        working = attackApplied.state;
        continue;
      }
    }

    if (options.difficulty === 'easy') {
      const unitAfterAttack = working.units[unitId];
      if (unitAfterAttack && !unitAfterAttack.acted && canCaptureNow(working, unitAfterAttack)) {
        const captureApplied = applyCommand(
          working,
          { type: 'CAPTURE', unitId: unitAfterAttack.id },
          options.deps,
        );
        if (captureApplied.result.ok) {
          working = captureApplied.state;
          continue;
        }
      }
    }

    const movable = working.units[unitId];
    if (!movable || movable.moved) continue;

    const move = selectBestMove(working, movable, options.difficulty);
    if (move) {
      const moveApplied = applyCommand(
        working,
        { type: 'MOVE_UNIT', unitId: movable.id, to: move.to, path: move.path },
        options.deps,
      );
      if (moveApplied.result.ok) {
        working = moveApplied.state;
      }
    }

    const movedUnit = working.units[unitId];
    if (!movedUnit || movedUnit.hp <= 0) continue;

    if (options.difficulty === 'normal') {
      const capturedAfterMove = tryCapture(working, unitId, options.deps);
      if (capturedAfterMove !== working) {
        working = capturedAfterMove;
        continue;
      }
    }

    if (!movedUnit.acted) {
      const attackTarget = selectBestAttackTarget(working, movedUnit, options.difficulty);
      if (attackTarget) {
        const attackApplied = applyCommand(
          working,
          { type: 'ATTACK', attackerId: movedUnit.id, defenderId: attackTarget.id },
          options.deps,
        );
        if (attackApplied.result.ok) {
          working = attackApplied.state;
          continue;
        }
      }
    }

    if (options.difficulty === 'easy') {
      const movedUnitAfterAttack = working.units[unitId];
      if (
        movedUnitAfterAttack &&
        !movedUnitAfterAttack.acted &&
        canCaptureNow(working, movedUnitAfterAttack)
      ) {
        const captureApplied = applyCommand(
          working,
          { type: 'CAPTURE', unitId: movedUnitAfterAttack.id },
          options.deps,
        );
        if (captureApplied.result.ok) {
          working = captureApplied.state;
        }
      }
    }
  }

  if (!working.winner) {
    working = produceForAi(working, aiPlayer, options.difficulty, options.deps);
  }

  if (!working.winner) {
    const ended = applyCommand(working, { type: 'END_TURN' }, options.deps);
    if (ended.result.ok) {
      working = ended.state;
    }
  }

  return working;
};
