import type { GameState } from '@core/types/state';
import type { TerrainType, TileState } from '@core/types/map';
import type { UnitDefinition, UnitState, UnitType } from '@core/types/unit';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';

const CAPTURABLE_TERRAINS = new Set<TerrainType>(['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT']);
const BOMBARDABLE_TERRAINS = new Set<TerrainType>(['CITY', 'FACTORY', 'AIRPORT', 'PORT']);

export const isCapturableTerrain = (terrainType: TerrainType): boolean => CAPTURABLE_TERRAINS.has(terrainType);
export const isBombardableTerrain = (terrainType: TerrainType): boolean => BOMBARDABLE_TERRAINS.has(terrainType);

export const getBaseCaptureTarget = (terrainType: TerrainType): number => {
  if (terrainType === 'CITY') return 10;
  if (terrainType === 'FACTORY' || terrainType === 'HQ' || terrainType === 'AIRPORT' || terrainType === 'PORT') return 20;
  return 20;
};

export const getTileCaptureTarget = (tile: TileState): number => tile.captureTargetOverride ?? getBaseCaptureTarget(tile.terrainType);

export const getBaseStructureHp = (terrainType: TerrainType): number | undefined => {
  if (!isBombardableTerrain(terrainType)) {
    return undefined;
  }
  return getBaseCaptureTarget(terrainType);
};

export const isOperationalFacility = (tile: TileState | undefined): boolean => {
  if (!tile || !isBombardableTerrain(tile.terrainType)) {
    return true;
  }
  return tile.operational !== false;
};

export const getProductionTypeForTerrain = (terrainType: TerrainType): 'GROUND' | 'AIR' | 'NAVAL' | null => {
  if (terrainType === 'FACTORY') return 'GROUND';
  if (terrainType === 'AIRPORT') return 'AIR';
  if (terrainType === 'PORT') return 'NAVAL';
  return null;
};

export const isAirUnitType = (unitType: UnitType): boolean => UNIT_DEFINITIONS[unitType].movementType === 'AIR';
export const isNavalUnitType = (unitType: UnitType): boolean => UNIT_DEFINITIONS[unitType].movementType === 'NAVAL';
export const isStealthUnitType = (unitType: UnitType): boolean => Boolean(UNIT_DEFINITIONS[unitType].isStealth);
export const canBombardProperties = (unitType: UnitType): boolean => Boolean(UNIT_DEFINITIONS[unitType].canBombardProperties);
export const isSupportUnitType = (unitType: UnitType): boolean => Boolean(UNIT_DEFINITIONS[unitType].resupplyTarget);
export const getResupplyTarget = (unitType: UnitType): 'GROUND' | 'AIR' | null => UNIT_DEFINITIONS[unitType].resupplyTarget ?? null;
export const isTransportUnitType = (unitType: UnitType): boolean => Boolean(UNIT_DEFINITIONS[unitType].transportMode);
export const getTransportCapacity = (unitType: UnitType): number => UNIT_DEFINITIONS[unitType].cargoCapacity ?? 0;
export const canTransportUnitTypeCarry = (transportType: UnitType, cargoType: UnitType): boolean =>
  (UNIT_DEFINITIONS[transportType].cargoUnitTypes ?? []).includes(cargoType);

export const getTurnEndFuelCost = (unitType: UnitType): number => UNIT_DEFINITIONS[unitType].turnEndFuelCost ?? 0;

export const canUnitProduceAtTile = (unitType: UnitType, tile: TileState | undefined): boolean => {
  if (!tile) return false;
  const productionType = getProductionTypeForTerrain(tile.terrainType);
  if (!productionType || !isOperationalFacility(tile)) return false;
  if (productionType === 'GROUND') return !isAirUnitType(unitType) && !isNavalUnitType(unitType);
  if (productionType === 'AIR') return isAirUnitType(unitType);
  return isNavalUnitType(unitType);
};

export const isSupplyTileForUnit = (tile: TileState | undefined, unit: UnitState): boolean => {
  if (!tile || tile.owner !== unit.owner) return false;
  if (!isOperationalFacility(tile)) return false;
  if (isAirUnitType(unit.type)) {
    return tile.terrainType === 'AIRPORT';
  }
  return tile.terrainType === 'CITY' || tile.terrainType === 'FACTORY' || tile.terrainType === 'HQ';
};

export const isSupplyChargeRefillTileForUnit = (tile: TileState | undefined, unit: UnitState): boolean => {
  if (!isSupportUnitType(unit.type)) {
    return false;
  }
  return isSupplyTileForUnit(tile, unit);
};

export const applyFacilityDestruction = (tile: TileState, state: GameState): TileState => {
  const currentTarget = getTileCaptureTarget(tile);
  const increasePercent = Math.max(0, state.facilityCaptureCostIncreasePercent ?? 50);
  const increment = Math.floor(currentTarget * (increasePercent / 100));
  return {
    ...tile,
    owner: undefined,
    operational: false,
    structureHp: 0,
    destructionCount: (tile.destructionCount ?? 0) + 1,
    captureTargetOverride: currentTarget + increment,
    capturePoints: currentTarget + increment,
  };
};

export const resetCapturedFacility = (tile: TileState, owner: UnitState['owner']): TileState => {
  const captureTarget = getTileCaptureTarget(tile);
  const baseStructureHp = getBaseStructureHp(tile.terrainType);
  return {
    ...tile,
    owner,
    capturePoints: captureTarget,
    operational: baseStructureHp === undefined ? tile.operational : true,
    structureHp: baseStructureHp,
  };
};

export const getFacilityHp = (tile: TileState | undefined): number | undefined => {
  if (!tile) return undefined;
  if (tile.structureHp !== undefined) return tile.structureHp;
  return getBaseStructureHp(tile.terrainType);
};

export const isFacilityTargetInRange = (attacker: UnitDefinition, distance: number): boolean =>
  distance >= attacker.attackRangeMin && distance <= attacker.attackRangeMax;
