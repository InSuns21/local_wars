import '@testing-library/jest-dom';
import { fireEvent, screen, within } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { createBattleState, renderBattleScreen } from './helpers/renderBattleScreen';

describe('BattleScreen UIテスト: 基本操作', () => {
  it('初期表示でターン情報が表示される', () => {
    renderBattleScreen();

    expect(screen.getByRole('heading', { name: 'LOCAL WARS' })).toBeInTheDocument();
    expect(screen.getByText('ターン: 1')).toBeInTheDocument();
    expect(screen.getByText('手番: P1')).toBeInTheDocument();
  });

  it('タイルクリックでユニット選択できる', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('p1_tank')).toBeInTheDocument();
    expect(screen.getByText('種類')).toBeInTheDocument();
    expect(within(screen.getByLabelText('ユニット情報')).getByText('戦車')).toBeInTheDocument();
  });

  it('同じユニットを再クリックすると選択解除される', () => {
    renderBattleScreen();

    const unitTile = screen.getByRole('button', { name: 'タイル 1,2' });
    fireEvent.click(unitTile);
    expect(screen.getByText('p1_tank')).toBeInTheDocument();

    fireEvent.click(unitTile);
    expect(within(screen.getByLabelText('ユニット情報')).getByText('ユニット未選択')).toBeInTheDocument();
  });

  it('移動可能マスのみクリック可能になる', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'タイル 4,4' })).toBeDisabled();
  });

  it('空タイルクリックで移動先指定と経路プレビューが出る', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByText('選択移動先: 2,2')).toBeInTheDocument();
    expect(screen.getByText('経路プレビュー: 2,2')).toBeInTheDocument();
  });

  it('移動先選択後に攻撃実行すると移動してから攻撃までまとめて実行される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.change(screen.getByLabelText('攻撃対象'), { target: { value: 'p2_tank' } });
    fireEvent.click(screen.getByRole('button', { name: '攻撃実行' }));

    expect(screen.getByText('最終コマンド: 成功: 移動後に攻撃しました。')).toBeInTheDocument();
    expect(screen.getByText('2,2')).toBeInTheDocument();
  });

  it('移動先選択後に占領実行すると移動してから占領までまとめて実行される', () => {
    const state = createBattleState();
    state.units.p1_inf.position = { x: 1, y: 3 };
    state.map.tiles['2,3'] = { coord: { x: 2, y: 3 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    const { store } = renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,3' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,3' }));
    fireEvent.click(screen.getByRole('button', { name: '占領実行' }));

    expect(screen.getByText('最終コマンド: 成功: 移動後に占領しました。')).toBeInTheDocument();
    expect(store.getState().gameState.units.p1_inf.position).toEqual({ x: 2, y: 3 });
  });

  it('FoW遭遇戦で移動が中断した場合は占領実行がキャンセルされる', () => {
    const state = createBattleState();
    state.fogOfWar = true;
    state.units.p1_inf.position = { x: 1, y: 2 };
    state.units.p1_tank.position = { x: 1, y: 3 };
    state.units.p2_inf.position = { x: 3, y: 2 };
    state.map.tiles['3,2'] = { coord: { x: 3, y: 2 }, terrainType: 'FOREST' };
    state.map.tiles['4,2'] = { coord: { x: 4, y: 2 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    const { store } = renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 4,2' }));
    fireEvent.click(screen.getByRole('button', { name: '占領実行' }));

    const nextState = store.getState().gameState;
    expect(nextState.map.tiles['4,2'].owner).toBe('P2');
    expect(nextState.actionLog.some((entry) => entry.action === 'CAPTURE')).toBe(false);
  });

  it('補給車で補給実行すると隣接味方の燃料と弾薬が全回復する', () => {
    const state = createBattleState();
    state.maxSupplyCharges = 4;
    state.units.p1_truck = {
      id: 'p1_truck',
      owner: 'P1',
      type: 'SUPPLY_TRUCK',
      hp: 10,
      fuel: 30,
      ammo: 0,
      supplyCharges: 2,
      position: { x: 2, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
    };
    state.units.p1_tank.position = { x: 2, y: 1 };
    state.units.p1_tank.fuel = 8;
    state.units.p1_tank.ammo = 1;

    const { store } = renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: '補給実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();
    expect(screen.getByText('1/4')).toBeInTheDocument();
    expect(store.getState().gameState.units.p1_tank.fuel).toBe(70);
    expect(store.getState().gameState.units.p1_tank.ammo).toBe(6);
  });
});
