import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { PlayerId } from '@core/types/game';
import type { GameState } from '@core/types/state';
import { manhattanDistance, toCoordKey } from '@/utils/coord';
import { isStealthUnitType } from './facilities';

const INFANTRY_MOUNTAIN_VISION_BONUS = 1;

const getVisionRange = (state: GameState, unitType: string, coordKey: string): number => {
  const base = UNIT_DEFINITIONS[unitType as keyof typeof UNIT_DEFINITIONS]?.visionRange ?? 2;
  const tile = state.map.tiles[coordKey];
  if (unitType === 'INFANTRY' && tile?.terrainType === 'MOUNTAIN') {
    return base + INFANTRY_MOUNTAIN_VISION_BONUS;
  }
  return base;
};

const isAlwaysVisibleFriendlyProperty = (terrainType: string): boolean =>
  terrainType === 'CITY' || terrainType === 'FACTORY' || terrainType === 'HQ' || terrainType === 'AIRPORT' || terrainType === 'PORT';

const isAdjacentToFriendlyUnit = (state: GameState, viewer: PlayerId, coordKey: string): boolean => {
  const tile = state.map.tiles[coordKey];
  if (!tile) {
    return false;
  }

  return Object.values(state.units)
    .filter((u) => u.owner === viewer && u.hp > 0)
    .some((u) => manhattanDistance(u.position, tile.coord) <= 1);
};

const isConcealedForestTileVisible = (state: GameState, viewer: PlayerId, coordKey: string): boolean => {
  const tile = state.map.tiles[coordKey];
  if (!tile || tile.terrainType !== 'FOREST') {
    return true;
  }

  return isAdjacentToFriendlyUnit(state, viewer, coordKey);
};

const isStealthRevealConditionMet = (state: GameState, viewer: PlayerId, coordKey: string): boolean => {
  const tile = state.map.tiles[coordKey];
  if (!tile) return false;
  if (tile.owner === viewer) return true;
  return isAdjacentToFriendlyUnit(state, viewer, coordKey);
};

export const getVisibleTileCoordKeys = (state: GameState, viewer: PlayerId): Set<string> => {
  if (!state.fogOfWar) {
    return new Set(Object.keys(state.map.tiles));
  }

  const visible = new Set<string>();

  for (const tile of Object.values(state.map.tiles)) {
    if (tile.owner === viewer && isAlwaysVisibleFriendlyProperty(tile.terrainType)) {
      visible.add(toCoordKey(tile.coord));
    }
  }

  const friendly = Object.values(state.units).filter((u) => u.owner === viewer && u.hp > 0);

  for (const ally of friendly) {
    const allyKey = toCoordKey(ally.position);
    const range = getVisionRange(state, ally.type, allyKey);

    for (let y = 0; y < state.map.height; y += 1) {
      for (let x = 0; x < state.map.width; x += 1) {
        const coord = { x, y };
        const coordKey = toCoordKey(coord);
        if (!state.map.tiles[coordKey]) continue;
        if (manhattanDistance(ally.position, coord) <= range && isConcealedForestTileVisible(state, viewer, coordKey)) {
          visible.add(coordKey);
        }
      }
    }
  }

  return visible;
};

const isForestConcealedEnemyVisible = (state: GameState, viewer: PlayerId, enemyCoordKey: string): boolean => {
  const tile = state.map.tiles[enemyCoordKey];
  if (!tile || tile.terrainType !== 'FOREST') {
    return true;
  }

  return isAdjacentToFriendlyUnit(state, viewer, enemyCoordKey);
};

export const getVisibleEnemyUnitIds = (state: GameState, viewer: PlayerId): Set<string> => {
  const visibleTiles = getVisibleTileCoordKeys(state, viewer);
  return new Set(
    Object.values(state.units)
      .filter((u) => u.owner !== viewer && u.hp > 0)
      .filter((u) => {
        const enemyCoordKey = toCoordKey(u.position);
        if (isStealthUnitType(u.type)) {
          return isStealthRevealConditionMet(state, viewer, enemyCoordKey);
        }
        if (!state.fogOfWar) return true;
        if (!visibleTiles.has(enemyCoordKey)) return false;
        return isForestConcealedEnemyVisible(state, viewer, enemyCoordKey);
      })
      .map((u) => u.id),
  );
};

export const getVisibleEnemyCoordKeys = (state: GameState, viewer: PlayerId): Set<string> => {
  const ids = getVisibleEnemyUnitIds(state, viewer);
  const keys = new Set<string>();

  for (const unit of Object.values(state.units)) {
    if (ids.has(unit.id)) {
      keys.add(toCoordKey(unit.position));
    }
  }

  return keys;
};
