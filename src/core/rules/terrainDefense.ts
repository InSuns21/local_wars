import type { TerrainType } from '@core/types/map';
import type { UnitType } from '@core/types/unit';

const DEFAULT_DEFENSE_MODIFIER = 1;

const terrainDefenseTable: Partial<Record<TerrainType, Partial<Record<UnitType, number>>>> = {
  MOUNTAIN: {
    INFANTRY: 0.8,
  },
};

export const getTerrainDefenseModifier = (
  terrainType: TerrainType | undefined,
  unitType: UnitType,
): number => {
  if (!terrainType) return DEFAULT_DEFENSE_MODIFIER;
  return terrainDefenseTable[terrainType]?.[unitType] ?? DEFAULT_DEFENSE_MODIFIER;
};
