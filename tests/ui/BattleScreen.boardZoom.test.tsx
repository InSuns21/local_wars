import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { BattleScreen } from '@/screens/BattleScreen';
import { createGameStore } from '@store/gameStore';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('BattleScreen UIテスト: 盤面ズーム', () => {
  it('ズーム変更で盤面タイルサイズが切り替わる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const tile = screen.getByRole('button', { name: 'タイル 1,2' });
    expect(tile).toHaveStyle({ width: '112px', height: '96px' });

    fireEvent.change(screen.getByLabelText('盤面ズーム'), { target: { value: '0.7' } });

    expect(screen.getByTestId('game-board-grid')).toHaveAttribute('data-board-zoom', '0.70');
    expect(screen.getByRole('button', { name: 'タイル 1,2' })).toHaveStyle({ width: '78px', height: '67px' });
  });

  it('ズーム変更後も盤面マーカー属性が維持される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.change(screen.getByLabelText('盤面ズーム'), { target: { value: '0.85' } });

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-move-reachable', 'true');
    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-attack-range', 'true');
  });

  it('ズーム変更後もタイルクリックで正しいユニット選択ができる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.change(screen.getByLabelText('盤面ズーム'), { target: { value: '0.7' } });
    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByText('p1_tank')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toBeEnabled();
  });
});
