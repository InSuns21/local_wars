import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { renderBattleScreen } from './helpers/renderBattleScreen';

describe('BattleScreen UIテスト: 盤面表示(所有者)', () => {
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
});
