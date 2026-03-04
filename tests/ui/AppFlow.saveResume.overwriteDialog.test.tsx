import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { App } from '@/app/App';
import { createSavePayload, createScopedSaveKey, seedSlots, startNewGameFlow } from './helpers/appFlowTestUtils';

const TEST_SAVE_KEY = createScopedSaveKey('AppFlow.saveResume.overwriteDialog');

describe('App 導線テスト: セーブ終了と再開(上書き保存)', () => {
  beforeEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(TEST_SAVE_KEY);
  });

  it('保存スロット満杯時は上書き選択ダイアログが表示される', () => {
    seedSlots(
      {
        '1': createSavePayload('old-map-1'),
        '2': createSavePayload('old-map-2'),
        '3': createSavePayload('old-map-3'),
      },
      TEST_SAVE_KEY,
    );

    render(<App saveSlotsStorageKey={TEST_SAVE_KEY} />);
    startNewGameFlow();

    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム終了' }));
    fireEvent.click(screen.getByRole('button', { name: '保存して終了' }));
    expect(screen.getByRole('dialog', { name: '保存スロット上書き選択' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /スロット2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'このスロットに保存' }));

    expect(screen.getByText('タイトル画面')).toBeInTheDocument();

    const raw = localStorage.getItem(TEST_SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed['2'].mapId).toBe('plains-clash');
  });
});
