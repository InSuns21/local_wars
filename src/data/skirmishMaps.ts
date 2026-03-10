import type { MapMeta } from '@/app/types';
import type { PlayerId } from '@core/types/game';
import type { CommandHqByPlayer, MapState, TerrainType, TileState } from '@core/types/map';
import type { UnitState, UnitType } from '@core/types/unit';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { getCaptureTarget } from '@core/rules/capture';
import { getBaseStructureHp, isBombardableTerrain, isCapturableTerrain, isNavalUnitType } from '@core/rules/facilities';
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

const rectTiles = (x1: number, y1: number, x2: number, y2: number, terrainType: TerrainType, owner?: PlayerId): TileSpec[] => {
  const tiles: TileSpec[] = [];
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      tiles.push({ x, y, terrainType, owner });
    }
  }
  return tiles;
};

const coordTiles = (coords: Array<[number, number]>, terrainType: TerrainType, owner?: PlayerId): TileSpec[] =>
  coords.map(([x, y]) => ({ x, y, terrainType, owner }));

const getAdjacentCoords = (x: number, y: number): Array<[number, number]> => [
  [x, y - 1],
  [x + 1, y],
  [x, y + 1],
  [x - 1, y],
];

const isLandTerrain = (terrainType: TerrainType): boolean => terrainType !== 'SEA';
const isNavalStagingTerrain = (terrainType: TerrainType): boolean => terrainType === 'SEA' || terrainType === 'PORT';
const MUST_NOT_BE_SURROUNDED_BY_SEA_TERRAINS: TerrainType[] = ['CITY', 'FACTORY', 'AIRPORT', 'HQ'];

const resolveTemplateTerrainMap = (template: SkirmishTemplate): Record<string, TerrainType> => {
  const terrainMap: Record<string, TerrainType> = {};

  for (let y = 0; y < template.height; y += 1) {
    for (let x = 0; x < template.width; x += 1) {
      terrainMap[toCoordKey({ x, y })] = 'PLAIN';
    }
  }

  for (const tile of template.tiles) {
    terrainMap[toCoordKey({ x: tile.x, y: tile.y })] = tile.terrainType;
  }

  return terrainMap;
};

const validateTemplate = (template: SkirmishTemplate): void => {
  const terrainMap = resolveTemplateTerrainMap(template);

  for (const tile of template.tiles) {
    const adjacentTerrains = getAdjacentCoords(tile.x, tile.y)
      .filter(([x, y]) => x >= 0 && x < template.width && y >= 0 && y < template.height)
      .map(([x, y]) => terrainMap[toCoordKey({ x, y })]);

    if (tile.terrainType === 'PORT') {
      const hasAdjacentSea = adjacentTerrains.some((terrainType) => terrainType === 'SEA');
      const hasAdjacentLand = adjacentTerrains.some((terrainType) => isLandTerrain(terrainType));

      if (!hasAdjacentSea || !hasAdjacentLand) {
        throw new Error(`Invalid skirmish map ${template.id}: PORT at ${tile.x},${tile.y} must touch both sea and land.`);
      }
    }

    if (tile.terrainType === 'COAST') {
      const seaAdjacentCount = adjacentTerrains.filter((terrainType) => terrainType === 'SEA').length;
      const coastAdjacentCount = adjacentTerrains.filter((terrainType) => terrainType === 'COAST').length;
      const hasAdjacentInland = adjacentTerrains.some((terrainType) => isLandTerrain(terrainType) && terrainType !== 'COAST');

      if (seaAdjacentCount === 0 || !hasAdjacentInland) {
        throw new Error(`Invalid skirmish map ${template.id}: COAST at ${tile.x},${tile.y} must touch sea and inland land.`);
      }
      if (coastAdjacentCount >= 3) {
        throw new Error(`Invalid skirmish map ${template.id}: COAST at ${tile.x},${tile.y} touches too many coast tiles.`);
      }
      if (seaAdjacentCount >= 3) {
        throw new Error(`Invalid skirmish map ${template.id}: COAST at ${tile.x},${tile.y} touches too many sea tiles.`);
      }
    }

    if (MUST_NOT_BE_SURROUNDED_BY_SEA_TERRAINS.includes(tile.terrainType) && adjacentTerrains.length === 4 && adjacentTerrains.every((terrainType) => terrainType === 'SEA')) {
      throw new Error(`Invalid skirmish map ${template.id}: ${tile.terrainType} at ${tile.x},${tile.y} must not be surrounded by sea.`);
    }
  }

  for (const unit of template.units) {
    const terrainType = terrainMap[toCoordKey({ x: unit.x, y: unit.y })] ?? 'PLAIN';
    if (isNavalUnitType(unit.type) && !isNavalStagingTerrain(terrainType)) {
      throw new Error(`Invalid skirmish map ${template.id}: naval unit ${unit.id} must start on SEA or PORT.`);
    }
  }
};

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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 6, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 12, y: 6, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 3, y: 1, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 8, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 3, y: 1, terrainType: 'FACTORY', owner: 'P1' },
      { x: 12, y: 8, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 2, y: 4, terrainType: 'FACTORY', owner: 'P1' },
      { x: 13, y: 7, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 6, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 6, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 12, y: 6, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 10, y: 8, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 14, y: 12, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 14, y: 12, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 13, y: 14, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 7, y: 7, terrainType: 'AIRPORT' },
      { x: 8, y: 7, terrainType: 'AIRPORT' },
      { x: 3, y: 5, terrainType: 'CITY', owner: 'P1' },
      { x: 5, y: 7, terrainType: 'CITY' },
      { x: 6, y: 8, terrainType: 'CITY' },
      { x: 9, y: 7, terrainType: 'CITY' },
      { x: 10, y: 8, terrainType: 'CITY' },
      { x: 8, y: 9, terrainType: 'CITY' },
      { x: 12, y: 10, terrainType: 'CITY', owner: 'P2' },
      { x: 6, y: 7, terrainType: 'ROAD' },
      { x: 9, y: 7, terrainType: 'ROAD' },
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
      { x: 3, y: 1, terrainType: 'FACTORY', owner: 'P1' },
      { x: 12, y: 14, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 14, y: 12, terrainType: 'FACTORY', owner: 'P2' },
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
      { x: 8, y: 7, terrainType: 'ROAD' },
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
      { x: 3, y: 1, terrainType: 'FACTORY', owner: 'P1' },
      { x: 14, y: 14, terrainType: 'FACTORY', owner: 'P2' },
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
  {
    id: 'supply-gauntlet',
    name: '補給回廊',
    width: 18,
    height: 12,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 16, y: 10, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 16, y: 8, terrainType: 'FACTORY', owner: 'P2' },
      { x: 3, y: 3, terrainType: 'CITY', owner: 'P1' },
      { x: 5, y: 4, terrainType: 'CITY' },
      { x: 8, y: 5, terrainType: 'FACTORY' },
      { x: 9, y: 4, terrainType: 'CITY' },
      { x: 12, y: 6, terrainType: 'CITY' },
      { x: 14, y: 7, terrainType: 'CITY', owner: 'P2' },
      { x: 2, y: 2, terrainType: 'ROAD' },
      { x: 2, y: 3, terrainType: 'ROAD' },
      { x: 2, y: 4, terrainType: 'ROAD' },
      { x: 2, y: 5, terrainType: 'ROAD' },
      { x: 3, y: 5, terrainType: 'ROAD' },
      { x: 4, y: 5, terrainType: 'ROAD' },
      { x: 5, y: 5, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 7, y: 5, terrainType: 'ROAD' },
      { x: 8, y: 5, terrainType: 'BRIDGE' },
      { x: 9, y: 5, terrainType: 'ROAD' },
      { x: 10, y: 5, terrainType: 'ROAD' },
      { x: 11, y: 5, terrainType: 'ROAD' },
      { x: 12, y: 5, terrainType: 'ROAD' },
      { x: 13, y: 5, terrainType: 'ROAD' },
      { x: 14, y: 5, terrainType: 'ROAD' },
      { x: 15, y: 5, terrainType: 'ROAD' },
      { x: 15, y: 6, terrainType: 'ROAD' },
      { x: 15, y: 7, terrainType: 'ROAD' },
      { x: 15, y: 8, terrainType: 'ROAD' },
      { x: 15, y: 9, terrainType: 'ROAD' },
      { x: 8, y: 0, terrainType: 'RIVER' },
      { x: 8, y: 1, terrainType: 'RIVER' },
      { x: 8, y: 2, terrainType: 'RIVER' },
      { x: 8, y: 3, terrainType: 'RIVER' },
      { x: 8, y: 4, terrainType: 'RIVER' },
      { x: 8, y: 6, terrainType: 'RIVER' },
      { x: 8, y: 7, terrainType: 'RIVER' },
      { x: 8, y: 8, terrainType: 'RIVER' },
      { x: 8, y: 9, terrainType: 'RIVER' },
      { x: 8, y: 10, terrainType: 'RIVER' },
      { x: 8, y: 11, terrainType: 'RIVER' },
      { x: 5, y: 3, terrainType: 'MOUNTAIN' },
      { x: 6, y: 3, terrainType: 'MOUNTAIN' },
      { x: 11, y: 7, terrainType: 'MOUNTAIN' },
      { x: 12, y: 7, terrainType: 'MOUNTAIN' },
      { x: 6, y: 6, terrainType: 'FOREST' },
      { x: 10, y: 4, terrainType: 'FOREST' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 4 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 4, y: 5 },
      { id: 'p1_art', owner: 'P1', type: 'ARTILLERY', x: 3, y: 6 },
      { id: 'p1_recon', owner: 'P1', type: 'RECON', x: 2, y: 5 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 14, y: 6 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 13, y: 5 },
      { id: 'p2_art', owner: 'P2', type: 'ARTILLERY', x: 14, y: 4 },
      { id: 'p2_recon', owner: 'P2', type: 'RECON', x: 15, y: 5 },
    ],
  },
  {
    id: 'relay-skyway',
    name: '中継滑走路',
    width: 18,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 16, y: 14, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 16, y: 12, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 15, y: 14, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 8, y: 7, terrainType: 'AIRPORT' },
      { x: 9, y: 8, terrainType: 'AIRPORT' },
      { x: 4, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 6, y: 5, terrainType: 'CITY' },
      { x: 7, y: 7, terrainType: 'CITY' },
      { x: 9, y: 9, terrainType: 'CITY' },
      { x: 11, y: 10, terrainType: 'CITY' },
      { x: 10, y: 11, terrainType: 'CITY' },
      { x: 13, y: 11, terrainType: 'CITY', owner: 'P2' },
      { x: 3, y: 3, terrainType: 'ROAD' },
      { x: 4, y: 3, terrainType: 'ROAD' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 5, y: 5, terrainType: 'ROAD' },
      { x: 6, y: 6, terrainType: 'ROAD' },
      { x: 7, y: 6, terrainType: 'ROAD' },
      { x: 8, y: 7, terrainType: 'ROAD' },
      { x: 8, y: 8, terrainType: 'ROAD' },
      { x: 9, y: 8, terrainType: 'ROAD' },
      { x: 10, y: 9, terrainType: 'ROAD' },
      { x: 10, y: 10, terrainType: 'ROAD' },
      { x: 12, y: 10, terrainType: 'ROAD' },
      { x: 12, y: 11, terrainType: 'ROAD' },
      { x: 13, y: 12, terrainType: 'ROAD' },
      { x: 14, y: 12, terrainType: 'ROAD' },
      { x: 14, y: 13, terrainType: 'ROAD' },
      { x: 6, y: 4, terrainType: 'FOREST' },
      { x: 11, y: 11, terrainType: 'FOREST' },
      { x: 7, y: 5, terrainType: 'MOUNTAIN' },
      { x: 10, y: 10, terrainType: 'MOUNTAIN' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 3 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 4, y: 4 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 2, y: 1 },
      { id: 'p1_attacker', owner: 'P1', type: 'ATTACKER', x: 3, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 14, y: 12 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 13, y: 11 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 15, y: 14 },
      { id: 'p2_bomber', owner: 'P2', type: 'BOMBER', x: 14, y: 14 },
    ],
  },
  {
    id: 'long-march-airlift',
    name: '長征空輸',
    width: 20,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 18, y: 14, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 18, y: 12, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 17, y: 14, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 9, y: 4, terrainType: 'AIRPORT' },
      { x: 10, y: 11, terrainType: 'AIRPORT' },
      { x: 4, y: 3, terrainType: 'CITY', owner: 'P1' },
      { x: 6, y: 4, terrainType: 'CITY' },
      { x: 8, y: 5, terrainType: 'CITY' },
      { x: 11, y: 10, terrainType: 'CITY' },
      { x: 12, y: 9, terrainType: 'CITY' },
      { x: 13, y: 11, terrainType: 'CITY' },
      { x: 15, y: 12, terrainType: 'CITY', owner: 'P2' },
      { x: 5, y: 6, terrainType: 'MOUNTAIN' },
      { x: 6, y: 6, terrainType: 'MOUNTAIN' },
      { x: 13, y: 9, terrainType: 'MOUNTAIN' },
      { x: 14, y: 9, terrainType: 'MOUNTAIN' },
      { x: 7, y: 4, terrainType: 'FOREST' },
      { x: 12, y: 11, terrainType: 'FOREST' },
      { x: 3, y: 2, terrainType: 'ROAD' },
      { x: 4, y: 2, terrainType: 'ROAD' },
      { x: 4, y: 3, terrainType: 'ROAD' },
      { x: 5, y: 3, terrainType: 'ROAD' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 7, y: 5, terrainType: 'ROAD' },
      { x: 7, y: 6, terrainType: 'ROAD' },
      { x: 8, y: 6, terrainType: 'ROAD' },
      { x: 8, y: 7, terrainType: 'ROAD' },
      { x: 9, y: 7, terrainType: 'ROAD' },
      { x: 9, y: 8, terrainType: 'ROAD' },
      { x: 10, y: 8, terrainType: 'ROAD' },
      { x: 11, y: 8, terrainType: 'ROAD' },
      { x: 11, y: 9, terrainType: 'ROAD' },
      { x: 12, y: 10, terrainType: 'ROAD' },
      { x: 13, y: 10, terrainType: 'ROAD' },
      { x: 14, y: 11, terrainType: 'ROAD' },
      { x: 14, y: 12, terrainType: 'ROAD' },
      { x: 15, y: 13, terrainType: 'ROAD' },
      { x: 16, y: 13, terrainType: 'ROAD' },
      { x: 16, y: 14, terrainType: 'ROAD' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 3 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 4, y: 4 },
      { id: 'p1_anti_air', owner: 'P1', type: 'ANTI_AIR', x: 3, y: 5 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 2, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 16, y: 12 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 15, y: 11 },
      { id: 'p2_anti_air', owner: 'P2', type: 'ANTI_AIR', x: 16, y: 10 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 17, y: 14 },
    ],
  },
  {
    id: 'drone-factory-front',
    name: '工場前縁',
    width: 16,
    height: 12,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 14, y: 10, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 14, y: 8, terrainType: 'FACTORY', owner: 'P2' },
      { x: 4, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 11, y: 8, terrainType: 'FACTORY', owner: 'P2' },
      { x: 7, y: 5, terrainType: 'FACTORY' },
      { x: 3, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 6, y: 5, terrainType: 'CITY' },
      { x: 8, y: 6, terrainType: 'CITY' },
      { x: 10, y: 7, terrainType: 'CITY' },
      { x: 12, y: 8, terrainType: 'CITY', owner: 'P2' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 4, terrainType: 'ROAD' },
      { x: 7, y: 4, terrainType: 'ROAD' },
      { x: 8, y: 5, terrainType: 'ROAD' },
      { x: 9, y: 6, terrainType: 'ROAD' },
      { x: 10, y: 6, terrainType: 'ROAD' },
      { x: 4, y: 5, terrainType: 'FOREST' },
      { x: 11, y: 6, terrainType: 'FOREST' },
      { x: 6, y: 7, terrainType: 'MOUNTAIN' },
      { x: 9, y: 4, terrainType: 'MOUNTAIN' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 2, y: 3 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 3, y: 3 },
      { id: 'p1_art', owner: 'P1', type: 'ARTILLERY', x: 2, y: 5 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 13, y: 8 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 12, y: 8 },
      { id: 'p2_art', owner: 'P2', type: 'ARTILLERY', x: 13, y: 6 },
    ],
  },
  {
    id: 'interceptor-belt',
    name: '迎撃防衛線',
    width: 18,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 16, y: 12, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 16, y: 10, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 15, y: 12, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 7, y: 4, terrainType: 'FACTORY' },
      { x: 11, y: 9, terrainType: 'FACTORY' },
      { x: 4, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 7, y: 5, terrainType: 'CITY' },
      { x: 9, y: 6, terrainType: 'CITY' },
      { x: 10, y: 8, terrainType: 'CITY' },
      { x: 12, y: 10, terrainType: 'CITY' },
      { x: 13, y: 9, terrainType: 'CITY', owner: 'P2' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 7, y: 6, terrainType: 'ROAD' },
      { x: 8, y: 6, terrainType: 'ROAD' },
      { x: 9, y: 7, terrainType: 'ROAD' },
      { x: 10, y: 7, terrainType: 'ROAD' },
      { x: 11, y: 8, terrainType: 'ROAD' },
      { x: 12, y: 9, terrainType: 'ROAD' },
      { x: 6, y: 6, terrainType: 'FOREST' },
      { x: 12, y: 8, terrainType: 'FOREST' },
      { x: 8, y: 4, terrainType: 'MOUNTAIN' },
      { x: 9, y: 9, terrainType: 'MOUNTAIN' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 3 },
      { id: 'p1_recon', owner: 'P1', type: 'RECON', x: 4, y: 3 },
      { id: 'p1_counter', owner: 'P1', type: 'COUNTER_DRONE_AA', x: 5, y: 5 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 2, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 14, y: 10 },
      { id: 'p2_recon', owner: 'P2', type: 'RECON', x: 13, y: 10 },
      { id: 'p2_counter', owner: 'P2', type: 'COUNTER_DRONE_AA', x: 12, y: 9 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 15, y: 12 },
    ],
  },
  {
    id: 'industrial-drone-raid',
    name: '工業急襲',
    width: 18,
    height: 16,
    tiles: [
      { x: 1, y: 1, terrainType: 'HQ', owner: 'P1' },
      { x: 16, y: 12, terrainType: 'HQ', owner: 'P2' },
      { x: 1, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 16, y: 10, terrainType: 'FACTORY', owner: 'P2' },
      { x: 2, y: 1, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 15, y: 12, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 4, y: 4, terrainType: 'FACTORY', owner: 'P1' },
      { x: 13, y: 9, terrainType: 'FACTORY', owner: 'P2' },
      { x: 8, y: 6, terrainType: 'FACTORY' },
      { x: 9, y: 7, terrainType: 'FACTORY' },
      { x: 5, y: 5, terrainType: 'CITY', owner: 'P1' },
      { x: 7, y: 5, terrainType: 'CITY' },
      { x: 8, y: 8, terrainType: 'CITY' },
      { x: 9, y: 5, terrainType: 'CITY' },
      { x: 10, y: 6, terrainType: 'CITY' },
      { x: 11, y: 8, terrainType: 'CITY' },
      { x: 12, y: 8, terrainType: 'CITY', owner: 'P2' },
      { x: 5, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 4, terrainType: 'ROAD' },
      { x: 6, y: 5, terrainType: 'ROAD' },
      { x: 7, y: 6, terrainType: 'ROAD' },
      { x: 8, y: 6, terrainType: 'ROAD' },
      { x: 8, y: 7, terrainType: 'ROAD' },
      { x: 9, y: 7, terrainType: 'ROAD' },
      { x: 10, y: 7, terrainType: 'ROAD' },
      { x: 10, y: 8, terrainType: 'ROAD' },
      { x: 11, y: 8, terrainType: 'ROAD' },
      { x: 12, y: 9, terrainType: 'ROAD' },
      { x: 13, y: 10, terrainType: 'ROAD' },
      { x: 6, y: 7, terrainType: 'FOREST' },
      { x: 12, y: 6, terrainType: 'FOREST' },
      { x: 7, y: 3, terrainType: 'MOUNTAIN' },
      { x: 10, y: 10, terrainType: 'MOUNTAIN' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 4 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 4, y: 5 },
      { id: 'p1_anti_air', owner: 'P1', type: 'ANTI_AIR', x: 3, y: 6 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 2, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 14, y: 9 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 13, y: 8 },
      { id: 'p2_anti_air', owner: 'P2', type: 'ANTI_AIR', x: 14, y: 7 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 15, y: 12 },
    ],
  },
  {
    id: 'island-landing',
    name: '上陸諸島戦',
    width: 18,
    height: 18,
    tiles: [
      ...rectTiles(0, 0, 17, 17, 'SEA'),
      ...rectTiles(0, 1, 4, 6, 'PLAIN'),
      ...rectTiles(13, 11, 17, 16, 'PLAIN'),
      ...rectTiles(7, 6, 10, 10, 'PLAIN'),
      ...coordTiles([[5, 5], [12, 12]], 'PLAIN'),
      ...coordTiles([[11, 9], [11, 10]], 'COAST'),
      { x: 1, y: 2, terrainType: 'HQ', owner: 'P1' },
      { x: 1, y: 4, terrainType: 'FACTORY', owner: 'P1' },
      { x: 2, y: 1, terrainType: 'PORT', owner: 'P1' },
      { x: 3, y: 3, terrainType: 'CITY', owner: 'P1' },
      { x: 4, y: 5, terrainType: 'CITY', owner: 'P1' },
      { x: 16, y: 13, terrainType: 'HQ', owner: 'P2' },
      { x: 15, y: 12, terrainType: 'FACTORY', owner: 'P2' },
      { x: 15, y: 16, terrainType: 'PORT', owner: 'P2' },
      { x: 14, y: 14, terrainType: 'CITY', owner: 'P2' },
      { x: 13, y: 12, terrainType: 'CITY', owner: 'P2' },
      { x: 7, y: 8, terrainType: 'PORT' },
      { x: 9, y: 7, terrainType: 'CITY' },
      { x: 8, y: 9, terrainType: 'CITY' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 4 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 2, y: 4 },
      { id: 'p1_destroyer', owner: 'P1', type: 'DESTROYER', x: 3, y: 0 },
      { id: 'p1_lander', owner: 'P1', type: 'LANDER', x: 2, y: 0 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 14, y: 12 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 15, y: 12 },
      { id: 'p2_destroyer', owner: 'P2', type: 'DESTROYER', x: 14, y: 17 },
      { id: 'p2_lander', owner: 'P2', type: 'LANDER', x: 15, y: 17 },
    ],
  },
  {
    id: 'island-hopping',
    name: 'アイランドホッピング',
    width: 22,
    height: 22,
    tiles: [
      ...rectTiles(0, 0, 21, 21, 'SEA'),
      ...rectTiles(0, 2, 4, 8, 'PLAIN'),
      ...rectTiles(17, 14, 21, 19, 'PLAIN'),
      ...rectTiles(6, 8, 8, 11, 'PLAIN'),
      ...rectTiles(10, 9, 12, 12, 'PLAIN'),
      ...rectTiles(14, 10, 16, 13, 'PLAIN'),
      { x: 1, y: 3, terrainType: 'HQ', owner: 'P1' },
      { x: 1, y: 5, terrainType: 'FACTORY', owner: 'P1' },
      { x: 4, y: 2, terrainType: 'PORT', owner: 'P1' },
      { x: 3, y: 4, terrainType: 'CITY', owner: 'P1' },
      { x: 3, y: 7, terrainType: 'CITY', owner: 'P1' },
      { x: 20, y: 18, terrainType: 'HQ', owner: 'P2' },
      { x: 20, y: 16, terrainType: 'FACTORY', owner: 'P2' },
      { x: 19, y: 19, terrainType: 'PORT', owner: 'P2' },
      { x: 18, y: 17, terrainType: 'CITY', owner: 'P2' },
      { x: 18, y: 15, terrainType: 'CITY', owner: 'P2' },
      { x: 7, y: 8, terrainType: 'PORT' },
      { x: 11, y: 9, terrainType: 'PORT' },
      { x: 15, y: 10, terrainType: 'PORT' },
      { x: 7, y: 10, terrainType: 'CITY' },
      { x: 11, y: 11, terrainType: 'CITY' },
      { x: 15, y: 12, terrainType: 'CITY' },
      { x: 11, y: 10, terrainType: 'CITY' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 5 },
      { id: 'p1_destroyer', owner: 'P1', type: 'DESTROYER', x: 3, y: 1 },
      { id: 'p1_lander', owner: 'P1', type: 'LANDER', x: 2, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 18, y: 16 },
      { id: 'p2_destroyer', owner: 'P2', type: 'DESTROYER', x: 18, y: 20 },
      { id: 'p2_lander', owner: 'P2', type: 'LANDER', x: 19, y: 20 },
    ],
  },
  {
    id: 'coastal-cannonade',
    name: '沿岸砲撃戦',
    width: 20,
    height: 18,
    tiles: [
      ...rectTiles(0, 0, 19, 17, 'SEA'),
      ...rectTiles(0, 1, 5, 16, 'PLAIN'),
      ...rectTiles(14, 1, 19, 16, 'PLAIN'),
      ...rectTiles(8, 6, 11, 10, 'PLAIN'),
      ...coordTiles([[6, 4], [6, 5], [6, 9], [6, 10], [13, 7], [13, 8], [13, 12], [13, 13]], 'COAST'),
      { x: 1, y: 2, terrainType: 'HQ', owner: 'P1' },
      { x: 1, y: 4, terrainType: 'FACTORY', owner: 'P1' },
      { x: 3, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 6, y: 2, terrainType: 'PORT', owner: 'P1' },
      { x: 2, y: 6, terrainType: 'CITY', owner: 'P1' },
      { x: 4, y: 8, terrainType: 'CITY', owner: 'P1' },
      { x: 18, y: 15, terrainType: 'HQ', owner: 'P2' },
      { x: 18, y: 13, terrainType: 'FACTORY', owner: 'P2' },
      { x: 16, y: 14, terrainType: 'FACTORY', owner: 'P2' },
      { x: 14, y: 15, terrainType: 'PORT', owner: 'P2' },
      { x: 17, y: 11, terrainType: 'CITY', owner: 'P2' },
      { x: 15, y: 9, terrainType: 'CITY', owner: 'P2' },
      { x: 8, y: 8, terrainType: 'PORT' },
      { x: 9, y: 7, terrainType: 'CITY' },
      { x: 10, y: 7, terrainType: 'CITY' },
      { x: 9, y: 9, terrainType: 'CITY' },
      { x: 10, y: 9, terrainType: 'CITY' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 5 },
      { id: 'p1_art', owner: 'P1', type: 'ARTILLERY', x: 4, y: 6 },
      { id: 'p1_destroyer', owner: 'P1', type: 'DESTROYER', x: 6, y: 3 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 16, y: 12 },
      { id: 'p2_art', owner: 'P2', type: 'ARTILLERY', x: 15, y: 11 },
      { id: 'p2_destroyer', owner: 'P2', type: 'DESTROYER', x: 13, y: 15 },
    ],
  },
  {
    id: 'combined-sea-front',
    name: '海空陸複合戦',
    width: 22,
    height: 20,
    tiles: [
      ...rectTiles(0, 0, 21, 19, 'SEA'),
      ...rectTiles(0, 1, 6, 18, 'PLAIN'),
      ...rectTiles(15, 1, 21, 18, 'PLAIN'),
      ...rectTiles(8, 7, 13, 11, 'PLAIN'),
      ...coordTiles([[7, 5], [7, 6], [14, 12], [14, 13]], 'COAST'),
      { x: 1, y: 2, terrainType: 'HQ', owner: 'P1' },
      { x: 1, y: 4, terrainType: 'FACTORY', owner: 'P1' },
      { x: 3, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 4, y: 2, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 6, y: 2, terrainType: 'PORT', owner: 'P1' },
      { x: 3, y: 7, terrainType: 'CITY', owner: 'P1' },
      { x: 5, y: 9, terrainType: 'CITY', owner: 'P1' },
      { x: 20, y: 17, terrainType: 'HQ', owner: 'P2' },
      { x: 20, y: 15, terrainType: 'FACTORY', owner: 'P2' },
      { x: 18, y: 16, terrainType: 'FACTORY', owner: 'P2' },
      { x: 19, y: 16, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 15, y: 17, terrainType: 'PORT', owner: 'P2' },
      { x: 18, y: 12, terrainType: 'CITY', owner: 'P2' },
      { x: 16, y: 10, terrainType: 'CITY', owner: 'P2' },
      { x: 10, y: 8, terrainType: 'FACTORY' },
      { x: 13, y: 10, terrainType: 'PORT' },
      { x: 9, y: 8, terrainType: 'AIRPORT' },
      { x: 10, y: 9, terrainType: 'CITY' },
      { x: 10, y: 10, terrainType: 'CITY' },
      { x: 11, y: 8, terrainType: 'CITY' },
      { x: 11, y: 10, terrainType: 'CITY' },
      { x: 12, y: 8, terrainType: 'CITY' },
      { x: 12, y: 9, terrainType: 'CITY' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 5 },
      { id: 'p1_tank', owner: 'P1', type: 'TANK', x: 4, y: 5 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 2, y: 1 },
      { id: 'p1_destroyer', owner: 'P1', type: 'DESTROYER', x: 7, y: 3 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 18, y: 14 },
      { id: 'p2_tank', owner: 'P2', type: 'TANK', x: 17, y: 14 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 19, y: 18 },
      { id: 'p2_destroyer', owner: 'P2', type: 'DESTROYER', x: 14, y: 16 },
    ],
  },
  {
    id: 'carrier-strike',
    name: '空母機動戦',
    width: 24,
    height: 20,
    tiles: [
      ...rectTiles(0, 0, 23, 19, 'SEA'),
      ...rectTiles(0, 2, 4, 8, 'PLAIN'),
      ...rectTiles(19, 11, 23, 17, 'PLAIN'),
      ...rectTiles(10, 7, 13, 10, 'PLAIN'),
      ...coordTiles([[18, 12], [18, 13]], 'COAST'),
      { x: 1, y: 3, terrainType: 'HQ', owner: 'P1' },
      { x: 1, y: 5, terrainType: 'FACTORY', owner: 'P1' },
      { x: 4, y: 2, terrainType: 'PORT', owner: 'P1' },
      { x: 4, y: 3, terrainType: 'PORT', owner: 'P1' },
      { x: 3, y: 6, terrainType: 'CITY', owner: 'P1' },
      { x: 3, y: 7, terrainType: 'CITY', owner: 'P1' },
      { x: 22, y: 16, terrainType: 'HQ', owner: 'P2' },
      { x: 22, y: 14, terrainType: 'FACTORY', owner: 'P2' },
      { x: 21, y: 17, terrainType: 'PORT', owner: 'P2' },
      { x: 19, y: 16, terrainType: 'PORT', owner: 'P2' },
      { x: 20, y: 12, terrainType: 'CITY', owner: 'P2' },
      { x: 20, y: 13, terrainType: 'CITY', owner: 'P2' },
      { x: 11, y: 7, terrainType: 'PORT' },
      { x: 11, y: 8, terrainType: 'CITY' },
      { x: 12, y: 8, terrainType: 'CITY' },
      { x: 11, y: 9, terrainType: 'CITY' },
      { x: 12, y: 9, terrainType: 'CITY' },
    ],
    units: [
      { id: 'p1_carrier', owner: 'P1', type: 'CARRIER', x: 6, y: 4 },
      { id: 'p1_destroyer', owner: 'P1', type: 'DESTROYER', x: 5, y: 4 },
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 5 },
      { id: 'p2_carrier', owner: 'P2', type: 'CARRIER', x: 18, y: 15 },
      { id: 'p2_destroyer', owner: 'P2', type: 'DESTROYER', x: 18, y: 14 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 20, y: 14 },
    ],
  },
  {
    id: 'drone-sea-front',
    name: '海空ドローン戦線',
    width: 24,
    height: 20,
    tiles: [
      ...rectTiles(0, 0, 23, 19, 'SEA'),
      ...rectTiles(0, 1, 6, 18, 'PLAIN'),
      ...rectTiles(17, 1, 23, 18, 'PLAIN'),
      ...rectTiles(9, 8, 14, 12, 'PLAIN'),
      ...coordTiles([[7, 6], [7, 7], [16, 12], [16, 13]], 'COAST'),
      { x: 1, y: 2, terrainType: 'HQ', owner: 'P1' },
      { x: 1, y: 4, terrainType: 'FACTORY', owner: 'P1' },
      { x: 3, y: 3, terrainType: 'FACTORY', owner: 'P1' },
      { x: 6, y: 2, terrainType: 'PORT', owner: 'P1' },
      { x: 4, y: 2, terrainType: 'AIRPORT', owner: 'P1' },
      { x: 4, y: 7, terrainType: 'CITY', owner: 'P1' },
      { x: 5, y: 9, terrainType: 'CITY', owner: 'P1' },
      { x: 22, y: 17, terrainType: 'HQ', owner: 'P2' },
      { x: 22, y: 15, terrainType: 'FACTORY', owner: 'P2' },
      { x: 20, y: 16, terrainType: 'FACTORY', owner: 'P2' },
      { x: 17, y: 17, terrainType: 'PORT', owner: 'P2' },
      { x: 21, y: 16, terrainType: 'AIRPORT', owner: 'P2' },
      { x: 19, y: 12, terrainType: 'CITY', owner: 'P2' },
      { x: 18, y: 10, terrainType: 'CITY', owner: 'P2' },
      { x: 11, y: 12, terrainType: 'PORT' },
      { x: 10, y: 10, terrainType: 'FACTORY' },
      { x: 10, y: 9, terrainType: 'CITY' },
      { x: 10, y: 11, terrainType: 'CITY' },
      { x: 11, y: 9, terrainType: 'CITY' },
      { x: 11, y: 11, terrainType: 'CITY' },
      { x: 12, y: 9, terrainType: 'CITY' },
      { x: 12, y: 10, terrainType: 'CITY' },
      { x: 13, y: 9, terrainType: 'CITY' },
      { x: 13, y: 11, terrainType: 'CITY' },
    ],
    units: [
      { id: 'p1_inf', owner: 'P1', type: 'INFANTRY', x: 3, y: 5 },
      { id: 'p1_counter', owner: 'P1', type: 'COUNTER_DRONE_AA', x: 4, y: 6 },
      { id: 'p1_destroyer', owner: 'P1', type: 'DESTROYER', x: 7, y: 3 },
      { id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', x: 2, y: 1 },
      { id: 'p2_inf', owner: 'P2', type: 'INFANTRY', x: 20, y: 14 },
      { id: 'p2_counter', owner: 'P2', type: 'COUNTER_DRONE_AA', x: 19, y: 13 },
      { id: 'p2_destroyer', owner: 'P2', type: 'DESTROYER', x: 16, y: 16 },
      { id: 'p2_fighter', owner: 'P2', type: 'FIGHTER', x: 21, y: 18 },
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
  'supply-gauntlet': {
    difficulty: 'standard',
    estimatedMinutes: 32,
    victoryHint: '中央橋と中立工場を取っても、後続の補給車が詰まると前線が止まりやすい。',
    featureTags: ['空港なし', '補給車重視', '橋梁戦'],
    summary: '地上部隊だけで長い回廊を押し込むため、補給車と道路支配の重要度が高い補給線マップ。',
    recommendedFor: '補給線の遮断と再接続を試したい人',
  },
  'relay-skyway': {
    difficulty: 'beginner',
    estimatedMinutes: 30,
    victoryHint: '中央の中継空港を先に押さえると、空中補給機なしでも航空展開がかなり安定する。',
    featureTags: ['補給空港', '航空補給', '中継拠点'],
    summary: '前線までの距離が長く、どの空港を中継点にするかで制空と継戦力が変わる。',
    recommendedFor: '空中補給機の導線を学びたい人',
  },
  'long-march-airlift': {
    difficulty: 'challenging',
    estimatedMinutes: 42,
    victoryHint: '前進しすぎた航空部隊は帰投路を失いやすい。中継空港と地上護衛を同時に確保する必要がある。',
    featureTags: ['長距離戦', '空輸補給', '前線維持'],
    summary: '地上主力と航空主力の進軍速度がズレやすく、補給線を意識しないと一気に息切れする大規模マップ。',
    recommendedFor: '補給線込みで長期戦を組み立てたい人',
  },
  'drone-factory-front': {
    difficulty: 'standard',
    estimatedMinutes: 28,
    victoryHint: '前面工場を押さえるとドローンの連続展開余地が増え、防衛側は前線工場を切らせない判断が重要。',
    featureTags: ['前線工場', 'ドローン生産', '地上防空'],
    summary: '工場前面の空きマス管理がそのままドローン展開力に直結する、地上主導のドローン戦マップ。',
    recommendedFor: 'ドローン量産と前線維持の相性確認',
  },
  'interceptor-belt': {
    difficulty: 'challenging',
    estimatedMinutes: 34,
    victoryHint: '中央を急ぎすぎると迎撃帯へ入りやすい。防空車の射界を切る進路取りが重要。',
    featureTags: ['迎撃網', '中央工場', '制空阻止'],
    summary: '複数の工場線を使ってドローンを通すか、迎撃帯で止めるかの判断が主役になる。',
    recommendedFor: '迎撃ルールと進路選択の検証',
  },
  'industrial-drone-raid': {
    difficulty: 'challenging',
    estimatedMinutes: 32,
    victoryHint: '中央の複数工場を抑えても、防空車の射界を切れないとドローン突入が止まりやすい。',
    featureTags: ['内陸工場線', 'ドローン急襲', '防空突破'],
    summary: '海上要素を使わず、工場線の押し引きと対空網の穴をどう突くかに絞ったドローン戦マップ。',
    recommendedFor: 'ドローン突入と防空突破を試したい人',
  },
  'island-landing': {
    difficulty: 'beginner',
    estimatedMinutes: 30,
    victoryHint: '中央の中立港と海岸帯を押さえると、揚陸の着地点を先に選べる。',
    featureTags: ['海+島', '上陸戦入門', '中立港'],
    summary: '海を渡って中央島へ上陸する流れを学びやすい、海戦導入向けマップ。',
    recommendedFor: '海上移動と上陸の基本確認',
  },
  'island-hopping': {
    difficulty: 'standard',
    estimatedMinutes: 38,
    victoryHint: '中継港を1つ飛ばして前進すると補給と増援が細りやすい。',
    featureTags: ['島伝い', '中継港', '補給線'],
    summary: '小島ごとの港をつないで段階的に戦線を押し上げる、補給線重視の海戦マップ。',
    recommendedFor: '島伝いの侵攻計画を試したい人',
  },
  'coastal-cannonade': {
    difficulty: 'standard',
    estimatedMinutes: 34,
    victoryHint: '沿岸の海岸帯を押さえると、砲撃支援つきの上陸地点を選びやすい。',
    featureTags: ['海+大陸', '沿岸砲撃', '上陸地点選択'],
    summary: '大陸沿岸への圧力と海上補給線を両立させる、砲撃主体の海戦マップ。',
    recommendedFor: '戦艦実装後の沿岸支援確認',
  },
  'combined-sea-front': {
    difficulty: 'challenging',
    estimatedMinutes: 42,
    victoryHint: '中央の港・空港・工場を同時に管理できる側が、増援速度で優位を取りやすい。',
    featureTags: ['海+陸+空', '複合戦', '中央拠点群'],
    summary: '港湾、空港、工場の三系統が正面から干渉する、管理負荷の高い複合戦マップ。',
    recommendedFor: '海空陸の同時運用を試したい人',
  },
  'carrier-strike': {
    difficulty: 'challenging',
    estimatedMinutes: 44,
    victoryHint: '前線港を確保して空母を寄せるか、中央港で艦載機を回すかの判断が勝負を分ける。',
    featureTags: ['空母機動戦', '海上制空', '前線港'],
    summary: '前進した空母からの発艦と収容を軸に、海空の主導権を争う機動戦マップ。',
    recommendedFor: '空母運用を主役にしたい人',
  },
  'drone-sea-front': {
    difficulty: 'challenging',
    estimatedMinutes: 46,
    victoryHint: '港・空港・工場のいずれかを捨てると、ドローンと海上戦力の連携が崩れやすい。',
    featureTags: ['海+陸+空+ドローン', '対ドローン防空', '複合補給線'],
    summary: '沿岸侵攻、航空展開、ドローン前線を同時に回す、最も複雑な海上複合戦マップ。',
    recommendedFor: 'ドローン込みの海空陸複合戦',
  },
};

const SCENARIOS = TEMPLATES.map((template): SkirmishScenario => {
  validateTemplate(template);

  return {
    id: template.id,
    name: template.name,
    map: buildMap(template),
    units: buildUnits(template),
  };
});

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





