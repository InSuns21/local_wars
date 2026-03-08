import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { renderBattleScreen } from './helpers/renderBattleScreen';

describe('BattleScreen UIテスト: コマンド操作(輸送フロー)', () => {
  it('輸送ユニットの搭載後も最終コマンド表示が更新される', () => {
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
    fireEvent.click(screen.getByRole('button', { name: '搭載実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();
  });

  it('輸送ユニットの降車候補があるときだけ降車実行を有効化する', () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.units.p1_tank = {
          ...state.units.p1_tank,
          type: 'TRANSPORT_TRUCK',
          cargo: [
            {
              ...state.units.p1_inf,
              position: { x: 2, y: 2 },
              moved: true,
              acted: true,
              lastMovePath: [],
            },
          ],
          ammo: 0,
          position: { x: 2, y: 2 },
          moved: false,
          acted: false,
        };
        delete state.units.p1_inf;
        state.units.p2_tank.position = { x: 5, y: 5 };
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 3,2' }));

    expect(screen.getByRole('button', { name: '降車実行' })).toBeEnabled();
  });
});
