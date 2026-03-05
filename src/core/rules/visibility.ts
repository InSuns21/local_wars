import type { GameState } from '@core/types/state';
import type { PlayerId } from '@core/types/game';
import { manhattanDistance, toCoordKey } from '@/utils/coord';

const VISION_RANGE_BY_UNIT: Record<string, number> = {
  INFANTRY: 2,
  RECON: 4,
  TANK: 3,
  ANTI_TANK: 3,
  ARTILLERY: 3,
  ANTI_AIR: 3,
  FIGHTER: 5,
  BOMBER: 4,
  DESTROYER: 4,
  LANDER: 3,
};

const INFANTRY_MOUNTAIN_VISION_BONUS = 1;

const getVisionRange = (state: GameState, unitType: string, coordKey: string): number => {
  const base = VISION_RANGE_BY_UNIT[unitType] ?? 2;
  const tile = state.map.tiles[coordKey];
  if (unitType === 'INFANTRY' && tile?.terrainType === 'MOUNTAIN') {
    return base + INFANTRY_MOUNTAIN_VISION_BONUS;
  }
  return base;
};

const isAlwaysVisibleFriendlyProperty = (terrainType: string): boolean =>
  terrainType === 'CITY' || terrainType === 'FACTORY' || terrainType === 'HQ';

export const getVisibleTileCoordKeys = (state: GameState, viewer: PlayerId): Set<string> => {
  if (!state.fogOfWar) {
    return new Set(Object.keys(state.map.tiles));
  }

  const visible = new Set<string>();

  // 自軍都市・工場・HQは常に可視
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
        if (manhattanDistance(ally.position, coord) <= range) {
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

  return Object.values(state.units)
    .filter((u) => u.owner === viewer && u.hp > 0)
    .some((u) => manhattanDistance(u.position, tile.coord) <= 1);
};

export const getVisibleEnemyUnitIds = (state: GameState, viewer: PlayerId): Set<string> => {
  if (!state.fogOfWar) {
    return new Set(
      Object.values(state.units)
        .filter((u) => u.owner !== viewer && u.hp > 0)
        .map((u) => u.id),
    );
  }

  const visibleTiles = getVisibleTileCoordKeys(state, viewer);
  return new Set(
    Object.values(state.units)
      .filter((u) => u.owner !== viewer && u.hp > 0)
      .filter((u) => {
        const enemyCoordKey = toCoordKey(u.position);
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

