import type { PlayerId } from '@core/types/game';
import type { CommandHqByPlayer, MapState, TerrainType, TileState } from '@core/types/map';
import type { UnitState, UnitType } from '@core/types/unit';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { getCaptureTarget } from '@core/rules/capture';
import { toCoordKey } from '@/utils/coord';

type TileSpec = {
  x: number;
  y: number;
  terrainType: TerrainType;
  owner?: PlayerId;
};

type UnitSpec = {
  id: string;
  owner: PlayerId;
  type: UnitType;
  x: number;
  y: number;
};

type SkirmishTemplate = {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileSpec[];
  units: UnitSpec[];
};

export type SkirmishScenario = {
  id: string;
  name: string;
  map: MapState;
  units: Record<string, UnitState>;
};

const CAPTURABLE_TERRAIN = new Set<TerrainType>(['CITY', 'FACTORY', 'HQ']);

const createTile = (spec: TileSpec): TileState => ({
  coord: { x: spec.x, y: spec.y },
  terrainType: spec.terrainType,
  owner: spec.owner,
  capturePoints: CAPTURABLE_TERRAIN.has(spec.terrainType) ? getCaptureTarget(spec.terrainType) : undefined,
});

const buildMap = (template: SkirmishTemplate): MapState => {
  const commandHqByPlayer = resolveCommandHqByPlayer(template);
  const tiles: Record<string, TileState> = {};

  for (let y = 0; y < template.height; y += 1) {
    for (let x = 0; x < template.width; x += 1) {
      const key = toCoordKey({ x, y });
      tiles[key] = {
        coord: { x, y },
        terrainType: 'PLAIN',
      };
    }
  }

  for (const tile of template.tiles) {
    const key = toCoordKey({ x: tile.x, y: tile.y });
    tiles[key] = createTile(tile);
  }

  return {
    width: template.width,
    height: template.height,
    tiles,
    commandHqByPlayer,
  };
};


const resolveCommandHqByPlayer = (template: SkirmishTemplate): CommandHqByPlayer => {
  const commandHqByPlayer: CommandHqByPlayer = {};

  for (const tile of template.tiles) {
    if (tile.terrainType !== 'HQ' || !tile.owner) continue;
    if (!commandHqByPlayer[tile.owner]) {
      commandHqByPlayer[tile.owner] = { x: tile.x, y: tile.y };
    }
  }

  return commandHqByPlayer;
};
const buildUnits = (template: SkirmishTemplate): Record<string, UnitState> => {
  const units: Record<string, UnitState> = {};

  for (const spec of template.units) {
    const def = UNIT_DEFINITIONS[spec.type];
    units[spec.id] = {
      id: spec.id,
      owner: spec.owner,
      type: spec.type,
      hp: 10,
      fuel: def.maxFuel,
      ammo: def.maxAmmo,
      position: { x: spec.x, y: spec.y },
      moved: false,
      acted: false,
      lastMovePath: [],
    };
  }

  return units;
};

const TEMPLATES: SkirmishTemplate[] = [
  {
    id: 'plains-clash',
    name: '平原会戦',
    width: 12,
    height: 10,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 10, y: 8, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 7, terrainType: 'FACTORY', owner: 'P2' },
      { x: 6, y: 4, terrainType: 'FACTORY' },
      { x: 3, y: 3, terrainType: 'CITY', owner: 'P1' },
      { x: 8, y: 6, terrainType: 'CITY', owner: 'P2' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 4, terrainType: 'ROAD' },
      { x: 5, y: 5, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 4, y: 4, terrainType: 'FOREST' },
      { x: 7, y: 5, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 2, y: 2 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 2, y: 3 },
      { id: 'p1_recon', owner: 'P1', type: 'RECON', x: 3, y: 2 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 9, y: 7 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 9, y: 6 },
      { id: 'p2_recon', owner: 'P2', type: 'RECON', x: 8, y: 7 },
    ],
  },
  {
    id: 'river-crossing',
    name: '河川突破',
    width: 14,
    height: 10,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 12, y: 8, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 12, y: 7, terrainType: 'FACTORY', owner: 'P2' },
      { x: 7, y: 4, terrainType: 'FACTORY' },
      { x: 2, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 11, y: 5, terrainType: 'CITY', owner: 'P2' },
      { x: 6, y: 0, terrainType: 'RIVER' },
      { x: 6, y: 1, terrainType: 'RIVER' },
      { x: 6, y: 2, terrainType: 'RIVER' },
      { x: 6, y: 3, terrainType: 'RIVER' },
      { x: 6, y: 4, terrainType: 'BRIDGE' },
      { x: 6, y: 5, terrainType: 'RIVER' },
      { x: 6, y: 6, terrainType: 'RIVER' },
      { x: 6, y: 7, terrainType: 'RIVER' },
      { x: 6, y: 8, terrainType: 'RIVER' },
      { x: 6, y: 9, terrainType: 'RIVER' },
      { x: 7, y: 4, terrainType: 'ROAD' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 7, y: 5, terrainType: 'FOREST' },
      { x: 5, y: 3, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 2, y: 3 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 3, y: 4 },
      { id: 'p1_art', owner: 'P1', type: 'ARTILLERY', x: 2, y: 5 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 11, y: 6 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 10, y: 5 },
      { id: 'p2_art', owner: 'P2', type: 'ARTILLERY', x: 11, y: 4 },
    ],
  },
  {
    id: 'forest-line',
    name: '森林戦線',
    width: 12,
    height: 12,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 10, y: 10, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 8, terrainType: 'FACTORY', owner: 'P2' },
      { x: 6, y: 6, terrainType: 'FACTORY' },
      { x: 2, y: 5, terrainType: 'CITY', owner: 'P1' },
      { x: 9, y: 6, terrainType: 'CITY', owner: 'P2' },
      { x: 4, y: 2, terrainType: 'FOREST' },
      { x: 5, y: 2, terrainType: 'FOREST' },
      { x: 6, y: 2, terrainType: 'FOREST' },
      { x: 7, y: 2, terrainType: 'FOREST' },
      { x: 4, y: 3, terrainType: 'FOREST' },
      { x: 7, y: 3, terrainType: 'FOREST' },
      { x: 4, y: 8, terrainType: 'FOREST' },
      { x: 5, y: 8, terrainType: 'FOREST' },
      { x: 6, y: 8, terrainType: 'FOREST' },
      { x: 7, y: 8, terrainType: 'FOREST' },
      { x: 4, y: 9, terrainType: 'FOREST' },
      { x: 7, y: 9, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 2, y: 4 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 3, y: 4 },
      { id: 'p1_anti_tank', owner: 'P1', type: 'ANTI_TANK', x: 2, y: 6 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 9, y: 7 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 8, y: 7 },
      { id: 'p2_anti_tank', owner: 'P2', type: 'ANTI_TANK', x: 9, y: 5 },
    ],
  },
  {
    id: 'bridge-head',
    name: '橋頭堡',
    width: 14,
    height: 10,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 12, y: 8, terrainType: 'HQ', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'FACTORY', owner: 'P1' },
      { x: 11, y: 8, terrainType: 'FACTORY', owner: 'P2' },
      { x: 6, y: 5, terrainType: 'FACTORY' },
      { x: 3, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 10, y: 5, terrainType: 'CITY', owner: 'P2' },
      { x: 0, y: 4, terrainType: 'RIVER' },
      { x: 1, y: 4, terrainType: 'RIVER' },
      { x: 2, y: 4, terrainType: 'RIVER' },
      { x: 4, y: 4, terrainType: 'RIVER' },
      { x: 5, y: 4, terrainType: 'RIVER' },
      { x: 6, y: 4, terrainType: 'BRIDGE' },
      { x: 7, y: 4, terrainType: 'RIVER' },
      { x: 8, y: 4, terrainType: 'RIVER' },
      { x: 9, y: 4, terrainType: 'RIVER' },
      { x: 10, y: 4, terrainType: 'RIVER' },
      { x: 11, y: 4, terrainType: 'RIVER' },
      { x: 12, y: 4, terrainType: 'RIVER' },
      { x: 13, y: 4, terrainType: 'RIVER' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 6, y: 6, terrainType: 'ROAD' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 4, y: 5 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 3, y: 6 },
      { id: 'p1_art', owner: 'P1', type: 'ARTILLERY', x: 4, y: 6 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 9, y: 3 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 10, y: 2 },
      { id: 'p2_art', owner: 'P2', type: 'ARTILLERY', x: 9, y: 2 },
    ],
  },
  {
    id: 'iron-route',
    name: '鋼鉄回廊',
    width: 16,
    height: 10,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 14, y: 8, terrainType: 'HQ', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'FACTORY', owner: 'P1' },
      { x: 13, y: 8, terrainType: 'FACTORY', owner: 'P2' },
      { x: 8, y: 5, terrainType: 'FACTORY' },
      { x: 8, y: 4, terrainType: 'FACTORY' },
      { x: 4, y: 2, terrainType: 'CITY', owner: 'P1' },
      { x: 11, y: 7, terrainType: 'CITY', owner: 'P2' },
      { x: 3, y: 5, terrainType: 'MOUNTAIN' },
      { x: 4, y: 5, terrainType: 'MOUNTAIN' },
      { x: 11, y: 4, terrainType: 'MOUNTAIN' },
      { x: 12, y: 4, terrainType: 'MOUNTAIN' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 4, terrainType: 'ROAD' },
      { x: 7, y: 4, terrainType: 'ROAD' },
      { x: 8, y: 4, terrainType: 'ROAD' },
      { x: 9, y: 4, terrainType: 'ROAD' },
      { x: 10, y: 4, terrainType: 'ROAD' },
      { x: 7, y: 3, terrainType: 'FOREST' },
      { x: 8, y: 5, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 4, y: 3 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 5, y: 3 },
      { id: 'p1_anti_air', owner: 'P1', type: 'ANTI_AIR', x: 3, y: 3 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 11, y: 6 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 10, y: 6 },
      { id: 'p2_anti_air', owner: 'P2', type: 'ANTI_AIR', x: 12, y: 6 },
    ],
  },
  {
    id: 'capital-fall',
    name: '首都決戦',
    width: 16,
    height: 12,
    tiles: [
      { x: 2, y: 2, terrainType: 'HQ', owner: 'P1' },
      { x: 13, y: 9, terrainType: 'HQ', owner: 'P2' },
      { x: 2, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 13, y: 8, terrainType: 'FACTORY', owner: 'P2' },
      { x: 8, y: 6, terrainType: 'FACTORY' },
      { x: 4, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 11, y: 7, terrainType: 'CITY', owner: 'P2' },
      { x: 7, y: 1, terrainType: 'CITY' },
      { x: 8, y: 10, terrainType: 'CITY' },
      { x: 7, y: 2, terrainType: 'ROAD' },
      { x: 7, y: 3, terrainType: 'ROAD' },
      { x: 7, y: 4, terrainType: 'ROAD' },
      { x: 8, y: 7, terrainType: 'ROAD' },
      { x: 8, y: 8, terrainType: 'ROAD' },
      { x: 8, y: 9, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'FOREST' },
      { x: 9, y: 6, terrainType: 'FOREST' },
      { x: 6, y: 6, terrainType: 'MOUNTAIN' },
      { x: 9, y: 5, terrainType: 'MOUNTAIN' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 4 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 4, y: 5 },
      { id: 'p1_art', owner: 'P1', type: 'ARTILLERY', x: 2, y: 5 },
      { id: 'p1_recon', owner: 'P1', type: 'RECON', x: 5, y: 4 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 12, y: 7 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 11, y: 6 },
      { id: 'p2_art', owner: 'P2', type: 'ARTILLERY', x: 13, y: 6 },
      { id: 'p2_recon', owner: 'P2', type: 'RECON', x: 10, y: 7 },
    ],
  },
  {
    id: 'twin-ridges',
    name: '双峰争奪',
    width: 12,
    height: 10,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 10, y: 8, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 7, terrainType: 'FACTORY', owner: 'P2' },
      { x: 6, y: 5, terrainType: 'FACTORY' },
      { x: 2, y: 6, terrainType: 'CITY', owner: 'P1' },
      { x: 9, y: 3, terrainType: 'CITY', owner: 'P2' },
      { x: 4, y: 3, terrainType: 'MOUNTAIN' },
      { x: 4, y: 4, terrainType: 'MOUNTAIN' },
      { x: 7, y: 5, terrainType: 'MOUNTAIN' },
      { x: 7, y: 6, terrainType: 'MOUNTAIN' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 5, y: 5, terrainType: 'FOREST' },
      { x: 6, y: 4, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 2, y: 4 },
      { id: 'p1_anti_tank', owner: 'P1', type: 'ANTI_TANK', x: 3, y: 4 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 2, y: 5 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 9, y: 5 },
      { id: 'p2_anti_tank', owner: 'P2', type: 'ANTI_TANK', x: 8, y: 5 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 9, y: 4 },
    ],
  },
  {
    id: 'urban-grid',
    name: '市街グリッド',
    width: 12,
    height: 10,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 10, y: 8, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 7, terrainType: 'FACTORY', owner: 'P2' },
      { x: 6, y: 4, terrainType: 'FACTORY' },
      { x: 3, y: 3, terrainType: 'CITY' },
      { x: 4, y: 3, terrainType: 'CITY' },
      { x: 7, y: 6, terrainType: 'CITY' },
      { x: 8, y: 6, terrainType: 'CITY' },
      { x: 3, y: 6, terrainType: 'CITY', owner: 'P1' },
      { x: 8, y: 3, terrainType: 'CITY', owner: 'P2' },
      { x: 5, y: 2, terrainType: 'ROAD' },
      { x: 5, y: 3, terrainType: 'ROAD' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 6, y: 6, terrainType: 'ROAD' },
      { x: 6, y: 7, terrainType: 'ROAD' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 2, y: 3 },
      { id: 'p1_recon', owner: 'P1', type: 'RECON', x: 3, y: 4 },
      { id: 'p1_art', owner: 'P1', type: 'ARTILLERY', x: 2, y: 5 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 9, y: 6 },
      { id: 'p2_recon', owner: 'P2', type: 'RECON', x: 8, y: 5 },
      { id: 'p2_art', owner: 'P2', type: 'ARTILLERY', x: 9, y: 4 },
    ],
  },
  {
    id: 'canyon-push',
    name: '峡谷突破',
    width: 14,
    height: 10,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 12, y: 8, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 12, y: 7, terrainType: 'FACTORY', owner: 'P2' },
      { x: 7, y: 4, terrainType: 'FACTORY' },
      { x: 2, y: 7, terrainType: 'CITY', owner: 'P1' },
      { x: 11, y: 2, terrainType: 'CITY', owner: 'P2' },
      { x: 5, y: 1, terrainType: 'MOUNTAIN' },
      { x: 5, y: 2, terrainType: 'MOUNTAIN' },
      { x: 5, y: 3, terrainType: 'MOUNTAIN' },
      { x: 5, y: 6, terrainType: 'MOUNTAIN' },
      { x: 5, y: 7, terrainType: 'MOUNTAIN' },
      { x: 5, y: 8, terrainType: 'MOUNTAIN' },
      { x: 8, y: 1, terrainType: 'MOUNTAIN' },
      { x: 8, y: 2, terrainType: 'MOUNTAIN' },
      { x: 8, y: 3, terrainType: 'MOUNTAIN' },
      { x: 8, y: 6, terrainType: 'MOUNTAIN' },
      { x: 8, y: 7, terrainType: 'MOUNTAIN' },
      { x: 8, y: 8, terrainType: 'MOUNTAIN' },
      { x: 6, y: 4, terrainType: 'ROAD' },
      { x: 7, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 7, y: 5, terrainType: 'ROAD' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 5 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 3, y: 4 },
      { id: 'p1_anti_air', owner: 'P1', type: 'ANTI_AIR', x: 2, y: 4 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 10, y: 4 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 10, y: 5 },
      { id: 'p2_anti_air', owner: 'P2', type: 'ANTI_AIR', x: 11, y: 5 },
    ],
  },
  {
    id: 'highland-ring',
    name: '高地包囲',
    width: 12,
    height: 12,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 10, y: 10, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 9, terrainType: 'FACTORY', owner: 'P2' },
      { x: 6, y: 6, terrainType: 'FACTORY' },
      { x: 2, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 9, y: 7, terrainType: 'CITY', owner: 'P2' },
      { x: 4, y: 4, terrainType: 'MOUNTAIN' },
      { x: 5, y: 4, terrainType: 'MOUNTAIN' },
      { x: 6, y: 4, terrainType: 'MOUNTAIN' },
      { x: 7, y: 4, terrainType: 'MOUNTAIN' },
      { x: 4, y: 5, terrainType: 'MOUNTAIN' },
      { x: 7, y: 5, terrainType: 'MOUNTAIN' },
      { x: 4, y: 6, terrainType: 'MOUNTAIN' },
      { x: 7, y: 6, terrainType: 'MOUNTAIN' },
      { x: 4, y: 7, terrainType: 'MOUNTAIN' },
      { x: 5, y: 7, terrainType: 'MOUNTAIN' },
      { x: 6, y: 7, terrainType: 'MOUNTAIN' },
      { x: 7, y: 7, terrainType: 'MOUNTAIN' },
      { x: 5, y: 5, terrainType: 'ROAD' },
      { x: 6, y: 6, terrainType: 'ROAD' },
      { x: 5, y: 6, terrainType: 'FOREST' },
      { x: 6, y: 5, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 4 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 3, y: 5 },
      { id: 'p1_art', owner: 'P1', type: 'ARTILLERY', x: 2, y: 5 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 8, y: 7 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 8, y: 6 },
      { id: 'p2_art', owner: 'P2', type: 'ARTILLERY', x: 9, y: 6 },
    ],
  },
];

const SCENARIOS = TEMPLATES.map((template): SkirmishScenario => ({
  id: template.id,
  name: template.name,
  map: buildMap(template),
  units: buildUnits(template),
}));

export const SKIRMISH_SCENARIOS: Record<string, SkirmishScenario> = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.id, scenario]),
);

export const SKIRMISH_MAP_METAS = SCENARIOS.map((scenario) => ({
  id: scenario.id,
  name: scenario.name,
  width: scenario.map.width,
  height: scenario.map.height,
}));

export const getSkirmishScenario = (mapId: string): SkirmishScenario | null => {
  const scenario = SKIRMISH_SCENARIOS[mapId];
  if (!scenario) return null;

  return {
    id: scenario.id,
    name: scenario.name,
    map: {
      ...scenario.map,
      tiles: Object.fromEntries(Object.entries(scenario.map.tiles).map(([k, v]) => [k, { ...v, coord: { ...v.coord } }])),
      commandHqByPlayer: scenario.map.commandHqByPlayer
        ? {
          P1: scenario.map.commandHqByPlayer.P1 ? { ...scenario.map.commandHqByPlayer.P1 } : undefined,
          P2: scenario.map.commandHqByPlayer.P2 ? { ...scenario.map.commandHqByPlayer.P2 } : undefined,
        }
        : undefined,
    },
    units: Object.fromEntries(
      Object.entries(scenario.units).map(([id, unit]) => [
        id,
        {
          ...unit,
          position: { ...unit.position },
          lastMovePath: unit.lastMovePath ? [...unit.lastMovePath] : [],
        },
      ]),
    ),
  };
};





