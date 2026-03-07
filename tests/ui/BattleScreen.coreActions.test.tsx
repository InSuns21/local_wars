import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BattleScreen } from '@/screens/BattleScreen';
import { createGameStore } from '@store/gameStore';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('BattleScreen UIテスト: 基本操作', () => {
  it('初期表示でターン情報が表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getByRole('heading', { name: 'LOCAL WARS' })).toBeInTheDocument();
    expect(screen.getByText('ターン: 1')).toBeInTheDocument();
    expect(screen.getByText('手番: P1')).toBeInTheDocument();
  });

  it('タイルクリックでユニット選択できる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('p1_tank')).toBeInTheDocument();
    expect(screen.getByText('種類')).toBeInTheDocument();
    expect(within(screen.getByLabelText('ユニット情報')).getByText('戦車')).toBeInTheDocument();
  });


  it('同じユニットを再クリックすると選択解除される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const unitTile = screen.getByRole('button', { name: 'タイル 1,2' });
    fireEvent.click(unitTile);
    expect(screen.getByText('p1_tank')).toBeInTheDocument();

    fireEvent.click(unitTile);
    expect(within(screen.getByLabelText('ユニット情報')).getByText('ユニット未選択')).toBeInTheDocument();
  });
  it('移動可能マスのみクリック可能になる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'タイル 4,4' })).toBeDisabled();
  });

  it('空タイルクリックで移動先指定と経路プレビューが出る', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByText('選択移動先: 2,2')).toBeInTheDocument();
    expect(screen.getByText('経路プレビュー: 2,2')).toBeInTheDocument();
  });

  it('移動実行ボタンで実コマンドが実行される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: '移動実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();
    expect(screen.getByText('2,2')).toBeInTheDocument();
  });

  it('移動先選択後に攻撃実行すると移動してから攻撃までまとめて実行される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.change(screen.getByLabelText('攻撃対象'), { target: { value: 'p2_tank' } });
    fireEvent.click(screen.getByRole('button', { name: '攻撃実行' }));

    expect(screen.getByText('最終コマンド: 成功: 移動後に攻撃しました。')).toBeInTheDocument();
    expect(screen.getByText('2,2')).toBeInTheDocument();
  });

  it('攻撃実行ボタンで実コマンドが実行される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: '移動実行' }));

    fireEvent.change(screen.getByLabelText('攻撃対象'), { target: { value: 'p2_tank' } });
    fireEvent.click(screen.getByRole('button', { name: '攻撃実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();
  });

  it('移動先選択後に占領実行すると移動してから占領までまとめて実行される', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 1, y: 3 };
    state.map.tiles['2,3'] = { coord: { x: 2, y: 3 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,3' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,3' }));
    fireEvent.click(screen.getByRole('button', { name: '占領実行' }));

    expect(screen.getByText('最終コマンド: 成功: 移動後に占領しました。')).toBeInTheDocument();
    expect(store.getState().gameState.units.p1_inf.position).toEqual({ x: 2, y: 3 });
  });

  it('FoW遭遇戦で移動が中断した場合は占領実行がキャンセルされる', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.units.p1_inf.position = { x: 1, y: 2 };
    state.units.p2_inf.position = { x: 3, y: 2 };
    state.map.tiles['3,2'] = { coord: { x: 3, y: 2 }, terrainType: 'FOREST' };
    state.map.tiles['4,2'] = { coord: { x: 4, y: 2 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 4,2' }));
    fireEvent.click(screen.getByRole('button', { name: '占領実行' }));

    const nextState = store.getState().gameState;
    expect(nextState.map.tiles['4,2'].owner).toBe('P2');
    expect(nextState.actionLog.some((entry) => entry.action === 'CAPTURE')).toBe(false);
  });

  it('占領実行ボタンで実コマンドが実行される', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 2, y: 3 };
    state.map.tiles['2,3'] = { coord: { x: 2, y: 3 }, terrainType: 'CITY', owner: 'P2', capturePoints: 20 };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,3' }));
    fireEvent.click(screen.getByRole('button', { name: '占領実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();
  });

  it('生産実行ボタンで工場からユニットを生産できる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    const beforeCount = Object.keys(store.getState().gameState.units).length;

    render(<BattleScreen useStore={store} />);

    fireEvent.change(screen.getByLabelText('生産拠点'), { target: { value: '0,1' } });
    fireEvent.change(screen.getByLabelText('ユニット'), { target: { value: 'INFANTRY' } });
    fireEvent.click(screen.getByRole('button', { name: '生産実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();

    const nextState = store.getState().gameState;
    const afterCount = Object.keys(nextState.units).length;
    expect(afterCount).toBe(beforeCount + 1);
    expect(Object.values(nextState.units).some((u) => u.id.startsWith('P1_INFANTRY_'))).toBe(true);
  });

  it('空港選択時は航空ユニットを生産候補に表示する', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.change(screen.getByLabelText('生産拠点'), { target: { value: '0,2' } });

    expect(screen.getByRole('option', { name: '戦闘機 (16000)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '攻撃機 (14000)' })).toBeInTheDocument();
  });

  it('施設爆撃ボタンで都市を機能停止にできる', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 4, y: 4 };
    state.units.p1_tank = {
      ...state.units.p1_tank,
      type: 'BOMBER',
      position: { x: 1, y: 1 },
      ammo: 6,
      moved: false,
      acted: false,
    };
    state.map.tiles['2,1'] = {
      coord: { x: 2, y: 1 },
      terrainType: 'CITY',
      owner: 'P2',
      capturePoints: 10,
      structureHp: 1,
      operational: true,
    };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,1' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,1' }));
    fireEvent.click(screen.getByRole('button', { name: '施設爆撃' }));

    expect(store.getState().gameState.map.tiles['2,1'].operational).toBe(false);
    expect(store.getState().gameState.units.p1_tank.acted).toBe(true);
  });

  it('攻撃射程マスに赤表示用属性が付く', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    const inRangeTile = screen.getByRole('button', { name: 'タイル 2,2' });
    const outRangeTile = screen.getByRole('button', { name: 'タイル 4,4' });

    expect(inRangeTile).toHaveAttribute('data-attack-range', 'true');
    expect(outRangeTile).toHaveAttribute('data-attack-range', 'false');
  });

  it('移動先を指定すると移動後の攻撃可能マス表示へ更新される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    expect(screen.getByRole('button', { name: 'タイル 3,2' })).toHaveAttribute('data-attack-range', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    expect(screen.getByRole('button', { name: 'タイル 3,2' })).toHaveAttribute('data-attack-range', 'true');
  });

  it('移動後に隣接した自走砲への攻撃予測では反撃なしと表示される', () => {
    const state = createInitialGameState();
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'ARTILLERY',
      position: { x: 4, y: 2 },
    };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 3,2' }));
    fireEvent.change(screen.getByLabelText('攻撃対象'), { target: { value: 'p2_tank' } });

    expect(screen.getByText(/被ダメージ 0\(反撃なし\)/)).toBeInTheDocument();
  });
});




