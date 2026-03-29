import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import './helpers/mockAppFlowScreens';

import { App } from '@/app/App';
import { createScopedSaveKey, startNewGameFlow } from './helpers/appFlowTestUtils';

const TEST_SAVE_KEY = createScopedSaveKey('AppFlow.saveResume.exitWithoutSave');

describe('App 導線テスト: セーブ終了と再開(保存しないで終了)', () => {
  beforeEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  it('保存しないで終了は確認後にタイトルへ戻る', () => {
    render(<App saveSlotsStorageKey={TEST_SAVE_KEY} />);
    startNewGameFlow();

    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム終了' }));
    fireEvent.click(screen.getByRole('button', { name: '保存しないで終了' }));
    expect(screen.getByRole('dialog', { name: '保存しないで終了' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '終了する' }));
    expect(screen.getByRole('heading', { name: 'LOCAL WARS' })).toBeInTheDocument();
  });
});


