import { DEFAULT_SETTINGS } from '@/app/types';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { getAllSaveSlots, getSaveSlot } from '@services/saveSlots';

const SAVE_KEY = 'local_wars_save_slots_v1';

describe('saveSlots 正規化', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('旧形式セーブでも mapId/settings/state を補完して復元できる', () => {
    const legacyState = createInitialGameState();
    legacyState.actionLog.push({
      turn: 1,
      playerId: 'P1',
      action: 'MAP_SELECTED',
      detail: 'river-crossing',
    });

    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        '1': {
          slotId: 1,
          updatedAt: '2026-03-02T00:00:00.000Z',
          state: legacyState,
        },
        '2': null,
        '3': null,
      }),
    );

    const slot = getSaveSlot(1);

    expect(slot).not.toBeNull();
    expect(slot?.mapId).toBe('river-crossing');
    expect(slot?.settings).toEqual(DEFAULT_SETTINGS);
    expect(slot?.state.humanPlayerSide).toBe(DEFAULT_SETTINGS.humanPlayerSide);
    expect(slot?.state.aiDifficulty).toBe(DEFAULT_SETTINGS.aiDifficulty);
    expect(slot?.state.incomePerProperty).toBe(DEFAULT_SETTINGS.incomePerProperty);
    expect(slot?.state.enemyMemory).toEqual({});
  });

  it('nightmare 難易度を含む設定と状態を正規化して復元できる', () => {
    const nightmareSettings = {
      ...DEFAULT_SETTINGS,
      aiDifficulty: 'nightmare' as const,
      humanPlayerSide: 'P2' as const,
      fogOfWar: true,
      enableAirUnits: false,
      enableNavalUnits: false,
      initialFunds: 16000,
    };
    const nightmareState = createInitialGameState({
      mapId: 'river-crossing',
      settings: nightmareSettings,
    });
    nightmareState.aiDifficulty = 'nightmare';
    nightmareState.humanPlayerSide = 'P2';

    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        '1': {
          slotId: 1,
          updatedAt: '2026-03-21T00:00:00.000Z',
          mapId: 'river-crossing',
          settings: nightmareSettings,
          state: nightmareState,
        },
        '2': null,
        '3': null,
      }),
    );

    const slot = getSaveSlot(1);

    expect(slot).not.toBeNull();
    expect(slot?.settings.aiDifficulty).toBe('nightmare');
    expect(slot?.state.aiDifficulty).toBe('nightmare');
    expect(slot?.settings.humanPlayerSide).toBe('P2');
    expect(slot?.state.humanPlayerSide).toBe('P2');
    expect(slot?.settings.fogOfWar).toBe(true);
    expect(slot?.settings.enableAirUnits).toBe(false);
    expect(slot?.settings.enableNavalUnits).toBe(false);
    expect(slot?.state.enableAirUnits).toBe(false);
    expect(slot?.state.enableNavalUnits).toBe(false);
  });

  it('不正なデータは空スロット扱いにする', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        '1': { slotId: 1, mapId: 'plains-clash' },
        '2': null,
        '3': null,
      }),
    );

    const all = getAllSaveSlots();

    expect(all['1']).toBeNull();
    expect(all['2']).toBeNull();
    expect(all['3']).toBeNull();
  });
});
