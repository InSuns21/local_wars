import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import './helpers/mockAppFlowScreens';
import { App } from '@/app/App';
import { SAVE_KEY, createSavePayload, seedSlots } from './helpers/appFlowTestUtils';

describe('App 導線テスト: セーブ選択', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('つづきからで空スロット選択時はカード内でロード不可が分かる', () => {
    seedSlots({
      '1': createSavePayload('plains-clash'),
      '2': null,
      '3': null,
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));
    fireEvent.click(screen.getByLabelText('スロット2'));

    const loadButton = screen.getByRole('button', { name: 'ロード不可' });
    expect(loadButton).toBeDisabled();
    expect(screen.getByText('ロード不可: セーブデータを選択してください。')).toBeInTheDocument();
    expect(screen.queryByText('選択したスロットにセーブデータがありません。')).not.toBeInTheDocument();
  });

  it('保存ありスロット選択時のみロードボタンが有効になる', () => {
    seedSlots({
      '1': null,
      '2': createSavePayload('plains-clash'),
      '3': null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));

    expect(screen.getByRole('button', { name: 'ロード不可' })).toBeDisabled();

    fireEvent.click(screen.getByLabelText('スロット2'));

    expect(screen.getByRole('button', { name: 'このスロットで開始' })).toBeEnabled();
    expect(screen.getByText('このスロットはロードできます。')).toBeInTheDocument();
  });

  it('空スロットのエラー表示はスロット変更で消える', () => {
    seedSlots({
      '1': null,
      '2': createSavePayload('plains-clash'),
      '3': null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));

    fireEvent.click(screen.getByLabelText('スロット2'));

    expect(screen.queryByText('ロード不可: セーブデータを選択してください。')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'このスロットで開始' })).toBeEnabled();
  });

  it('セーブ選択画面で削除確認モーダルを経由して削除できる', async () => {
    seedSlots({
      '1': createSavePayload('plains-clash'),
      '2': null,
      '3': null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));

    const slot1Card = screen.getByText('スロット1').closest('.MuiCard-root');
    expect(slot1Card).not.toBeNull();
    fireEvent.click(within(slot1Card as HTMLElement).getByRole('button', { name: '削除' }));
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

