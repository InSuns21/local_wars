import { getTerrainDefenseModifier } from '@core/rules/terrainDefense';
import type { TerrainType } from '@core/types/map';

describe('terrainDefense 防御補正', () => {
  it('歩兵系が山にいると防御補正が有利になる', () => {
    expect(getTerrainDefenseModifier('MOUNTAIN', 'INFANTRY')).toBe(0.8);
    expect(getTerrainDefenseModifier('MOUNTAIN', 'AIR_DEFENSE_INFANTRY')).toBe(0.8);
  });

  it('森では地上ユニットの防御補正が有利になる', () => {
    expect(getTerrainDefenseModifier('FOREST', 'INFANTRY')).toBe(0.8);
    expect(getTerrainDefenseModifier('FOREST', 'TANK')).toBe(0.8);
  });

  it('都市・工場・司令部では地上ユニットに防御補正が入る', () => {
    expect(getTerrainDefenseModifier('CITY', 'INFANTRY')).toBe(0.75);
    expect(getTerrainDefenseModifier('FACTORY', 'ANTI_AIR')).toBe(0.75);
    expect(getTerrainDefenseModifier('HQ', 'INFANTRY')).toBe(0.7);
  });

  it('道路・橋・川では地上ユニットの防御補正が不利になる', () => {
    expect(getTerrainDefenseModifier('ROAD', 'TANK')).toBe(1.2);
    expect(getTerrainDefenseModifier('BRIDGE', 'RECON')).toBe(1.2);
    expect(getTerrainDefenseModifier('RIVER', 'INFANTRY')).toBe(1.2);
    expect(getTerrainDefenseModifier('RIVER', 'AIR_DEFENSE_INFANTRY')).toBe(1.2);
  });

  it('川は歩兵以外の地上ユニットには補正が入らない', () => {
    expect(getTerrainDefenseModifier('RIVER', 'TANK')).toBe(1);
    expect(getTerrainDefenseModifier('RIVER', 'ARTILLERY')).toBe(1);
  });

  it('山でも歩兵系以外は標準補正', () => {
    expect(getTerrainDefenseModifier('MOUNTAIN', 'TANK')).toBe(1);
    expect(getTerrainDefenseModifier('MOUNTAIN', 'RECON')).toBe(1);
  });

  it.each(['PLAIN', 'SEA', 'AIRPORT', 'PORT'] as TerrainType[])('%sでは歩兵の防御補正は標準', (terrain) => {
    expect(getTerrainDefenseModifier(terrain, 'INFANTRY')).toBe(1);
  });

  it('海岸では地上ユニットの防御が不利になる', () => {
    expect(getTerrainDefenseModifier('COAST', 'INFANTRY')).toBe(1.15);
    expect(getTerrainDefenseModifier('COAST', 'TANK')).toBe(1.15);
    expect(getTerrainDefenseModifier('COAST', 'AIR_DEFENSE_INFANTRY')).toBe(1.15);
  });

  it('航空・海上ユニットは拠点地形でも標準補正', () => {
    expect(getTerrainDefenseModifier('CITY', 'FIGHTER')).toBe(1);
    expect(getTerrainDefenseModifier('HQ', 'DESTROYER')).toBe(1);
    expect(getTerrainDefenseModifier('COAST', 'DESTROYER')).toBe(1);
  });

  it.each(['FIGHTER', 'BOMBER', 'ATTACKER', 'STEALTH_BOMBER'] as const)(
    '防御側の航空ユニット %s は有利地形でも防御補正を無視する',
    (unitType) => {
      expect(getTerrainDefenseModifier('FOREST', unitType)).toBe(1);
      expect(getTerrainDefenseModifier('CITY', unitType)).toBe(1);
      expect(getTerrainDefenseModifier('HQ', unitType)).toBe(1);
    },
  );

  it('地形不明時は標準補正', () => {
    expect(getTerrainDefenseModifier(undefined, 'TANK')).toBe(1);
  });
});
