import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { TileState } from '@core/types/map';
import type { UnitState } from '@core/types/unit';
import { getBaseCaptureTarget, getBaseStructureHp, getTileCaptureTarget, isCapturableTerrain } from './facilities';

export const getCaptureTarget = (terrainType: TileState['terrainType']): number => getBaseCaptureTarget(terrainType);

export const canCapture = (unit: UnitState, tile: TileState): boolean =>
  UNIT_DEFINITIONS[unit.type].canCapture === true && isCapturableTerrain(tile.terrainType);

export const getCapturePower = (unit: UnitState): number => Math.max(0, Math.floor(unit.hp));

export type CaptureResult = {
  tile: TileState;
  completed: boolean;
};

export const applyCaptureStep = (unit: UnitState, tile: TileState): CaptureResult => {
  if (!canCapture(unit, tile)) {
    return { tile, completed: false };
  }

  const captureTarget = getTileCaptureTarget(tile);
  const current = tile.capturePoints ?? captureTarget;
  const next = Math.max(0, current - getCapturePower(unit));

  if (next === 0) {
    return {
      tile: {
        ...tile,
        owner: unit.owner,
        capturePoints: captureTarget,
        operational: getBaseStructureHp(tile.terrainType) === undefined ? tile.operational : true,
        structureHp: getBaseStructureHp(tile.terrainType),
      },
      completed: true,
    };
  }

  return {
    tile: {
      ...tile,
      capturePoints: next,
    },
    completed: false,
  };
};
