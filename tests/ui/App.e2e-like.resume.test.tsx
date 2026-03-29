import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import './helpers/mockAppFlowScreens';

import { App } from '@/app/App';

const openSettings = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'はじめから' }));
};

describe('App E2E相当導線テスト: 再開保存', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('再開→保存して終了→再開でも試合条件が維持される', () => {
    render(<App />);

    openSettings();
    fireEvent.click(screen.getByRole('button', { name: /河川突破/ }));
    fireEvent.click(screen.getByRole('button', { name: 'このマップで確定' }));

    fireEvent.change(screen.getByLabelText('人間が担当する陣営'), { target: { value: 'P2' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '索敵あり' }));
    fireEvent.change(screen.getByLabelText('AIの強さ'), { target: { value: 'easy' } });

    fireEvent.click(screen.getByRole('button', { name: 'この設定で開始' }));
    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム終了' }));
    fireEvent.click(screen.getByRole('button', { name: '保存して終了' }));

    fireEvent.click(screen.getByRole('button', { name: 'つづきから' }));
    fireEvent.click(screen.getByRole('button', { name: 'このスロットで開始' }));

    expect(screen.getByRole('button', { name: 'タイル 13,9' })).toBeInTheDocument();
    expect(screen.getByText('手番: P2')).toBeInTheDocument();
    expect(screen.queryByText('p1_inf')).not.toBeInTheDocument();
  });
});


