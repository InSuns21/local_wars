import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/screens/BattleScreen', () => require('./helpers/mockBattleScreen'));

import { App } from '@/app/App';
import { DEFAULT_SETTINGS } from '@/app/types';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { createScopedSaveKey, seedSlots } from './helpers/appFlowTestUtils';

const TEST_SAVE_KEY = createScopedSaveKey('AppFlow.saveResume.resumeAndResave');

describe('App 導線テスト: セーブ終了と再開(再開後再保存)', () => {
  beforeEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  it('つづきから再開後に保存しても mapId/settings が保持される', () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      aiDifficulty: 'easy' as const,
      humanPlayerSide: 'P2' as const,
      initialFunds: 12000,
      incomePerProperty: 1500,
      fogOfWar: true,
    };
    const state = createInitialGameState({ mapId: 'river-crossing', settings: customSettings });

    seedSlots(
      {
        '1': {
          mapId: 'river-crossing',
          state,
          settings: customSettings,
        },
        '2': null,
        '3': null,
      },
      TEST_SAVE_KEY,
    );

    render(<App saveSlotsStorageKey={TEST_SAVE_KEY} />);
    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));
    fireEvent.click(screen.getByRole('button', { name: 'このスロットで開始' }));

    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム終了' }));
    fireEvent.click(screen.getByRole('button', { name: '保存して終了' }));

    const raw = localStorage.getItem(TEST_SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed['1'].mapId).toBe('river-crossing');
    expect(parsed['1'].settings.aiDifficulty).toBe('easy');
    expect(parsed['1'].settings.humanPlayerSide).toBe('P2');
    expect(parsed['1'].settings.incomePerProperty).toBe(1500);
    expect(parsed['1'].settings.initialFunds).toBe(12000);
  });

  it('保存再開後も resolvedAiProfile の表示を継続できる', () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      selectedAiProfile: 'adaptive' as const,
    };
    const state = createInitialGameState({ mapId: 'river-crossing', settings: customSettings });
    state.selectedAiProfile = 'adaptive';
    state.resolvedAiProfile = 'captain';

    seedSlots(
      {
        '1': {
          mapId: 'river-crossing',
          state,
          settings: customSettings,
        },
        '2': null,
        '3': null,
      },
      TEST_SAVE_KEY,
    );

    render(<App saveSlotsStorageKey={TEST_SAVE_KEY} />);
    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));
    fireEvent.click(screen.getByRole('button', { name: 'このスロットで開始' }));

    expect(screen.getByText('敵AI傾向: 可変→占領')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム終了' }));
    fireEvent.click(screen.getByRole('button', { name: '保存して終了' }));

    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));
    fireEvent.click(screen.getByRole('button', { name: 'このスロットで開始' }));

    expect(screen.getByText('敵AI傾向: 可変→占領')).toBeInTheDocument();
  });
});
