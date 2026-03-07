import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { BattleScreen } from '@/screens/BattleScreen';
import { createGameStore } from '@store/gameStore';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('BattleScreen UIテスト: コマンド操作', () => {
  it('敵ユニット選択時は行動範囲を表示せず、操作ボタンが無効になり選択移動先がリセットされる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    expect(screen.getByText('選択移動先: 2,2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 3,2' }));

    expect(screen.getByText('選択移動先: 未選択')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '占領実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveAttribute('data-attack-range', 'false');
  });

  it('資金不足時は生産実行ボタンが不活性になる', () => {
    const state = createInitialGameState();
    state.players.P1.funds = 0;

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.change(screen.getByLabelText('生産拠点'), { target: { value: '0,1' } });
    fireEvent.change(screen.getByLabelText('ユニット'), { target: { value: 'INFANTRY' } });

    expect(screen.getByRole('button', { name: '生産実行' })).toBeDisabled();
  });

  it('ターン終了ボタンでAI手番まで自動進行する', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));

    expect(screen.getByText('手番: P1')).toBeInTheDocument();
    expect(screen.getByText('ターン: 2')).toBeInTheDocument();
  });

  it('取り消しボタンで直前の状態に戻る', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));
    expect(screen.getByText('ターン: 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '行動を取り消す' }));
    expect(screen.getByText('手番: P1')).toBeInTheDocument();
    expect(screen.getByText('ターン: 1')).toBeInTheDocument();
  });

  it('選択ユニット切替時に最終コマンド表示が未実行へ初期化される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    fireEvent.click(screen.getByRole('button', { name: '移動実行' }));

    expect(screen.getByText('最終コマンド: 成功')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,1' }));
    expect(screen.getByText('最終コマンド: 未実行')).toBeInTheDocument();
  });

  it('生産UIでユニット価格を表示し、資金不足時は生産実行が不活性になる', () => {
    const state = createInitialGameState();
    state.players.P1.funds = 500;
    const store = createGameStore(state, { rng: () => 0.5 });

    render(<BattleScreen useStore={store} />);

    expect(screen.getByRole('option', { name: '歩兵 (1000)' })).toBeInTheDocument();
    expect(screen.getByText('必要資金: 1000')).toBeInTheDocument();
    expect(screen.getByText('現在手番の資金: 500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生産実行' })).toBeDisabled();
  });

  it('生産直後ユニットは移動・攻撃・占領が不活性になる', () => {
    const state = createInitialGameState();
    state.units.p1_new = {
      id: 'p1_new',
      owner: 'P1',
      type: 'INFANTRY',
      hp: 10,
      fuel: 99,
      ammo: 9,
      position: { x: 2, y: 2 },
      moved: true,
      acted: true,
      lastMovePath: [],
    };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '占領実行' })).toBeDisabled();
  });

  it('移動済みユニットは移動実行が不活性で、余裕があれば攻撃は可能', () => {
    const state = createInitialGameState();
    state.units.p1_tank.position = { x: 2, y: 2 };
    state.units.p1_tank.moved = true;
    state.units.p1_tank.acted = false;
    state.units.p1_tank.movePointsRemaining = 1;
    state.units.p2_tank.position = { x: 3, y: 2 };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeEnabled();
  });

  it('占領不可ユニットでは占領実行が不活性になる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: '占領実行' })).toBeDisabled();
  });

  it('攻撃前に予測ダメージが表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByText(/攻撃予測:/)).toBeInTheDocument();
    expect(screen.getByText(/与ダメージ/)).toBeInTheDocument();
  });
  it('生産可能な工場がないときは工場セレクトを表示せずメッセージを表示する', () => {
    const state = createInitialGameState();
    state.units.p1_inf.position = { x: 0, y: 1 };
    state.units.p1_tank.position = { x: 0, y: 2 };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getByText('生産拠点: 選択可能な拠点なし')).toBeInTheDocument();
    expect(screen.queryByLabelText('生産拠点')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生産実行' })).toBeDisabled();
  });
});

