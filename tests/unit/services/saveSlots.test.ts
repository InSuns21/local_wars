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
