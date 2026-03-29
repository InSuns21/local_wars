import '@testing-library/jest-dom/vitest';
import { fireEvent, screen } from '@testing-library/react';

vi.mock('@components/board/GameCanvas', async () => await import('./helpers/mockGameCanvas'));
vi.mock('@components/board/BoardLegend', async () => await import('./helpers/mockBoardLegend'));

import { createBattleState, renderBattleScreen } from './helpers/renderBattleScreen';

describe('BattleScreen UIテスト: コマンド操作', () => {
  it('敵ユニット選択時は行動範囲を表示せず、操作ボタンが無効になり選択移動先がリセットされる', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    expect(screen.getByText('選択移動先: 2,2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 3,2' }));

    expect(screen.getByText('選択移動先: 未選択')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '占領実行' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-attack-range', 'false');
  });

  it('選択ユニット切替時に最終コマンド表示が未実行へ初期化される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: '移動実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,1' }));
    expect(screen.getByText('最終コマンド: 未実行')).toBeInTheDocument();
  });

  it('移動済みユニットは移動実行が不活性で、余裕があれば攻撃は可能', () => {
    const state = createBattleState();
    state.units.p1_tank.position = { x: 2, y: 2 };
    state.units.p1_tank.moved = true;
    state.units.p1_tank.acted = false;
    state.units.p1_tank.movePointsRemaining = 1;
    state.units.p2_tank.position = { x: 3, y: 2 };

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeEnabled();
  });

  it('戦車選択時は輸送・補給・施設爆撃・占領を表示しない', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.queryByRole('button', { name: '搭載実行' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '降車実行' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '補給実行' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '施設爆撃' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '占領実行' })).not.toBeInTheDocument();
  });

  it('歩兵選択時は攻撃実行と占領実行だけが表示される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,1' }));

    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '占領実行' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '搭載実行' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '降車実行' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '補給実行' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '施設爆撃' })).not.toBeInTheDocument();
  });

  it('移動先を変えても直前の経路を継ぎ足せるならその経路を優先する', () => {
    const state = createBattleState();
    state.units.p1_tank.type = 'INFANTRY';
    state.units.p1_tank.fuel = 99;
    state.units.p1_tank.ammo = 9;
    state.units.p1_tank.position = { x: 0, y: 0 };
    state.map.tiles['1,1'] = { coord: { x: 1, y: 1 }, terrainType: 'PLAIN' };
    state.map.tiles['1,0'] = { coord: { x: 1, y: 0 }, terrainType: 'SEA' };
    delete state.units.p1_inf;
    delete state.units.p2_inf;
    delete state.units.p2_tank;

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 0,0' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,1' }));
    expect(screen.getByText(/経路プレビュー: .*1,1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,1' }));

    expect(screen.getByText(/経路プレビュー: 0,1 -> 1,1 -> 2,1/)).toBeInTheDocument();
  });

  it('攻撃前に予測ダメージが表示される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByText(/攻撃予測:/)).toBeInTheDocument();
    expect(screen.getByText(/与ダメージ/)).toBeInTheDocument();
  });
});


