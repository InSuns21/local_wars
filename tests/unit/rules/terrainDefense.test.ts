import { getTerrainDefenseModifier } from '@core/rules/terrainDefense';
import type { TerrainType } from '@core/types/map';

describe('terrainDefense 防御補正', () => {
  it('歩兵が山にいると防御補正が有利になる', () => {
    expect(getTerrainDefenseModifier('MOUNTAIN', 'INFANTRY')).toBe(0.8);
  });

  it.each([
    'PLAIN',
    'FOREST',
    'ROAD',
    'BRIDGE',
    'RIVER',
    'SEA',
    'CITY',
    'FACTORY',
    'HQ',
    'AIRPORT',
    'PORT',
  ] as TerrainType[])('%sでは歩兵の防御補正は標準', (terrain) => {
    expect(getTerrainDefenseModifier(terrain, 'INFANTRY')).toBe(1);
  });

  it('山でも歩兵以外は標準補正', () => {
    expect(getTerrainDefenseModifier('MOUNTAIN', 'TANK')).toBe(1);
    expect(getTerrainDefenseModifier('MOUNTAIN', 'RECON')).toBe(1);
  });

  it('地形不明時は標準補正', () => {
    expect(getTerrainDefenseModifier(undefined, 'TANK')).toBe(1);
  });
});
