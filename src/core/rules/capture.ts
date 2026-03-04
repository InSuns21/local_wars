import type { TileState } from '@core/types/map';
import type { UnitState } from '@core/types/unit';

const CAPTURE_TARGET = 20;

export const canCapture = (unit: UnitState, tile: TileState): boolean =>
  unit.type === 'INFANTRY' && ['CITY', 'FACTORY', 'HQ'].includes(tile.terrainType);

export const getCapturePower = (unit: UnitState): number => Math.max(0, Math.floor(unit.hp));

export type CaptureResult = {
  tile: TileState;
  completed: boolean;
};

export const applyCaptureStep = (unit: UnitState, tile: TileState): CaptureResult => {
  if (!canCapture(unit, tile)) {
    return { tile, completed: false };
  }

  const current = tile.capturePoints ?? CAPTURE_TARGET;
  const next = Math.max(0, current - getCapturePower(unit));

  if (next === 0) {
    return {
      tile: {
        ...tile,
        owner: unit.owner,
        capturePoints: CAPTURE_TARGET,
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
