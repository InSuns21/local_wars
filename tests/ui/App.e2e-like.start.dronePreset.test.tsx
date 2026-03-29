import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import './helpers/mockAppFlowScreens';

import { App } from '@/app/App';

const openSettings = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'はじめから' }));
};

describe('App E2E相当導線テスト: ドローン戦初期値', () => {
  beforeEach(() => {
    localStorage.clear();
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

});


