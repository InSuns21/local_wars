import { createInitialGameState } from '@core/engine/createInitialGameState';
import {
  findFirstEmptySlot,
  getAllSaveSlots,
  getSaveSlot,
  upsertSaveSlot,
} from '@services/saveSlots';

const SAVE_KEY = 'local_wars_save_slots_v1';

describe('saveSlots 追加カバレッジ', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('JSONが壊れている場合は空スロットを返す', () => {
    localStorage.setItem(SAVE_KEY, '{broken json');

    const slots = getAllSaveSlots();

    expect(slots['1']).toBeNull();
    expect(slots['2']).toBeNull();
    expect(slots['3']).toBeNull();
  });

  it('mapId未保存かつMAP_SELECTEDログなしでは既定mapIdを補完する', () => {
    const legacyState = createInitialGameState();
    legacyState.actionLog = [];

    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        '1': {
          slotId: 1,
          updatedAt: '2026-03-02T00:00:00.000Z',
          state: legacyState,
          settings: {},
        },
        '2': null,
        '3': null,
      }),
    );

    const slot = getSaveSlot(1);

    expect(slot).not.toBeNull();
    expect(slot?.mapId).toBe('plains-clash');
  });

  it('3スロット埋まっている場合は空きスロット探索でnullを返す', () => {
    const state = createInitialGameState();
    const settings = {
      aiDifficulty: 'normal' as const,
      humanPlayerSide: 'P1' as const,
      fogOfWar: false,
      initialFunds: 10000,
      incomePerProperty: 1000,
      incomeAirport: 1000,
      incomePort: 1000,
      hpRecoveryCity: 1,
      hpRecoveryFactory: 2,
      hpRecoveryHq: 3,
      enableAirUnits: true,
      enableNavalUnits: true,
      enableFuelSupply: true,
      enableAmmoSupply: true,
    };

    upsertSaveSlot(1, { mapId: 'plains-clash', state, settings });
    upsertSaveSlot(2, { mapId: 'river-crossing', state, settings });
    upsertSaveSlot(3, { mapId: 'forest-line', state, settings });

    expect(findFirstEmptySlot()).toBeNull();
  });
});
