import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/screens/BattleScreen', async () => await import('./helpers/mockBattleScreen'));

import { App } from '@/app/App';
import { createFinishedSavePayload, createScopedSaveKey, seedSlots } from './helpers/appFlowTestUtils';

const TEST_SAVE_KEY = createScopedSaveKey('AppFlow.saveResume.finishedResult');

describe('App 導線テスト: セーブ終了と再開(勝敗確定データ再開)', () => {
  beforeEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  it('勝敗確定済みデータを読み込むと結果表示からタイトルへ戻れる', () => {
    seedSlots(
      {
        '1': createFinishedSavePayload('plains-clash', 'P1'),
        '2': null,
        '3': null,
      },
      TEST_SAVE_KEY,
    );

    render(<App saveSlotsStorageKey={TEST_SAVE_KEY} />);
    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));
    fireEvent.click(screen.getByRole('button', { name: 'このスロットで開始' }));

    expect(screen.getByRole('heading', { name: '対局結果' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'タイトルへ戻る' }));

    expect(screen.getByRole('heading', { name: 'LOCAL WARS' })).toBeInTheDocument();
  });
});


