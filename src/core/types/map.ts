import type { Coord, PlayerId } from './game';

export type TerrainType =
  | 'PLAIN'
  | 'FOREST'
  | 'MOUNTAIN'
  | 'ROAD'
  | 'BRIDGE'
  | 'RIVER'
  | 'SEA'
  | 'CITY'
  | 'FACTORY'
  | 'HQ'
  | 'AIRPORT'
  | 'PORT';

export type ProductionType = 'GROUND' | 'AIR' | 'NAVAL';

export type TileState = {
  coord: Coord;
  terrainType: TerrainType;
  owner?: PlayerId;
  capturePoints?: number;
  productionType?: ProductionType;
  operational?: boolean;
  structureHp?: number;
  captureTargetOverride?: number;
  destructionCount?: number;
};

export type CommandHqByPlayer = Partial<Record<PlayerId, Coord>>;

export type MapState = {
  width: number;
  height: number;
  tiles: Record<string, TileState>;
  commandHqByPlayer?: CommandHqByPlayer;
};
