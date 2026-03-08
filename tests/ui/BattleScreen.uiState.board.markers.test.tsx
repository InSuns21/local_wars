import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { renderBattleScreen } from './helpers/renderBattleScreen';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('BattleScreen UIテスト: 盤面表示(マーカー/所有者)', () => {
  it('工場の所有者ごとに識別属性が付与される', () => {
    renderBattleScreen();

    expect(screen.getByRole('button', { name: 'タイル 0,1' })).toHaveAttribute('data-property-owner', 'P1');
    expect(screen.getByRole('button', { name: 'タイル 4,3' })).toHaveAttribute('data-property-owner', 'P2');
    expect(screen.getByRole('button', { name: 'タイル 2,0' })).toHaveAttribute('data-property-owner', 'NEUTRAL');
  });

  it('HQと都市も所有者識別属性が付与される', () => {
    renderBattleScreen();

    expect(screen.getByRole('button', { name: 'タイル 0,0' })).toHaveAttribute('data-property-owner', 'P1');
    expect(screen.getByRole('button', { name: 'タイル 4,4' })).toHaveAttribute('data-property-owner', 'P2');
    expect(screen.getByRole('button', { name: 'タイル 1,1' })).toHaveAttribute('data-property-owner', 'P1');
    expect(screen.getByRole('button', { name: 'タイル 3,3' })).toHaveAttribute('data-property-owner', 'P2');
  });

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
    const scenarioState = createInitialGameState({ mapId: 'interceptor-belt' });
    scenarioState.enableSuicideDrones = true;

    renderBattleScreen({
      mutateState: (state) => Object.assign(state, scenarioState),
    });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 5,5' }));

    expect(screen.getByRole('button', { name: 'タイル 5,4' })).toHaveAttribute('data-intercept-range', 'true');
    expect(screen.getByRole('button', { name: 'タイル 6,5' })).toHaveAttribute('data-intercept-range', 'true');
    expect(screen.getByRole('button', { name: 'タイル 5,5' })).toHaveAttribute('data-intercept-range', 'false');
  });
});
