import type { TerrainType } from '@core/types/map';
import type { UnitType } from '@core/types/unit';

const DEFAULT_DEFENSE_MODIFIER = 1;

const GROUND_UNITS: UnitType[] = [
  'INFANTRY',
  'RECON',
  'TANK',
  'ANTI_TANK',
  'ARTILLERY',
  'ANTI_AIR',
  'FLAK_TANK',
  'MISSILE_AA',
];

const buildGroundDefenseTable = (value: number): Partial<Record<UnitType, number>> =>
  Object.fromEntries(GROUND_UNITS.map((unit) => [unit, value]));

const terrainDefenseTable: Partial<Record<TerrainType, Partial<Record<UnitType, number>>>> = {
  FOREST: buildGroundDefenseTable(0.8),
  MOUNTAIN: {
    INFANTRY: 0.8,
  },
  ROAD: buildGroundDefenseTable(1.2),
  BRIDGE: buildGroundDefenseTable(1.2),
  RIVER: {
    INFANTRY: 1.2,
  },
  CITY: buildGroundDefenseTable(0.75),
  FACTORY: buildGroundDefenseTable(0.75),
  HQ: buildGroundDefenseTable(0.7),
};

export const getTerrainDefenseModifier = (
  terrainType: TerrainType | undefined,
  unitType: UnitType,
): number => {
  if (!terrainType) return DEFAULT_DEFENSE_MODIFIER;
  return terrainDefenseTable[terrainType]?.[unitType] ?? DEFAULT_DEFENSE_MODIFIER;
};
