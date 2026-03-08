import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { renderBattleScreen } from './helpers/renderBattleScreen';

describe('BattleScreen UIテスト: コマンド操作(輸送)', () => {
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

  it('移動済みでも未行動の輸送ユニットは搭載と降車を実行できる', () => {
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
          moved: true,
          acted: false,
          loadedThisTurn: false,
          unloadedThisTurn: false,
          movePointsRemaining: 0,
        };
        state.units.p2_tank.position = { x: 5, y: 5 };
        delete state.units.p1_inf;
        state.units.p1_recon = {
          ...state.units.p2_inf,
          id: 'p1_recon',
          owner: 'P1',
          type: 'RECON',
          position: { x: 2, y: 1 },
          moved: false,
          acted: false,
          lastMovePath: [],
        };
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 3,2' }));

    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '搭載実行' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '降車実行' })).toBeEnabled();
    expect(screen.getByText('搭載回数: 未使用 / 降車回数: 未使用')).toBeInTheDocument();
  });

  it('そのターンに使用済みの搭載と降車は不活性になる', () => {
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
          loadedThisTurn: true,
          unloadedThisTurn: true,
        };
        state.units.p2_tank.position = { x: 5, y: 5 };
        delete state.units.p1_inf;
        state.units.p1_recon = {
          ...state.units.p2_inf,
          id: 'p1_recon',
          owner: 'P1',
          type: 'RECON',
          position: { x: 2, y: 1 },
          moved: false,
          acted: false,
          lastMovePath: [],
        };
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 3,2' }));

    expect(screen.getByRole('button', { name: '搭載実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '降車実行' })).toBeDisabled();
    expect(screen.getByText('搭載回数: 使用済み / 降車回数: 使用済み')).toBeInTheDocument();
  });
});
