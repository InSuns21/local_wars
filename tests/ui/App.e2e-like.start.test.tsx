import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/screens/BattleScreen', async () => await import('./helpers/mockBattleScreen'));

import { App } from '@/app/App';

const openSettings = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'はじめから' }));
};

describe('App E2E相当導線テスト: 開始設定', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('マップ選択で選んだマップサイズの盤面で開始される', () => {
    render(<App />);

    openSettings();
    fireEvent.click(screen.getByRole('button', { name: /河川突破/ }));
    fireEvent.click(screen.getByRole('button', { name: 'このマップで確定' }));
    fireEvent.click(screen.getByRole('button', { name: 'この設定で開始' }));

    expect(screen.getByRole('button', { name: 'タイル 13,9' })).toBeInTheDocument();
  });

});


