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
};

export type CommandHqByPlayer = Partial<Record<PlayerId, Coord>>;

export type MapState = {
  width: number;
  height: number;
  tiles: Record<string, TileState>;
  // 勝敗判定に使う司令部座標。特殊/複数HQマップではこれを明示する。
  commandHqByPlayer?: CommandHqByPlayer;
};
