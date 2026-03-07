import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/screens/BattleScreen', () => require('./helpers/mockBattleScreen'));

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

  it('設定で索敵ONと人間陣営P2を選ぶと開始状態へ反映される', () => {
    render(<App />);

    openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'このマップで確定' }));

    fireEvent.change(screen.getByLabelText('人間が担当する陣営'), { target: { value: 'P2' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '索敵あり' }));

    fireEvent.click(screen.getByRole('button', { name: 'この設定で開始' }));

    expect(screen.getByText('手番: P2')).toBeInTheDocument();
    expect(screen.queryByText('p1_inf')).not.toBeInTheDocument();
    expect(screen.queryByText('p1_tank')).not.toBeInTheDocument();
  });
});
