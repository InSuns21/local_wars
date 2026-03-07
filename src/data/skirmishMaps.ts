import type { MapMeta } from '@/app/types';
import type { PlayerId } from '@core/types/game';
import type { CommandHqByPlayer, MapState, TerrainType, TileState } from '@core/types/map';
import type { UnitState, UnitType } from '@core/types/unit';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { getCaptureTarget } from '@core/rules/capture';
import { getBaseStructureHp, isBombardableTerrain, isCapturableTerrain } from '@core/rules/facilities';
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

const createTile = (spec: TileSpec): TileState => ({
  coord: { x: spec.x, y: spec.y },
  terrainType: spec.terrainType,
  owner: spec.owner,
  capturePoints: isCapturableTerrain(spec.terrainType) ? getCaptureTarget(spec.terrainType) : undefined,
  structureHp: isBombardableTerrain(spec.terrainType) ? getBaseStructureHp(spec.terrainType) : undefined,
  operational: isBombardableTerrain(spec.terrainType) ? true : undefined,
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
  {
    id: 'airport-drill',
    name: '飛行場演習',
    width: 16,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 14, y: 14, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 14, y: 13, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 13, y: 14, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 3, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 5, y: 6, terrainType: 'CITY' },
      { x: 6, y: 7, terrainType: 'CITY' },
      { x: 8, y: 8, terrainType: 'CITY' },
      { x: 10, y: 9, terrainType: 'CITY' },
      { x: 12, y: 11, terrainType: 'CITY', owner: 'P2' },
      { x: 7, y: 7, terrainType: 'ROAD' },
      { x: 8, y: 7, terrainType: 'ROAD' },
      { x: 9, y: 8, terrainType: 'ROAD' },
      { x: 9, y: 9, terrainType: 'ROAD' },
      { x: 5, y: 7, terrainType: 'FOREST' },
      { x: 10, y: 8, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 2, y: 2 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 2, y: 3 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 2, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 13, y: 13 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 13, y: 12 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 13, y: 14 },
    ],
  },
  {
    id: 'runway-rush',
    name: '滑走路争奪',
    width: 16,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 14, y: 14, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 14, y: 13, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 13, y: 14, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 7, y: 7, terrainType: 'AIRPORT' },
      { x: 8, y: 7, terrainType: 'AIRPORT' },
      { x: 3, y: 5, terrainType: 'CITY', owner: 'P1' },
      { x: 5, y: 7, terrainType: 'CITY' },
      { x: 6, y: 8, terrainType: 'CITY' },
      { x: 9, y: 7, terrainType: 'CITY' },
      { x: 10, y: 8, terrainType: 'CITY' },
      { x: 12, y: 10, terrainType: 'CITY', owner: 'P2' },
      { x: 6, y: 7, terrainType: 'ROAD' },
      { x: 9, y: 6, terrainType: 'ROAD' },
      { x: 7, y: 8, terrainType: 'ROAD' },
      { x: 8, y: 8, terrainType: 'ROAD' },
      { x: 5, y: 6, terrainType: 'FOREST' },
      { x: 10, y: 9, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 2, y: 3 },
      { id: 'p1_recon', owner: 'P1', type: 'RECON', x: 3, y: 3 },
      { id: 'p1_attacker', owner: 'P1', type: 'ATTACKER', x: 2, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 13, y: 12 },
      { id: 'p2_recon', owner: 'P2', type: 'RECON', x: 12, y: 12 },
      { id: 'p2_attacker', owner: 'P2', type: 'ATTACKER', x: 13, y: 14 },
    ],
  },
  {
    id: 'triple-runways',
    name: '三飛行場戦',
    width: 16,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 14, y: 14, terrainType: 'HQ', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'FACTORY', owner: 'P1' },
      { x: 13, y: 14, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 2, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 13, y: 13, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 7, y: 7, terrainType: 'AIRPORT' },
      { x: 8, y: 8, terrainType: 'AIRPORT' },
      { x: 4, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 5, y: 6, terrainType: 'CITY' },
      { x: 6, y: 7, terrainType: 'CITY' },
      { x: 9, y: 8, terrainType: 'CITY' },
      { x: 10, y: 9, terrainType: 'CITY' },
      { x: 11, y: 11, terrainType: 'CITY', owner: 'P2' },
      { x: 7, y: 8, terrainType: 'ROAD' },
      { x: 8, y: 7, terrainType: 'ROAD' },
      { x: 6, y: 8, terrainType: 'ROAD' },
      { x: 9, y: 7, terrainType: 'ROAD' },
      { x: 6, y: 6, terrainType: 'FOREST' },
      { x: 9, y: 9, terrainType: 'FOREST' },
      { x: 6, y: 9, terrainType: 'MOUNTAIN' },
      { x: 9, y: 6, terrainType: 'MOUNTAIN' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 2 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 4, y: 3 },
      { id: 'p1_bomber', owner: 'P1', type: 'BOMBER', x: 2, y: 2 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 1, y: 3 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 12, y: 12 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 11, y: 11 },
      { id: 'p2_bomber', owner: 'P2', type: 'BOMBER', x: 13, y: 13 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 14, y: 12 },
    ],
  },
  {
    id: 'cloud-wall',
    name: '雲海防衛線',
    width: 16,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 14, y: 14, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 2, terrainType: 'FACTORY', owner: 'P1' },
      { x: 14, y: 13, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 13, y: 14, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 7, y: 5, terrainType: 'AIRPORT' },
      { x: 8, y: 10, terrainType: 'AIRPORT' },
      { x: 4, y: 6, terrainType: 'MOUNTAIN' },
      { x: 5, y: 6, terrainType: 'MOUNTAIN' },
      { x: 10, y: 9, terrainType: 'MOUNTAIN' },
      { x: 11, y: 9, terrainType: 'MOUNTAIN' },
      { x: 6, y: 5, terrainType: 'FOREST' },
      { x: 10, y: 10, terrainType: 'FOREST' },
      { x: 4, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 6, y: 7, terrainType: 'CITY' },
      { x: 7, y: 8, terrainType: 'CITY' },
      { x: 8, y: 9, terrainType: 'CITY' },
      { x: 9, y: 10, terrainType: 'CITY' },
      { x: 11, y: 12, terrainType: 'CITY', owner: 'P2' },
      { x: 7, y: 7, terrainType: 'ROAD' },
      { x: 8, y: 8, terrainType: 'ROAD' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 3 },
      { id: 'p1_anti_air', owner: 'P1', type: 'ANTI_AIR', x: 4, y: 3 },
      { id: 'p1_attacker', owner: 'P1', type: 'ATTACKER', x: 2, y: 1 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 3, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 12, y: 12 },
      { id: 'p2_anti_air', owner: 'P2', type: 'ANTI_AIR', x: 11, y: 12 },
      { id: 'p2_bomber', owner: 'P2', type: 'BOMBER', x: 13, y: 14 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 12, y: 14 },
    ],
  },
  {
    id: 'stealth-run',
    name: '夜間侵攻',
    width: 18,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 16, y: 14, terrainType: 'HQ', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'FACTORY', owner: 'P1' },
      { x: 15, y: 14, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 2, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 15, y: 13, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 5, y: 5, terrainType: 'CITY', owner: 'P1' },
      { x: 7, y: 7, terrainType: 'CITY' },
      { x: 8, y: 8, terrainType: 'CITY' },
      { x: 9, y: 9, terrainType: 'CITY' },
      { x: 10, y: 10, terrainType: 'CITY' },
      { x: 12, y: 12, terrainType: 'CITY', owner: 'P2' },
      { x: 8, y: 6, terrainType: 'FOREST' },
      { x: 9, y: 6, terrainType: 'FOREST' },
      { x: 8, y: 10, terrainType: 'FOREST' },
      { x: 9, y: 10, terrainType: 'FOREST' },
      { x: 6, y: 7, terrainType: 'MOUNTAIN' },
      { x: 11, y: 9, terrainType: 'MOUNTAIN' },
      { x: 7, y: 8, terrainType: 'ROAD' },
      { x: 10, y: 9, terrainType: 'ROAD' },
      { x: 7, y: 9, terrainType: 'AIRPORT' },
      { x: 10, y: 8, terrainType: 'AIRPORT' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 2 },
      { id: 'p1_anti_air', owner: 'P1', type: 'ANTI_AIR', x: 4, y: 2 },
      { id: 'p1_stealth', owner: 'P1', type: 'STEALTH_BOMBER', x: 2, y: 2 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 3, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 14, y: 13 },
      { id: 'p2_anti_air', owner: 'P2', type: 'ANTI_AIR', x: 13, y: 13 },
      { id: 'p2_stealth', owner: 'P2', type: 'STEALTH_BOMBER', x: 15, y: 13 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 14, y: 14 },
    ],
  },
];

const MAP_METADATA: Record<string, Omit<MapMeta, 'id' | 'name' | 'width' | 'height'>> = {
  'plains-clash': {
    difficulty: 'beginner',
    estimatedMinutes: 20,
    victoryHint: '中央工場を先に確保して物量差を作る展開になりやすい。',
    featureTags: ['中央工場', '平地多め', '基本戦術向け'],
    summary: '遮蔽物が少なく、基本的な移動と正面戦闘を学びやすい標準マップ。',
    recommendedForFirstPlay: true,
    recommendedFor: '初回プレイ / 基本操作確認',
  },
  'river-crossing': {
    difficulty: 'standard',
    estimatedMinutes: 25,
    victoryHint: '橋の制圧に失敗すると前線が停滞しやすい。砲撃支援が重要。',
    featureTags: ['橋', '河川', '砲兵戦'],
    summary: '橋と川で進軍ルートが絞られ、突破の順番が勝敗を左右する。',
    recommendedFor: '中盤の押し引きを学びたい人',
  },
  'forest-line': {
    difficulty: 'standard',
    estimatedMinutes: 28,
    victoryHint: '森越しの索敵差と待ち伏せを活かした消耗戦になりやすい。',
    featureTags: ['森林地帯', '遮蔽', '待ち伏せ'],
    summary: '視界と地形防御を使った前線維持が問われるマップ。',
    recommendedFor: '索敵と地形の相性を試したい人',
  },
  'bridge-head': {
    difficulty: 'standard',
    estimatedMinutes: 24,
    victoryHint: '単一の橋を押さえつつ、渡河後の着地地点を確保できるかが鍵。',
    featureTags: ['単一路線', '橋頭堡', '正面突破'],
    summary: '橋を巡る衝突が濃く、短いターンで戦線の優劣が動く。',
    recommendedFor: '短めの緊張感ある対局',
  },
  'iron-route': {
    difficulty: 'challenging',
    estimatedMinutes: 32,
    victoryHint: '中央工場群を取れても山地の詰まりで逆襲されやすい。進軍路の整理が必要。',
    featureTags: ['複数工場', '山地', '主力戦'],
    summary: '中盤以降の生産力差と進軍路管理が重要になる重めの会戦。',
    recommendedFor: '物量戦と主力運用を楽しみたい人',
  },
  'capital-fall': {
    difficulty: 'challenging',
    estimatedMinutes: 35,
    victoryHint: '中央都市と司令部周辺の取り合いから一気に決着しやすい。',
    featureTags: ['大規模', '複数都市', '長期戦'],
    summary: '戦線が広く、補給と増援の回し方で差が出る上級者向けマップ。',
    recommendedFor: '長めの本格対局',
  },
  'twin-ridges': {
    difficulty: 'standard',
    estimatedMinutes: 26,
    victoryHint: '山越しの射線と中央工場の確保タイミングが勝負を分ける。',
    featureTags: ['山岳', '中央工場', '対戦車戦'],
    summary: '狭い通路をどう抜くかで、戦車と対戦車の価値が変わる。',
    recommendedFor: '地形差のある対面戦',
  },
  'urban-grid': {
    difficulty: 'beginner',
    estimatedMinutes: 22,
    victoryHint: '都市帯の取り合いで資金差が付きやすく、拠点確保の練習に向く。',
    featureTags: ['市街地', '都市密集', '拠点争奪'],
    summary: '都市が多く、占領と前線維持の基本をテンポよく学べる。',
    recommendedFor: '拠点占領の練習',
  },
  'canyon-push': {
    difficulty: 'challenging',
    estimatedMinutes: 30,
    victoryHint: '峡谷出口で渋滞すると反撃を受けやすい。主力投入の順番が重要。',
    featureTags: ['峡谷', '進軍路限定', '突破戦'],
    summary: '通れる場所が限られ、配置の小さな差がそのまま戦況差になる。',
    recommendedFor: '押し込みと詰まりの判断を試したい人',
  },
  'highland-ring': {
    difficulty: 'challenging',
    estimatedMinutes: 33,
    victoryHint: '高地外周を取るか、中央工場を急ぐかでゲームプランが大きく分かれる。',
    featureTags: ['高地', '包囲', '中央争奪'],
    summary: '高地の圧力と中央制圧の両立が難しい、判断量の多いマップ。',
    recommendedFor: '複数戦線を同時管理したい人',
  },
  'airport-drill': {
    difficulty: 'beginner',
    estimatedMinutes: 24,
    victoryHint: '自軍空港から早めに戦闘機を出し、中央都市を先に押さえると安定しやすい。',
    featureTags: ['空港入門', '航空戦初級', '短時間'],
    summary: '空港の使い方と航空ユニットの補給ルールを少ない拠点数で学べる入門マップ。',
    recommendedFor: '航空ユニットの基本確認',
  },
  'runway-rush': {
    difficulty: 'standard',
    estimatedMinutes: 30,
    victoryHint: '中央の中立空港を取れれば攻撃機の展開速度で主導権を握りやすい。',
    featureTags: ['中立空港', '攻撃機', '中央制圧'],
    summary: '地上前線と航空展開の両方を管理しながら、滑走路の取り合いを進めるマップ。',
    recommendedFor: '空港争奪の駆け引き',
  },
  'triple-runways': {
    difficulty: 'standard',
    estimatedMinutes: 34,
    victoryHint: '中央空港群を確保しても迎撃機を切らすと逆に爆撃を通されやすい。',
    featureTags: ['複数空港', '爆撃機', '制空権争い'],
    summary: '複数の飛行場を巡って生産拠点の奪い合いが起きる、航空主体の中規模マップ。',
    recommendedFor: '制空権と爆撃の両立',
  },
  'cloud-wall': {
    difficulty: 'challenging',
    estimatedMinutes: 38,
    victoryHint: '山地の対空防衛を崩せるかどうかで、後方空港への爆撃成功率が大きく変わる。',
    featureTags: ['対空防衛', '山地', '後方空港'],
    summary: '地上の対空網と航空攻撃が強く干渉し、雑な前進が通らない防衛重視マップ。',
    recommendedFor: '対空網の突破判断',
  },
  'stealth-run': {
    difficulty: 'challenging',
    estimatedMinutes: 40,
    victoryHint: 'ステルス爆撃機は見えないが燃費が悪い。補給空港までの帰路を先に作る必要がある。',
    featureTags: ['ステルス爆撃機', '索敵', '夜襲'],
    summary: 'ステルス可視条件と空港補給の距離管理がそのまま勝敗に直結する上級者向けマップ。',
    recommendedFor: 'ステルス運用を試したい人',
  },
};

const SCENARIOS = TEMPLATES.map((template): SkirmishScenario => ({
  id: template.id,
  name: template.name,
  map: buildMap(template),
  units: buildUnits(template),
}));

export const SKIRMISH_SCENARIOS: Record<string, SkirmishScenario> = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.id, scenario]),
);

export const SKIRMISH_MAP_METAS: MapMeta[] = SCENARIOS.map((scenario) => ({
  id: scenario.id,
  name: scenario.name,
  width: scenario.map.width,
  height: scenario.map.height,
  ...MAP_METADATA[scenario.id],
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





