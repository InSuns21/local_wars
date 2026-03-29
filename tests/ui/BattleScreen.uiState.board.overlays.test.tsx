import '@testing-library/jest-dom/vitest';
import { fireEvent, screen } from '@testing-library/react';

vi.mock('@components/board/GameCanvas', async () => await import('./helpers/mockGameCanvas'));
vi.mock('@components/board/BoardLegend', async () => await import('./helpers/mockBoardLegend'));

import { renderBattleScreen } from './helpers/renderBattleScreen';

describe('BattleScreen UIテスト: 盤面表示(マーカー)', () => {
  it('経路プレビューは移動可能マスと別属性で表示される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-preview-path', 'true');
    expect(screen.getByRole('button', { name: 'タイル 2,1' })).toHaveAttribute('data-preview-path', 'false');
    expect(screen.getByRole('button', { name: 'タイル 2,1' })).toHaveAttribute('data-move-reachable', 'true');
  });

  it('攻撃対象を選ぶと対象の敵ユニットだけ強調表示される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.change(screen.getByLabelText('攻撃対象'), { target: { value: 'p2_tank' } });

    expect(screen.getByRole('button', { name: 'タイル 3,2' })).toHaveAttribute('data-attack-target', 'true');
    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-attack-target', 'false');
  });

  it('移動可能マスは破線枠で表示される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveStyle({ borderStyle: 'dashed' });
  });

  it('移動実行後は移動可能範囲表示が更新され、移動可能マスが残らない', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: '移動実行' }));

    expect(screen.getByRole('button', { name: 'タイル 2,1' })).toHaveAttribute('data-move-reachable', 'false');
    expect(screen.getByRole('button', { name: 'タイル 2,3' })).toHaveAttribute('data-move-reachable', 'false');
  });

  it('対ドローン防空車を選択すると迎撃半径が盤面表示される', () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.enableSuicideDrones = true;
        state.units.p1_counter_drone = {
          id: 'p1_counter_drone',
          owner: 'P1',
          type: 'COUNTER_DRONE_AA',
          hp: 10,
          fuel: 60,
          ammo: 6,
          position: { x: 2, y: 2 },
          moved: false,
          acted: false,
          lastMovePath: [],
        };
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,1' })).toHaveAttribute('data-intercept-range', 'true');
    expect(screen.getByRole('button', { name: 'タイル 3,2' })).toHaveAttribute('data-intercept-range', 'true');
    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-intercept-range', 'false');
  });
});


