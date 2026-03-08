import '@testing-library/jest-dom';
import { fireEvent, screen, within } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { createBattleState, renderBattleScreen } from './helpers/renderBattleScreen';

describe('BattleScreen UIテスト: 盤面表示', () => {
  it('索敵ON時は視界外の敵ユニットが盤面に表示されない', () => {
    const state = createBattleState();
    state.fogOfWar = true;
    state.units.p2_inf.position = { x: 4, y: 4 };
    state.units.p2_tank.position = { x: 4, y: 3 };

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    expect(screen.queryByText('p2_inf')).not.toBeInTheDocument();
    expect(screen.queryByText('p2_tank')).not.toBeInTheDocument();
  });

  it('盤面凡例に主要な視覚ルールが表示される', () => {
    renderBattleScreen();

    const legend = screen.getByLabelText('盤面凡例');
    expect(within(legend).getByText('選択中ユニット')).toBeInTheDocument();
    expect(within(legend).getByText('選択移動先')).toBeInTheDocument();
    expect(within(legend).getByText('経路プレビュー')).toBeInTheDocument();
    expect(within(legend).getByText('移動可能')).toBeInTheDocument();
    expect(within(legend).getByText('攻撃範囲')).toBeInTheDocument();
    expect(within(legend).getByText('迎撃半径')).toBeInTheDocument();
    expect(within(legend).getByText('攻撃対象')).toBeInTheDocument();
    expect(within(legend).getByText('味方ユニット')).toBeInTheDocument();
    expect(within(legend).getByText('敵ユニット')).toBeInTheDocument();
    expect(within(legend).getByText('自軍拠点')).toBeInTheDocument();
    expect(within(legend).getByText('敵軍拠点')).toBeInTheDocument();
  });

  it('FoW時は不可視マスが判別でき、自軍拠点は常に可視になる', () => {
    const state = createBattleState();
    state.fogOfWar = true;
    state.units.p1_inf.position = { x: 0, y: 0 };
    state.units.p1_tank.position = { x: 0, y: 0 };

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    expect(screen.getByRole('button', { name: 'タイル 4,4' })).toHaveAttribute('data-fog-hidden', 'true');
    expect(screen.getByRole('button', { name: 'タイル 0,1' })).toHaveAttribute('data-fog-hidden', 'false');
  });

  it('FoW時は非隣接の森タイルが不可視表示になる', () => {
    const state = createBattleState();
    state.fogOfWar = true;
    state.units.p1_inf.position = { x: 0, y: 0 };
    state.units.p1_tank.position = { x: 0, y: 1 };
    state.map.tiles['3,1'] = { ...state.map.tiles['3,1'], terrainType: 'FOREST' };
    state.map.tiles['4,2'] = { ...state.map.tiles['4,2'], terrainType: 'FOREST' };

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    expect(screen.getByRole('button', { name: 'タイル 3,1' })).toHaveAttribute('data-fog-hidden', 'true');
    expect(screen.getByRole('button', { name: 'タイル 4,2' })).toHaveAttribute('data-fog-hidden', 'true');
    expect(screen.getByRole('button', { name: 'タイル 0,1' })).toHaveAttribute('data-fog-hidden', 'false');
  });

  it('同一タイルでユニットHPと拠点耐久が左右に分離表示される', () => {
    const state = createBattleState();
    state.units.p1_tank.position = { x: 0, y: 1 };
    state.units.p1_tank.hp = 7;

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    const tile = screen.getByRole('button', { name: 'タイル 0,1' });
    const hpLabel = within(tile).getByText('HP 7');
    const durabilityLabel = within(tile).getByText('耐久 20');

    expect(tile).toHaveStyle({ width: '112px', height: '96px' });
    expect(hpLabel).toHaveStyle({ right: '4px' });
    expect(durabilityLabel).toHaveStyle({ left: '4px' });
  });

  it('盤面上にユニットHPと拠点耐久を表示し、不可視タイルの拠点耐久は非表示になる', () => {
    const state = createBattleState();
    state.fogOfWar = true;
    state.units.p1_inf.position = { x: 0, y: 0 };
    state.units.p1_tank.position = { x: 1, y: 2 };
    state.units.p1_tank.hp = 7;

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    const unitTile = screen.getByRole('button', { name: 'タイル 1,2' });
    const visiblePropertyTile = screen.getByRole('button', { name: 'タイル 0,1' });
    const hiddenPropertyTile = screen.getByRole('button', { name: 'タイル 4,4' });

    expect(unitTile).toHaveAttribute('data-unit-hp', 'HP 7');
    expect(visiblePropertyTile).toHaveAttribute('data-property-durability', '耐久 20');
    expect(hiddenPropertyTile).toHaveAttribute('data-property-durability', 'NONE');
  });

  it('ユニットSVGアイコンが盤面に表示される', () => {
    renderBattleScreen();

    expect(screen.getAllByTestId('unit-icon-INFANTRY').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('unit-icon-TANK').length).toBeGreaterThan(0);
  });

  it('燃料補給ONかつ燃料1のとき、移動可能マスは燃料分に制限される', () => {
    const state = createBattleState();
    state.enableFuelSupply = true;
    state.units.p1_tank.fuel = 1;

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'タイル 4,2' })).toBeDisabled();
  });
});
