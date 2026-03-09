import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { GameCanvas } from '@/components/board/GameCanvas';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('GameCanvas UIテスト: ステルス可視', () => {
  it('敵手番でも自軍視点で非発見のステルス機は表示しない', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.humanPlayerSide = 'P1';
    state.currentPlayerId = 'P2';
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'STEALTH_BOMBER',
      position: { x: 4, y: 4 },
    };
    state.units.p1_inf.position = { x: 0, y: 0 };
    state.units.p1_tank.position = { x: 1, y: 0 };

    render(
      <GameCanvas
        gameState={state}
        selectedUnitId={null}
        selectedTile={null}
        previewPath={[]}
        moveRangeTiles={[]}
        attackRangeTiles={[]}
        supplyRangeTiles={[]}
        highlightedTargetUnitId={null}
        onSelectUnit={() => {}}
        onSelectTile={() => {}}
      />,
    );

    expect(screen.queryByTestId('unit-icon-STEALTH_BOMBER')).not.toBeInTheDocument();
  });

  it('索敵OFFでも未発見のステルス機は表示しない', () => {
    const state = createInitialGameState();
    state.fogOfWar = false;
    state.humanPlayerSide = 'P1';
    state.currentPlayerId = 'P1';
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'STEALTH_BOMBER',
      position: { x: 4, y: 4 },
    };
    state.units.p1_inf.position = { x: 0, y: 0 };
    state.units.p1_tank.position = { x: 1, y: 0 };

    render(
      <GameCanvas
        gameState={state}
        selectedUnitId={null}
        selectedTile={null}
        previewPath={[]}
        moveRangeTiles={[]}
        attackRangeTiles={[]}
        supplyRangeTiles={[]}
        highlightedTargetUnitId={null}
        onSelectUnit={() => {}}
        onSelectTile={() => {}}
      />,
    );

    expect(screen.queryByTestId('unit-icon-STEALTH_BOMBER')).not.toBeInTheDocument();
  });

  it('移動可能・攻撃範囲・迎撃半径が重なるタイルではオーバーレイを多重表示する', () => {
    const state = createInitialGameState({ mapId: 'interceptor-belt' });
    state.enableSuicideDrones = true;

    render(
      <GameCanvas
        gameState={state}
        selectedUnitId={null}
        selectedTile={null}
        previewPath={[]}
        moveRangeTiles={[{ x: 5, y: 4 }]}
        attackRangeTiles={[{ x: 5, y: 4 }]}
        interceptRangeTiles={[{ x: 5, y: 4 }]}
        supplyRangeTiles={[]}
        highlightedTargetUnitId={null}
        onSelectUnit={() => {}}
        onSelectTile={() => {}}
      />,
    );

    const tile = screen.getByRole('button', { name: 'タイル 5,4' });
    expect(tile).toHaveAttribute('data-overlay-kinds', 'move,attack,intercept');
    expect(tile).toHaveAttribute('data-overlay-layer-count', '3');
    expect(tile).toHaveAttribute('data-outline-layer-count', '3');
  });

  it('敵手番でも自軍施設直上のステルス機は表示する', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.humanPlayerSide = 'P1';
    state.currentPlayerId = 'P2';
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'STEALTH_BOMBER',
      position: { x: 1, y: 1 },
    };
    state.units.p1_inf.position = { x: 4, y: 4 };
    state.units.p1_tank.position = { x: 4, y: 3 };

    render(
      <GameCanvas
        gameState={state}
        selectedUnitId={null}
        selectedTile={null}
        previewPath={[]}
        moveRangeTiles={[]}
        attackRangeTiles={[]}
        supplyRangeTiles={[]}
        highlightedTargetUnitId={null}
        onSelectUnit={() => {}}
        onSelectTile={() => {}}
      />,
    );

    expect(screen.getByTestId('unit-icon-STEALTH_BOMBER')).toBeInTheDocument();
  });
});
