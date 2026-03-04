import { fireEvent, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '@/app/types';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { DEFAULT_SAVE_SLOTS_STORAGE_KEY } from '@services/saveSlots';

export const SAVE_KEY = DEFAULT_SAVE_SLOTS_STORAGE_KEY;

export const createScopedSaveKey = (scope: string): string => `${SAVE_KEY}__${scope}`;

export const createSavePayload = (mapId: string) => ({
  mapId,
  state: createInitialGameState({ mapId, settings: DEFAULT_SETTINGS }),
  settings: DEFAULT_SETTINGS,
});

export const createFinishedSavePayload = (mapId: string, winner: 'P1' | 'P2') => {
  const state = createInitialGameState({ mapId, settings: DEFAULT_SETTINGS });
  state.winner = winner;
  return {
    mapId,
    state,
    settings: DEFAULT_SETTINGS,
  };
};

export const seedSlots = (
  slots: {
    '1': ReturnType<typeof createSavePayload> | null;
    '2': ReturnType<typeof createSavePayload> | null;
    '3': ReturnType<typeof createSavePayload> | null;
  },
  storageKey: string = SAVE_KEY,
): void => {
  const now = '2026-03-02T00:00:00.000Z';
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      '1': slots['1'] ? { slotId: 1, updatedAt: now, ...slots['1'] } : null,
      '2': slots['2'] ? { slotId: 2, updatedAt: now, ...slots['2'] } : null,
      '3': slots['3'] ? { slotId: 3, updatedAt: now, ...slots['3'] } : null,
    }),
  );
};

export const startNewGameFlow = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'はじめから' }));
  fireEvent.click(screen.getByRole('button', { name: 'このマップで確定' }));
  fireEvent.click(screen.getByRole('button', { name: 'この設定で開始' }));
};

