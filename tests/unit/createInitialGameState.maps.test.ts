import { createInitialGameState } from '@core/engine/createInitialGameState';
import { MAP_CATALOG } from '@data/maps';
import { getSkirmishScenario } from '@data/skirmishMaps';

describe('createInitialGameState マップ読み込み', () => {
  it('mapIdを指定すると該当マップの盤面と初期配置を読み込む', () => {
    const state = createInitialGameState({ mapId: 'river-crossing' });

    expect(state.map.width).toBe(14);
    expect(state.map.height).toBe(10);
    expect(state.map.tiles['6,4']?.terrainType).toBe('BRIDGE');
    expect(state.units.p1_art.position).toEqual({ x: 2, y: 5 });
    expect(state.units.p2_art.position).toEqual({ x: 11, y: 4 });
  });

  it('異なるmapIdで盤面構造が変わる', () => {
    const plains = createInitialGameState({ mapId: 'plains-clash' });
    const canyon = createInitialGameState({ mapId: 'canyon-push' });

    expect(plains.map.width).not.toBe(canyon.map.width);
    expect(plains.map.tiles['6,4']?.terrainType).toBe('ROAD');
    expect(canyon.map.tiles['6,4']?.terrainType).toBe('ROAD');
    expect(canyon.map.tiles['5,4']?.terrainType).toBe('PLAIN');
  });

  it('未定義mapIdの場合はフォールバックマップを使う', () => {
    const state = createInitialGameState({ mapId: 'unknown-map-id' });

    expect(state.map.width).toBe(5);
    expect(state.map.height).toBe(5);
    expect(state.units.p1_tank.position).toEqual({ x: 1, y: 2 });
  });
  it('mapIdを指定すると勝敗判定用の司令部メタが復元される', () => {
    const state = createInitialGameState({ mapId: 'plains-clash' });

    expect(state.map.commandHqByPlayer?.P1).toEqual({ x: 1, y: 1 });
    expect(state.map.commandHqByPlayer?.P2).toEqual({ x: 10, y: 8 });
  });
});

describe('スカーミッシュマップ定義', () => {
  it('MAP_CATALOGが18件あり、全IDが実マップ定義に存在する', () => {
    expect(MAP_CATALOG).toHaveLength(18);

    for (const meta of MAP_CATALOG) {
      const scenario = getSkirmishScenario(meta.id);
      expect(scenario).not.toBeNull();
      expect(scenario?.map.width).toBe(meta.width);
      expect(scenario?.map.height).toBe(meta.height);
    }
  });

  it('空港を含むマップは16x16以上で都市が6個以上ある', () => {
    for (const meta of MAP_CATALOG) {
      const scenario = getSkirmishScenario(meta.id);
      if (!scenario) continue;

      const tiles = Object.values(scenario.map.tiles);
      const hasAirport = tiles.some((tile) => tile.terrainType === 'AIRPORT');
      if (!hasAirport) continue;

      const cityCount = tiles.filter((tile) => tile.terrainType === 'CITY').length;
      expect(scenario.map.width).toBeGreaterThanOrEqual(16);
      expect(scenario.map.height).toBeGreaterThanOrEqual(16);
      expect(cityCount).toBeGreaterThanOrEqual(6);
    }
  });

  it('補給線重視マップ3種が追加され、補給回廊だけ空港を持たない', () => {
    const supplyGauntlet = getSkirmishScenario('supply-gauntlet');
    const relaySkyway = getSkirmishScenario('relay-skyway');
    const longMarchAirlift = getSkirmishScenario('long-march-airlift');

    expect(supplyGauntlet).not.toBeNull();
    expect(relaySkyway).not.toBeNull();
    expect(longMarchAirlift).not.toBeNull();

    const supplyAirports = Object.values(supplyGauntlet?.map.tiles ?? {}).filter((tile) => tile.terrainType === 'AIRPORT');
    const relayAirports = Object.values(relaySkyway?.map.tiles ?? {}).filter((tile) => tile.terrainType === 'AIRPORT');
    const longMarchAirports = Object.values(longMarchAirlift?.map.tiles ?? {}).filter((tile) => tile.terrainType === 'AIRPORT');

    expect(supplyAirports).toHaveLength(0);
    expect(relayAirports.length).toBeGreaterThanOrEqual(2);
    expect(longMarchAirports.length).toBeGreaterThanOrEqual(2);
  });

  it('道路誘導マップの斜め道路にマンハッタン補間タイルが追加されている', () => {
    const runwayRush = getSkirmishScenario('runway-rush');
    const relaySkyway = getSkirmishScenario('relay-skyway');
    const longMarchAirlift = getSkirmishScenario('long-march-airlift');

    expect(runwayRush?.map.tiles['9,7']?.terrainType).toBe('ROAD');

    expect(relaySkyway?.map.tiles['4,3']?.terrainType).toBe('ROAD');
    expect(relaySkyway?.map.tiles['7,6']?.terrainType).toBe('ROAD');
    expect(relaySkyway?.map.tiles['12,10']?.terrainType).toBe('ROAD');
    expect(relaySkyway?.map.tiles['14,12']?.terrainType).toBe('ROAD');

    expect(longMarchAirlift?.map.tiles['4,2']?.terrainType).toBe('ROAD');
    expect(longMarchAirlift?.map.tiles['7,5']?.terrainType).toBe('ROAD');
    expect(longMarchAirlift?.map.tiles['11,8']?.terrainType).toBe('ROAD');
    expect(longMarchAirlift?.map.tiles['14,11']?.terrainType).toBe('ROAD');
    expect(longMarchAirlift?.map.tiles['16,13']?.terrainType).toBe('ROAD');
  });
});

