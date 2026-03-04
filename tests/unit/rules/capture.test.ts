import { applyCaptureStep, canCapture, getCapturePower } from '@core/rules/capture';
import type { TileState } from '@core/types/map';
import type { UnitState } from '@core/types/unit';

const infantry: UnitState = {
  id: 'i1',
  owner: 'P1',
  type: 'INFANTRY',
  hp: 10,
  fuel: 99,
  ammo: 9,
  position: { x: 0, y: 0 },
  moved: false,
  acted: false,
};

describe('占領ルール', () => {
  it('歩兵は拠点を占領できる', () => {
    const city: TileState = { coord: { x: 0, y: 0 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };
    expect(canCapture(infantry, city)).toBe(true);
    expect(getCapturePower(infantry)).toBe(10);
  });

  it('占領値を減らし完了時に所有者を更新する', () => {
    const city: TileState = { coord: { x: 0, y: 0 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    const step1 = applyCaptureStep(infantry, city);
    expect(step1.completed).toBe(false);
    expect(step1.tile.capturePoints).toBe(10);

    const step2 = applyCaptureStep(infantry, step1.tile);
    expect(step2.completed).toBe(true);
    expect(step2.tile.owner).toBe('P1');
    expect(step2.tile.capturePoints).toBe(20);
  });

  it('中立工場はP1歩兵で占領できる', () => {
    const neutralFactory: TileState = { coord: { x: 2, y: 2 }, terrainType: 'FACTORY', capturePoints: 20 };

    const step1 = applyCaptureStep(infantry, neutralFactory);
    const step2 = applyCaptureStep(infantry, step1.tile);

    expect(step2.completed).toBe(true);
    expect(step2.tile.owner).toBe('P1');
    expect(step2.tile.capturePoints).toBe(20);
  });

  it('中立工場はP2歩兵でも占領できる', () => {
    const infantryP2: UnitState = { ...infantry, id: 'i2', owner: 'P2' };
    const neutralFactory: TileState = { coord: { x: 2, y: 2 }, terrainType: 'FACTORY', capturePoints: 20 };

    const step1 = applyCaptureStep(infantryP2, neutralFactory);
    const step2 = applyCaptureStep(infantryP2, step1.tile);

    expect(step2.completed).toBe(true);
    expect(step2.tile.owner).toBe('P2');
    expect(step2.tile.capturePoints).toBe(20);
  });

  it('体力が低いほど占領完了までのターン数が増える', () => {
    const city: TileState = { coord: { x: 0, y: 0 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    const fullHpInfantry: UnitState = { ...infantry, id: 'full', hp: 10 };
    const lowHpInfantry: UnitState = { ...infantry, id: 'low', hp: 4 };

    const fullStep1 = applyCaptureStep(fullHpInfantry, city);
    const lowStep1 = applyCaptureStep(lowHpInfantry, city);

    expect(fullStep1.tile.capturePoints).toBe(10);
    expect(lowStep1.tile.capturePoints).toBe(16);

    let fullTile = city;
    let lowTile = city;
    let fullTurns = 0;
    let lowTurns = 0;

    while (fullTurns < 10) {
      fullTurns += 1;
      const next = applyCaptureStep(fullHpInfantry, fullTile);
      fullTile = next.tile;
      if (next.completed) break;
    }

    while (lowTurns < 10) {
      lowTurns += 1;
      const next = applyCaptureStep(lowHpInfantry, lowTile);
      lowTile = next.tile;
      if (next.completed) break;
    }

    expect(fullTurns).toBe(2);
    expect(lowTurns).toBe(5);
    expect(lowTurns).toBeGreaterThan(fullTurns);
  });

  it('歩兵以外は占領できずタイルは変化しない', () => {
    const tank: UnitState = { ...infantry, id: 't1', type: 'TANK' };
    const city: TileState = { coord: { x: 1, y: 1 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    expect(canCapture(tank, city)).toBe(false);
    const result = applyCaptureStep(tank, city);
    expect(result.completed).toBe(false);
    expect(result.tile).toBe(city);
  });

  it('capturePoints未指定タイルは20から占領計算される', () => {
    const cityWithoutCp: TileState = { coord: { x: 2, y: 1 }, terrainType: 'CITY', owner: 'P2' };
    const step = applyCaptureStep(infantry, cityWithoutCp);

    expect(step.completed).toBe(false);
    expect(step.tile.capturePoints).toBe(10);
  });

  it('getCapturePowerは小数切り捨て・0未満切り上げで返す', () => {
    const weak: UnitState = { ...infantry, hp: 3.9 };
    const invalid: UnitState = { ...infantry, hp: -2 };

    expect(getCapturePower(weak)).toBe(3);
    expect(getCapturePower(invalid)).toBe(0);
  });
});
