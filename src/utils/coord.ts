import type { Coord } from '@core/types/game';

export const toCoordKey = (coord: Coord): string => `${coord.x},${coord.y}`;

export const fromCoordKey = (key: string): Coord => {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
};

export const manhattanDistance = (a: Coord, b: Coord): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const getNeighbors4 = (coord: Coord): Coord[] => [
  { x: coord.x + 1, y: coord.y },
  { x: coord.x - 1, y: coord.y },
  { x: coord.x, y: coord.y + 1 },
  { x: coord.x, y: coord.y - 1 },
];
