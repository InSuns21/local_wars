/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { GameCanvas } from '@/components/board/GameCanvas';

describe('GameCanvas naval move overlay', () => {
  it('海上ユニットの移動可能マスは sea トーンで描き分ける', () => {
    const gameState = createInitialGameState({ mapId: 'island-landing' });

    render(
      <GameCanvas
        gameState={gameState}
        selectedUnitId="p1_destroyer"
        selectedTile={null}
        previewPath={[]}
        moveRangeTiles={[{ x: 4, y: 0 }]}
        attackRangeTiles={[]}
        onSelectUnit={() => undefined}
        onSelectTile={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'タイル 4,0' })).toHaveAttribute('data-move-overlay-tone', 'sea');
    expect(screen.getByRole('button', { name: 'タイル 3,4' })).toHaveAttribute('data-move-overlay-tone', 'none');
  });
});
