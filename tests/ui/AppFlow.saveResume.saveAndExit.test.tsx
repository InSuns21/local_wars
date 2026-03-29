import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import './helpers/mockAppFlowScreens';

import { App } from '@/app/App';
import { createScopedSaveKey, startNewGameFlow } from './helpers/appFlowTestUtils';

const TEST_SAVE_KEY = createScopedSaveKey('AppFlow.saveResume.saveAndExit');

describe('App 導線テスト: セーブ終了と再開(保存して終了)', () => {
  beforeEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  it('ゲーム画面で保存して終了するとタイトルに戻りセーブされる', () => {
    render(<App saveSlotsStorageKey={TEST_SAVE_KEY} />);
    startNewGameFlow();

    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム終了' }));
    fireEvent.click(screen.getByRole('button', { name: '保存して終了' }));

    expect(screen.getByRole('heading', { name: 'LOCAL WARS' })).toBeInTheDocument();

    const raw = localStorage.getItem(TEST_SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed['1']).not.toBeNull();
  });
});


