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

  it('ドローン戦マップを選ぶと設定画面の初期値がドローン戦プリセットになる', () => {
    render(<App />);

    openSettings();
    fireEvent.click(screen.getByRole('button', { name: /工場前縁/ }));
    fireEvent.click(screen.getByRole('button', { name: 'このマップで確定' }));

    expect(screen.getByLabelText('自爆ドローン有効')).toBeChecked();
    expect(screen.getByLabelText('索敵あり')).toBeChecked();
    expect(screen.getByText('現在の状態: ドローン戦')).toBeInTheDocument();
  });

  it('複数のドローン戦マップで設定画面の初期値がドローン有効になる', () => {
    const droneMapNames = ['工場前縁', '迎撃防衛線', '工業急襲'] as const;

    for (const mapName of droneMapNames) {
      localStorage.clear();
      const { unmount } = render(<App />);

      openSettings();
      fireEvent.click(screen.getByRole('button', { name: new RegExp(mapName) }));
      fireEvent.click(screen.getByRole('button', { name: 'このマップで確定' }));

      expect(screen.getByLabelText('自爆ドローン有効')).toBeChecked();
      expect(screen.getByText('現在の状態: ドローン戦')).toBeInTheDocument();

      unmount();
    }
  });
});
