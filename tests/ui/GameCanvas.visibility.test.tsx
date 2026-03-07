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
