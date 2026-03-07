import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { createBattleState, renderBattleScreen } from './helpers/renderBattleScreen';

describe('BattleScreen UIテスト: コマンド操作', () => {
  it('敵ユニット選択時は行動範囲を表示せず、操作ボタンが無効になり選択移動先がリセットされる', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    expect(screen.getByText('選択移動先: 2,2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 3,2' }));

    expect(screen.getByText('選択移動先: 未選択')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '占領実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-attack-range', 'false');
  });

  it('選択ユニット切替時に最終コマンド表示が未実行へ初期化される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: '移動実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,1' }));
    expect(screen.getByText('最終コマンド: 未実行')).toBeInTheDocument();
  });

  it('移動済みユニットは移動実行が不活性で、余裕があれば攻撃は可能', () => {
    const state = createBattleState();
    state.units.p1_tank.position = { x: 2, y: 2 };
    state.units.p1_tank.moved = true;
    state.units.p1_tank.acted = false;
    state.units.p1_tank.movePointsRemaining = 1;
    state.units.p2_tank.position = { x: 3, y: 2 };

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeEnabled();
  });

  it('占領不可ユニットでは占領実行が不活性になる', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: '占領実行' })).toBeDisabled();
  });

  it('攻撃前に予測ダメージが表示される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByText(/攻撃予測:/)).toBeInTheDocument();
    expect(screen.getByText(/与ダメージ/)).toBeInTheDocument();
  });

  it('輸送ユニット選択時は搭載と降車の導線が表示される', () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.units.p1_tank = {
          ...state.units.p1_tank,
          type: 'TRANSPORT_TRUCK',
          cargo: [],
          ammo: 0,
          position: { x: 2, y: 1 },
          moved: false,
          acted: false,
        };
        state.units.p1_inf.position = { x: 1, y: 1 };
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,1' }));

    expect(screen.getByLabelText('搭載対象')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '搭載実行' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '降車実行' })).toBeDisabled();
  });
});
