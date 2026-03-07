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
  it('MAP_CATALOGが15件あり、全IDが実マップ定義に存在する', () => {
    expect(MAP_CATALOG).toHaveLength(15);

    for (const meta of MAP_CATALOG) {
      const scenario = getSkirmishScenario(meta.id);
      expect(scenario).not.toBeNull();
      expect(scenario?.map.width).toBe(meta.width);
      expect(scenario?.map.height).toBe(meta.height);
    }
  });
});

