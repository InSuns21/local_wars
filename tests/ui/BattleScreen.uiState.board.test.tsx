import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BattleScreen } from '@/screens/BattleScreen';
import { createGameStore } from '@store/gameStore';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('BattleScreen UIテスト: 盤面表示', () => {
  it('索敵ON時は視界外の敵ユニットが盤面に表示されない', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.units.p2_inf.position = { x: 4, y: 4 };
    state.units.p2_tank.position = { x: 4, y: 3 };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.queryByText('p2_inf')).not.toBeInTheDocument();
    expect(screen.queryByText('p2_tank')).not.toBeInTheDocument();
  });

  it('盤面凡例に主要な視覚ルールが表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const legend = screen.getByLabelText('盤面凡例');
    expect(within(legend).getByText('選択中ユニット')).toBeInTheDocument();
    expect(within(legend).getByText('選択移動先')).toBeInTheDocument();
    expect(within(legend).getByText('経路プレビュー')).toBeInTheDocument();
    expect(within(legend).getByText('移動可能')).toBeInTheDocument();
    expect(within(legend).getByText('攻撃範囲')).toBeInTheDocument();
    expect(within(legend).getByText('攻撃対象')).toBeInTheDocument();
    expect(within(legend).getByText('味方ユニット')).toBeInTheDocument();
    expect(within(legend).getByText('敵ユニット')).toBeInTheDocument();
    expect(within(legend).getByText('自軍拠点')).toBeInTheDocument();
    expect(within(legend).getByText('敵軍拠点')).toBeInTheDocument();
  });

  it('FoW時は不可視マスが判別でき、自軍拠点は常に可視になる', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.units.p1_inf.position = { x: 0, y: 0 };
    state.units.p1_tank.position = { x: 0, y: 0 };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getByRole('button', { name: 'タイル 4,4' })).toHaveAttribute('data-fog-hidden', 'true');
    expect(screen.getByRole('button', { name: 'タイル 0,1' })).toHaveAttribute('data-fog-hidden', 'false');
  });

  it('同一タイルでユニットHPと拠点耐久が左右に分離表示される', () => {
    const state = createInitialGameState();
    state.units.p1_tank.position = { x: 0, y: 1 };
    state.units.p1_tank.hp = 7;

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const tile = screen.getByRole('button', { name: 'タイル 0,1' });
    const hpLabel = within(tile).getByText('HP 7');
    const durabilityLabel = within(tile).getByText('耐久 20');

    expect(tile).toHaveStyle({ width: '112px', height: '96px' });
    expect(hpLabel).toHaveStyle({ right: '4px' });
    expect(durabilityLabel).toHaveStyle({ left: '4px' });
  });

  it('盤面上にユニットHPと拠点耐久を表示し、不可視タイルの拠点耐久は非表示になる', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.units.p1_inf.position = { x: 0, y: 0 };
    state.units.p1_tank.position = { x: 1, y: 2 };
    state.units.p1_tank.hp = 7;

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const unitTile = screen.getByRole('button', { name: 'タイル 1,2' });
    const visiblePropertyTile = screen.getByRole('button', { name: 'タイル 0,1' });
    const hiddenPropertyTile = screen.getByRole('button', { name: 'タイル 4,4' });

    expect(unitTile).toHaveAttribute('data-unit-hp', 'HP 7');
    expect(visiblePropertyTile).toHaveAttribute('data-property-durability', '耐久 20');
    expect(hiddenPropertyTile).toHaveAttribute('data-property-durability', 'NONE');
  });

  it('ユニットSVGアイコンが盤面に表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getAllByTestId('unit-icon-INFANTRY').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('unit-icon-TANK').length).toBeGreaterThan(0);
  });

  it('燃料補給ONかつ燃料1のとき、移動可能マスは燃料分に制限される', () => {
    const state = createInitialGameState();
    state.enableFuelSupply = true;
    state.units.p1_tank.fuel = 1;

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'タイル 4,2' })).toBeDisabled();
  });

  it('工場の所有者ごとに識別属性が付与される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getByRole('button', { name: 'タイル 0,1' })).toHaveAttribute('data-property-owner', 'P1');
    expect(screen.getByRole('button', { name: 'タイル 4,3' })).toHaveAttribute('data-property-owner', 'P2');
    expect(screen.getByRole('button', { name: 'タイル 2,0' })).toHaveAttribute('data-property-owner', 'NEUTRAL');
  });

  it('HQと都市も所有者識別属性が付与される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getByRole('button', { name: 'タイル 0,0' })).toHaveAttribute('data-property-owner', 'P1');
    expect(screen.getByRole('button', { name: 'タイル 4,4' })).toHaveAttribute('data-property-owner', 'P2');
    expect(screen.getByRole('button', { name: 'タイル 1,1' })).toHaveAttribute('data-property-owner', 'P1');
    expect(screen.getByRole('button', { name: 'タイル 3,3' })).toHaveAttribute('data-property-owner', 'P2');
  });

  it('経路プレビューは移動可能マスと別属性で表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-preview-path', 'true');
    expect(screen.getByRole('button', { name: 'タイル 2,1' })).toHaveAttribute('data-preview-path', 'false');
    expect(screen.getByRole('button', { name: 'タイル 2,1' })).toHaveAttribute('data-move-reachable', 'true');
  });

  it('攻撃対象を選ぶと対象の敵ユニットだけ強調表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.change(screen.getByLabelText('攻撃対象'), { target: { value: 'p2_tank' } });

    expect(screen.getByRole('button', { name: 'タイル 3,2' })).toHaveAttribute('data-attack-target', 'true');
    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-attack-target', 'false');
  });

  it('移動可能マスは破線枠で表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveStyle({ borderStyle: 'dashed' });
  });

  it('移動実行後は移動可能範囲表示が更新され、移動可能マスが残らない', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: '移動実行' }));

    expect(screen.getByRole('button', { name: 'タイル 2,1' })).toHaveAttribute('data-move-reachable', 'false');
    expect(screen.getByRole('button', { name: 'タイル 2,3' })).toHaveAttribute('data-move-reachable', 'false');
  });
});
