import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '@/app/App';
import { SAVE_KEY, createSavePayload, seedSlots } from './helpers/appFlowTestUtils';

describe('App 導線テスト: セーブ選択', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('つづきからで空スロット選択時に通知が表示される', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));
    fireEvent.click(screen.getByRole('button', { name: 'このスロットで開始' }));

    expect(screen.getByText('選択したスロットにセーブデータがありません。')).toBeInTheDocument();
  });

  it('セーブ選択画面で削除確認モーダルを経由して削除できる', async () => {
    seedSlots({
      '1': createSavePayload('plains-clash'),
      '2': null,
      '3': null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));

    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByRole('dialog', { name: 'セーブ削除確認' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '削除する' }));

    await waitFor(() => {
      expect(screen.getAllByText('未保存').length).toBeGreaterThan(0);
    });

    const raw = localStorage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed['1']).toBeNull();
  });
});
