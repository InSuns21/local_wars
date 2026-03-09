import { DRONE_FOCUSED_MAP_IDS, GAME_SETTINGS_PRESETS, isDroneFocusedMapId } from '@/app/types';

describe('map preset rules', () => {
  it('ドローン戦マップID一覧は期待した3件に固定される', () => {
    expect(DRONE_FOCUSED_MAP_IDS).toEqual(['drone-factory-front', 'interceptor-belt', 'industrial-drone-raid']);
  });

  it('ドローン戦マップだけドローン戦プリセットを使う判定になる', () => {
    expect(isDroneFocusedMapId('drone-factory-front')).toBe(true);
    expect(isDroneFocusedMapId('interceptor-belt')).toBe(true);
    expect(isDroneFocusedMapId('industrial-drone-raid')).toBe(true);
    expect(isDroneFocusedMapId('river-crossing')).toBe(false);
  });

  it('ドローン戦プリセットは自爆ドローン有効を返す', () => {
    expect(GAME_SETTINGS_PRESETS.drone.enableSuicideDrones).toBe(true);
  });
});
