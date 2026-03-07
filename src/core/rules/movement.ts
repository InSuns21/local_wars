import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { MapState, TerrainType, TileState } from '@core/types/map';
import type { Coord, PlayerId } from '@core/types/game';
import type { MovementType, UnitState } from '@core/types/unit';
import { getNeighbors4, manhattanDistance, toCoordKey } from '@/utils/coord';

const IMPASSABLE = Number.POSITIVE_INFINITY;

const movementCostTable: Record<MovementType, Record<TerrainType, number>> = {
  FOOT: {
    PLAIN: 1,
    FOREST: 1,
    MOUNTAIN: 2,
    ROAD: 1,
    BRIDGE: 1,
    RIVER: 2,
    SEA: IMPASSABLE,
    CITY: 1,
    FACTORY: 1,
    HQ: 1,
    AIRPORT: 1,
    PORT: 1,
  },
  TREAD: {
    PLAIN: 1,
    FOREST: 2,
    MOUNTAIN: IMPASSABLE,
    ROAD: 1,
    BRIDGE: 1,
    RIVER: IMPASSABLE,
    SEA: IMPASSABLE,
    CITY: 1,
    FACTORY: 1,
    HQ: 1,
    AIRPORT: 1,
    PORT: 1,
  },
  WHEEL: {
    PLAIN: 2,
    FOREST: 3,
    MOUNTAIN: IMPASSABLE,
    ROAD: 1,
    BRIDGE: 1,
    RIVER: IMPASSABLE,
    SEA: IMPASSABLE,
    CITY: 1,
    FACTORY: 1,
    HQ: 1,
    AIRPORT: 1,
    PORT: 1,
  },
  AIR: {
    PLAIN: 1,
    FOREST: 1,
    MOUNTAIN: 1,
    ROAD: 1,
    BRIDGE: 1,
    RIVER: 1,
    SEA: 1,
    CITY: 1,
    FACTORY: 1,
    HQ: 1,
    AIRPORT: 1,
    PORT: 1,
  },
  NAVAL: {
    PLAIN: IMPASSABLE,
    FOREST: IMPASSABLE,
    MOUNTAIN: IMPASSABLE,
    ROAD: IMPASSABLE,
    BRIDGE: IMPASSABLE,
    RIVER: IMPASSABLE,
    SEA: 1,
    CITY: IMPASSABLE,
    FACTORY: IMPASSABLE,
    HQ: IMPASSABLE,
    AIRPORT: IMPASSABLE,
    PORT: 1,
  },
};

const getTile = (map: MapState, coord: Coord): TileState | undefined => map.tiles[toCoordKey(coord)];

const getMovementTypeByUnit = (unit: UnitState): MovementType => UNIT_DEFINITIONS[unit.type].movementType;

export const getMovementCost = (terrain: TerrainType, movementType: MovementType): number =>
  movementCostTable[movementType][terrain];

export const canEnterTile = (terrain: TerrainType, movementType: MovementType): boolean =>
  Number.isFinite(getMovementCost(terrain, movementType));

export const isEnemyZoc = (coord: Coord, enemyUnits: UnitState[]): boolean => {
  const key = toCoordKey(coord);
  return enemyUnits.some((enemy) => {
    if (enemy.hp <= 0) return false;
    return getNeighbors4(enemy.position).some((adj) => toCoordKey(adj) === key);
  });
};

export type MoveRangeInput = {
  map: MapState;
  unit: UnitState;
  enemyUnits: UnitState[];
  maxMove: number;
  blockedCoordKeys?: Set<string>;
};

const isAdjacent = (a: Coord, b: Coord): boolean => manhattanDistance(a, b) === 1;

export const getPathCost = (input: MoveRangeInput, path: Coord[]): number | null => {
  if (path.length === 0) return 0;

  const movementType = getMovementTypeByUnit(input.unit);
  let current = input.unit.position;
  let used = 0;

  for (let i = 0; i < path.length; i += 1) {
    const next = path[i];
    if (!isAdjacent(current, next)) return null;

    const tile = getTile(input.map, next);
    if (!tile) return null;

    const cost = getMovementCost(tile.terrainType, movementType);
    if (!Number.isFinite(cost)) return null;

    used += cost;
    if (used > input.maxMove) return null;

    const hasNext = i < path.length - 1;
    if (hasNext && toCoordKey(current) !== toCoordKey(input.unit.position) && isEnemyZoc(current, input.enemyUnits)) {
      return null;
    }

    current = next;
  }

  return used;
};

export const findMovePath = (input: MoveRangeInput, to: Coord): Coord[] | null => {
  const startKey = toCoordKey(input.unit.position);
  const targetKey = toCoordKey(to);
  const movementType = getMovementTypeByUnit(input.unit);

  const remainingByKey = new Map<string, number>([[startKey, input.maxMove]]);
  const previousByKey = new Map<string, string>();
  const queue: Coord[] = [input.unit.position];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const currentKey = toCoordKey(current);
    const currentRemaining = remainingByKey.get(currentKey);
    if (currentRemaining === undefined || currentRemaining <= 0) continue;

    const currentIsStart = currentKey === startKey;
    for (const next of getNeighbors4(current)) {
      const tile = getTile(input.map, next);
      if (!tile) continue;

      const nextKey = toCoordKey(next);
      if (input.blockedCoordKeys?.has(nextKey)) continue;

      const cost = getMovementCost(tile.terrainType, movementType);
      if (!Number.isFinite(cost)) continue;

      if (!currentIsStart && isEnemyZoc(current, input.enemyUnits)) {
        continue;
      }

      const nextRemaining = currentRemaining - cost;
      if (nextRemaining < 0) continue;

      const known = remainingByKey.get(nextKey);
      if (known === undefined || nextRemaining > known) {
        remainingByKey.set(nextKey, nextRemaining);
        previousByKey.set(nextKey, currentKey);
        queue.push(next);
      }
    }
  }

  if (!remainingByKey.has(targetKey) || targetKey === startKey) {
    return null;
  }

  const reversed: Coord[] = [];
  let walkKey: string | undefined = targetKey;

  while (walkKey && walkKey !== startKey) {
    const [x, y] = walkKey.split(',').map(Number);
    reversed.push({ x, y });
    walkKey = previousByKey.get(walkKey);
  }

  if (walkKey !== startKey) return null;
  return reversed.reverse();
};

export const getReachableTiles = ({ map, unit, enemyUnits, maxMove, blockedCoordKeys }: MoveRangeInput): Coord[] => {
  const startKey = toCoordKey(unit.position);
  const remainingByKey = new Map<string, number>([[startKey, maxMove]]);
  const queue: Coord[] = [unit.position];
  const movementType = getMovementTypeByUnit(unit);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const currentRemaining = remainingByKey.get(toCoordKey(current));
    if (currentRemaining === undefined || currentRemaining <= 0) continue;

    const currentIsStart = toCoordKey(current) === startKey;
    for (const next of getNeighbors4(current)) {
      const tile = getTile(map, next);
      if (!tile) continue;

      const key = toCoordKey(next);
      if (blockedCoordKeys?.has(key)) continue;

      const cost = getMovementCost(tile.terrainType, movementType);
      if (!Number.isFinite(cost)) continue;

      if (!currentIsStart && isEnemyZoc(current, enemyUnits)) {
        continue;
      }

      const nextRemaining = currentRemaining - cost;
      if (nextRemaining < 0) continue;

      const known = remainingByKey.get(key);
      if (known === undefined || nextRemaining > known) {
        remainingByKey.set(key, nextRemaining);
        queue.push(next);
      }
    }
  }

  return [...remainingByKey.keys()]
    .filter((key) => key !== startKey)
    .map((key) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
};

export const getEnemyUnits = (units: Record<string, UnitState>, owner: PlayerId): UnitState[] =>
  Object.values(units).filter((u) => u.owner !== owner && u.hp > 0);
