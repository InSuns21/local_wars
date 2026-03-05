import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { App } from '@/app/App';
import { startNewGameFlow } from './helpers/appFlowTestUtils';

describe('App 導線テスト: ナビゲーション', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('タイトルからクレジットへ遷移して戻れる', () => {
    render(<App />);

    expect(screen.getByText('タイトル画面')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'クレジット' }));

    expect(screen.getByRole('heading', { name: 'クレジット' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'タイトルへ戻る' }));

    expect(screen.getByText('タイトル画面')).toBeInTheDocument();
  });

  it('はじめからで マップ選択→設定→ゲーム画面 へ進む', () => {
    render(<App />);

    startNewGameFlow();

    expect(screen.getByRole('heading', { name: 'LOCAL WARS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'その他' })).toBeInTheDocument();
  });

  it('タイトルからチュートリアルへ遷移して戻れる', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'チュートリアル' }));
    expect(screen.getByRole('heading', { name: 'チュートリアル' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '勝利条件' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '戻る' }));
    expect(screen.getByText('タイトル画面')).toBeInTheDocument();
  });

  it('ゲーム画面からチュートリアルへ遷移して対局に戻れる', () => {
    render(<App />);
    startNewGameFlow();

    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプ' }));
    fireEvent.click(screen.getByRole('button', { name: 'チュートリアル' }));
    expect(screen.getByRole('heading', { name: 'チュートリアル' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '戻る' }));
    expect(screen.getByRole('heading', { name: 'LOCAL WARS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'その他' })).toBeInTheDocument();
  });

  it('タイトルから音量設定へ遷移して戻れる', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '音量設定' }));
    expect(screen.getByRole('heading', { name: '音量設定' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイトルへ戻る' }));
    expect(screen.getByText('タイトル画面')).toBeInTheDocument();
  });
});

