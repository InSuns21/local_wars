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
    const city: TileState = { coord: { x: 0, y: 0 }, terrainType: 'CITY', owner: 'P2', capturePoints: 10 };
    expect(canCapture(infantry, city)).toBe(true);
    expect(getCapturePower(infantry)).toBe(10);
  });

  it('都市はHP10歩兵で1ターン占領できる', () => {
    const city: TileState = { coord: { x: 0, y: 0 }, terrainType: 'CITY', owner: 'P2', capturePoints: 10 };

    const step = applyCaptureStep(infantry, city);
    expect(step.completed).toBe(true);
    expect(step.tile.owner).toBe('P1');
    expect(step.tile.capturePoints).toBe(10);
  });

  it('中立工場はP1歩兵で2ターン占領できる', () => {
    const neutralFactory: TileState = { coord: { x: 2, y: 2 }, terrainType: 'FACTORY', capturePoints: 20 };

    const step1 = applyCaptureStep(infantry, neutralFactory);
    expect(step1.completed).toBe(false);
    expect(step1.tile.capturePoints).toBe(10);

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
    const city: TileState = { coord: { x: 0, y: 0 }, terrainType: 'CITY', owner: 'P2', capturePoints: 10 };

    const fullHpInfantry: UnitState = { ...infantry, id: 'full', hp: 10 };
    const lowHpInfantry: UnitState = { ...infantry, id: 'low', hp: 4 };

    const fullStep1 = applyCaptureStep(fullHpInfantry, city);
    const lowStep1 = applyCaptureStep(lowHpInfantry, city);

    expect(fullStep1.completed).toBe(true);
    expect(fullStep1.tile.capturePoints).toBe(10);
    expect(lowStep1.tile.capturePoints).toBe(6);

    let lowTile = city;
    let lowTurns = 0;

    while (lowTurns < 10) {
      lowTurns += 1;
      const next = applyCaptureStep(lowHpInfantry, lowTile);
      lowTile = next.tile;
      if (next.completed) break;
    }

    expect(lowTurns).toBe(3);
  });

  it('歩兵以外は占領できずタイルは変化しない', () => {
    const tank: UnitState = { ...infantry, id: 't1', type: 'TANK' };
    const city: TileState = { coord: { x: 1, y: 1 }, terrainType: 'CITY', owner: 'P2', capturePoints: 10 };

    expect(canCapture(tank, city)).toBe(false);
    const result = applyCaptureStep(tank, city);
    expect(result.completed).toBe(false);
    expect(result.tile).toBe(city);
  });

  it('防空歩兵は拠点を占領できる', () => {
    const airDefenseInfantry: UnitState = { ...infantry, id: 'ad1', type: 'AIR_DEFENSE_INFANTRY' };
    const city: TileState = { coord: { x: 1, y: 1 }, terrainType: 'CITY', owner: 'P2', capturePoints: 10 };

    expect(canCapture(airDefenseInfantry, city)).toBe(true);
    expect(getCapturePower(airDefenseInfantry)).toBe(10);
  });

  it('capturePoints未指定の都市は10から占領計算される', () => {
    const cityWithoutCp: TileState = { coord: { x: 2, y: 1 }, terrainType: 'CITY', owner: 'P2' };
    const step = applyCaptureStep(infantry, cityWithoutCp);

    expect(step.completed).toBe(true);
    expect(step.tile.capturePoints).toBe(10);
  });

  it('getCapturePowerは小数切り捨て・0未満切り上げで返す', () => {
    const weak: UnitState = { ...infantry, hp: 3.9 };
    const invalid: UnitState = { ...infantry, hp: -2 };

    expect(getCapturePower(weak)).toBe(3);
    expect(getCapturePower(invalid)).toBe(0);
  });
});

