import { createInitialGameState } from '@core/engine/createInitialGameState';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import {
  applyFacilityDestruction,
  canBombardProperties,
  canTransportUnitTypeCarry,
  canUnitProduceAtTile,
  getBaseCaptureTarget,
  getBaseStructureHp,
  getFacilityHp,
  getProductionTypeForTerrain,
  getTileCaptureTarget,
  getTransportCapacity,
  getTurnEndFuelCost,
  isAirUnitType,
  isBombardableTerrain,
  isCapturableTerrain,
  isFacilityTargetInRange,
  isNavalUnitType,
  isOperationalFacility,
  isStealthUnitType,
  isSupplyTileForUnit,
  resetCapturedFacility,
} from '@core/rules/facilities';
import type { TileState } from '@core/types/map';
import type { UnitState } from '@core/types/unit';

const makeTile = (overrides: Partial<TileState> = {}): TileState => ({
  coord: { x: 0, y: 0 },
  terrainType: 'CITY',
  owner: 'P1',
  capturePoints: 10,
  operational: true,
  ...overrides,
});

const makeUnit = (overrides: Partial<UnitState> = {}): UnitState => ({
  id: 'u1',
  owner: 'P1',
  type: 'INFANTRY',
  hp: 10,
  fuel: 99,
  ammo: 9,
  position: { x: 0, y: 0 },
  moved: false,
  acted: false,
  lastMovePath: [],
  ...overrides,
});

describe('facilities rules', () => {
  it('占領可能地形と爆撃可能地形を判定できる', () => {
    expect(isCapturableTerrain('CITY')).toBe(true);
    expect(isCapturableTerrain('PORT')).toBe(true);
    expect(isCapturableTerrain('PLAIN')).toBe(false);

    expect(isBombardableTerrain('CITY')).toBe(true);
    expect(isBombardableTerrain('AIRPORT')).toBe(true);
    expect(isBombardableTerrain('HQ')).toBe(false);
  });

  it('地形ごとの基本占領値と施設HPを返す', () => {
    expect(getBaseCaptureTarget('CITY')).toBe(10);
    expect(getBaseCaptureTarget('FACTORY')).toBe(20);
    expect(getBaseCaptureTarget('AIRPORT')).toBe(20);
    expect(getBaseCaptureTarget('PORT')).toBe(20);
    expect(getBaseCaptureTarget('PLAIN')).toBe(20);

    expect(getBaseStructureHp('CITY')).toBe(10);
    expect(getBaseStructureHp('FACTORY')).toBe(20);
    expect(getBaseStructureHp('AIRPORT')).toBe(20);
    expect(getBaseStructureHp('PORT')).toBe(20);
    expect(getBaseStructureHp('PLAIN')).toBeUndefined();
  });

  it('タイル状態から占領値と施設HPを導出できる', () => {
    expect(getTileCaptureTarget(makeTile())).toBe(10);
    expect(getTileCaptureTarget(makeTile({ captureTargetOverride: 17 }))).toBe(17);

    expect(getFacilityHp(undefined)).toBeUndefined();
    expect(getFacilityHp(makeTile({ structureHp: 3 }))).toBe(3);
    expect(getFacilityHp(makeTile({ terrainType: 'FACTORY', structureHp: undefined, capturePoints: 20 }))).toBe(20);
  });

  it('稼働状態と生産種別を判定できる', () => {
    expect(isOperationalFacility(undefined)).toBe(true);
    expect(isOperationalFacility(makeTile({ terrainType: 'PLAIN' }))).toBe(true);
    expect(isOperationalFacility(makeTile({ operational: false }))).toBe(false);

    expect(getProductionTypeForTerrain('FACTORY')).toBe('GROUND');
    expect(getProductionTypeForTerrain('AIRPORT')).toBe('AIR');
    expect(getProductionTypeForTerrain('PORT')).toBe('NAVAL');
    expect(getProductionTypeForTerrain('CITY')).toBeNull();
  });

  it('ユニット種別ごとの施設関連特性を返す', () => {
    expect(isAirUnitType('FIGHTER')).toBe(true);
    expect(isAirUnitType('INFANTRY')).toBe(false);
    expect(isNavalUnitType('DESTROYER')).toBe(true);
    expect(isNavalUnitType('CARRIER')).toBe(true);
    expect(isNavalUnitType('SUBMARINE')).toBe(true);
    expect(isNavalUnitType('BATTLESHIP')).toBe(true);
    expect(isNavalUnitType('SUPPLY_SHIP')).toBe(true);
    expect(isNavalUnitType('TANK')).toBe(false);
    expect(isStealthUnitType('STEALTH_BOMBER')).toBe(true);
    expect(isStealthUnitType('SUBMARINE')).toBe(true);
    expect(isStealthUnitType('BOMBER')).toBe(false);
    expect(canBombardProperties('BOMBER')).toBe(true);
    expect(canBombardProperties('ATTACKER')).toBe(false);
    expect(getTransportCapacity('LANDER')).toBe(2);
    expect(UNIT_DEFINITIONS.LANDER.transportMode).toBe('NAVAL');
    expect(canTransportUnitTypeCarry('LANDER', 'TANK')).toBe(true);
    expect(canTransportUnitTypeCarry('LANDER', 'AIR_DEFENSE_INFANTRY')).toBe(true);
    expect(canTransportUnitTypeCarry('LANDER', 'SUICIDE_DRONE')).toBe(true);
    expect(canTransportUnitTypeCarry('LANDER', 'FIGHTER')).toBe(false);
    expect(getTurnEndFuelCost('FIGHTER')).toBe(1);
    expect(getTurnEndFuelCost('STEALTH_BOMBER')).toBe(2);
    expect(getTurnEndFuelCost('INFANTRY')).toBe(0);
  });

  it('拠点ごとの生産可否を判定できる', () => {
    expect(canUnitProduceAtTile('INFANTRY', undefined)).toBe(false);
    expect(canUnitProduceAtTile('INFANTRY', makeTile({ terrainType: 'CITY' }))).toBe(false);
    expect(canUnitProduceAtTile('INFANTRY', makeTile({ terrainType: 'FACTORY', operational: false }))).toBe(false);

    expect(canUnitProduceAtTile('INFANTRY', makeTile({ terrainType: 'FACTORY' }))).toBe(true);
    expect(canUnitProduceAtTile('HEAVY_TANK', makeTile({ terrainType: 'FACTORY', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('FIGHTER', makeTile({ terrainType: 'FACTORY' }))).toBe(false);
    expect(canUnitProduceAtTile('MISSILE_AA', makeTile({ terrainType: 'FACTORY', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('FLAK_TANK', makeTile({ terrainType: 'FACTORY', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('SUPPLY_TRUCK', makeTile({ terrainType: 'FACTORY', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('FIGHTER', makeTile({ terrainType: 'AIRPORT', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('AIR_TANKER', makeTile({ terrainType: 'AIRPORT', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('INFANTRY', makeTile({ terrainType: 'AIRPORT', capturePoints: 20 }))).toBe(false);
    expect(canUnitProduceAtTile('DESTROYER', makeTile({ terrainType: 'PORT', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('CARRIER', makeTile({ terrainType: 'PORT', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('SUBMARINE', makeTile({ terrainType: 'PORT', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('BATTLESHIP', makeTile({ terrainType: 'PORT', capturePoints: 20 }))).toBe(true);
    expect(canUnitProduceAtTile('SUPPLY_SHIP', makeTile({ terrainType: 'PORT', capturePoints: 20 }))).toBe(true);
  });

  it('ユニットごとの補給可能タイルを判定できる', () => {
    const ground = makeUnit({ type: 'INFANTRY' });
    const truck = makeUnit({ type: 'SUPPLY_TRUCK', supplyCharges: 1 });
    const air = makeUnit({ type: 'FIGHTER', fuel: 20, ammo: 1 });
    const tanker = makeUnit({ type: 'AIR_TANKER', fuel: 20, ammo: 0, supplyCharges: 1 });
    const naval = makeUnit({ type: 'DESTROYER', fuel: 20, ammo: 1 });
    const supplyShip = makeUnit({ type: 'SUPPLY_SHIP', fuel: 20, ammo: 0, supplyCharges: 1 });

    expect(isSupplyTileForUnit(undefined, ground)).toBe(false);
    expect(isSupplyTileForUnit(makeTile({ owner: 'P2' }), ground)).toBe(false);
    expect(isSupplyTileForUnit(makeTile({ operational: false }), ground)).toBe(false);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'CITY' }), ground)).toBe(true);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'FACTORY', capturePoints: 20 }), ground)).toBe(true);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'HQ', capturePoints: 20 }), ground)).toBe(true);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'PORT', capturePoints: 20 }), ground)).toBe(false);

    expect(isSupplyTileForUnit(makeTile({ terrainType: 'AIRPORT', capturePoints: 20 }), air)).toBe(true);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'CITY' }), air)).toBe(false);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'CITY' }), truck)).toBe(true);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'AIRPORT', capturePoints: 20 }), tanker)).toBe(true);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'PORT', capturePoints: 20 }), naval)).toBe(true);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'PORT', capturePoints: 20 }), supplyShip)).toBe(true);
    expect(isSupplyTileForUnit(makeTile({ terrainType: 'CITY' }), naval)).toBe(false);
  });

  it('施設破壊で所有解除・機能停止・占領コスト増加が適用される', () => {
    const state = createInitialGameState();
    const destroyed = applyFacilityDestruction(
      makeTile({
        terrainType: 'FACTORY',
        capturePoints: 20,
        captureTargetOverride: 20,
        structureHp: 4,
        destructionCount: 1,
      }),
      state,
    );

    expect(destroyed.owner).toBeUndefined();
    expect(destroyed.operational).toBe(false);
    expect(destroyed.structureHp).toBe(0);
    expect(destroyed.destructionCount).toBe(2);
    expect(destroyed.captureTargetOverride).toBe(30);
    expect(destroyed.capturePoints).toBe(30);
  });

  it('施設破壊コスト増加率は負値でも0未満にならない', () => {
    const state = createInitialGameState();
    state.facilityCaptureCostIncreasePercent = -20;

    const destroyed = applyFacilityDestruction(
      makeTile({ terrainType: 'CITY', capturePoints: 10, captureTargetOverride: 10, structureHp: 2 }),
      state,
    );

    expect(destroyed.captureTargetOverride).toBe(10);
    expect(destroyed.capturePoints).toBe(10);
  });

  it('施設再占領時に爆撃可能施設は再稼働し、非爆撃施設は既存状態を維持する', () => {
    const city = resetCapturedFacility(
      makeTile({
        terrainType: 'CITY',
        owner: undefined,
        captureTargetOverride: 15,
        capturePoints: 1,
        operational: false,
        structureHp: 0,
      }),
      'P1',
    );
    expect(city.owner).toBe('P1');
    expect(city.capturePoints).toBe(15);
    expect(city.operational).toBe(true);
    expect(city.structureHp).toBe(10);

    const hq = resetCapturedFacility(
      makeTile({
        terrainType: 'HQ',
        owner: undefined,
        capturePoints: 3,
        operational: false,
        structureHp: undefined,
      }),
      'P2',
    );
    expect(hq.owner).toBe('P2');
    expect(hq.capturePoints).toBe(20);
    expect(hq.operational).toBe(false);
    expect(hq.structureHp).toBeUndefined();
  });

  it('施設射程判定は攻撃レンジ内のみ true を返す', () => {
    expect(isFacilityTargetInRange(UNIT_DEFINITIONS.BOMBER, 1)).toBe(true);
    expect(isFacilityTargetInRange(UNIT_DEFINITIONS.BOMBER, 5)).toBe(false);
  });
});
