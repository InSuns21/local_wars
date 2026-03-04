import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BattleScreen } from '@/screens/BattleScreen';
import { createGameStore } from '@store/gameStore';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('BattleScreen UIテスト: 状態表示と導線', () => {
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

    fireEvent.change(screen.getByLabelText('工場'), { target: { value: '0,1' } });
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

  it('勝敗確定時に結果表示とタイトル復帰ボタンが表示される', () => {
    const state = createInitialGameState();
    state.winner = 'P1';
    state.humanPlayerSide = 'P1';

    const store = createGameStore(state, { rng: () => 0.5 });
    const onReturnToTitle = jest.fn();
    render(<BattleScreen useStore={store} onReturnToTitle={onReturnToTitle} />);

    expect(screen.getByRole('heading', { name: '対局結果' })).toBeInTheDocument();
    expect(screen.getByText('勝敗: 勝利')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイトルへ戻る' }));
    expect(onReturnToTitle).toHaveBeenCalledTimes(1);
  });

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

  it('移動可能マスは破線枠で表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByRole('button', { name: 'タイル 2,2' })).toHaveStyle({ borderStyle: 'dashed' });
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

  it('チュートリアルボタンでハンドラが呼ばれる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    const onOpenTutorial = jest.fn();

    render(<BattleScreen useStore={store} onOpenTutorial={onOpenTutorial} />);

    fireEvent.click(screen.getByRole('button', { name: 'その他' }));
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプ' }));
    fireEvent.click(screen.getByRole('button', { name: 'チュートリアル' }));
    expect(onOpenTutorial).toHaveBeenCalledTimes(1);
  });

  it('トップバーで自軍資金と自軍収入を確認できる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getByText('自軍資金: 10000')).toBeInTheDocument();
    expect(screen.getByText('自軍収入: +2000/ターン')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' })); // p1_tank

    expect(screen.getByRole('button', { name: '占領実行' })).toBeDisabled();
  });

  it('可視マスでは地形/ユニット詳細ツールチップが表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const tile = screen.getByRole('button', { name: 'タイル 1,2' });
    const tooltip = tile.getAttribute('title') ?? '';

    expect(tooltip).toContain('地形: 平地');
    expect(tooltip).toContain('防御: 標準');
    expect(tooltip).toContain('補給: なし');
    expect(tooltip).toContain('ユニット: 戦車');
    expect(tooltip).toContain('ID: p1_tank');
    expect(tooltip).toContain('HP: 10');
    expect(tooltip).toContain('特性:');
  });

  it('不可視マスでも地形ツールチップを表示し、ユニット情報は含めない', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.units.p1_inf.position = { x: 0, y: 0 };
    state.units.p1_tank.position = { x: 0, y: 0 };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const hiddenTile = screen.getByRole('button', { name: 'タイル 4,4' });
    const tooltip = hiddenTile.getAttribute('title') ?? '';

    expect(tooltip).toContain('地形:');
    expect(tooltip).toContain('防御:');
    expect(tooltip).not.toContain('ユニット:');
  });

  it('経過ログは新しい順で表示される', () => {
    const state = createInitialGameState();
    state.actionLog = [
      { turn: 1, playerId: 'P1', action: 'MOVE_UNIT', detail: 'old' },
      { turn: 1, playerId: 'P1', action: 'ATTACK', detail: 'new' },
    ];

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const logSection = screen.getByLabelText('経過ログ');
    const newest = 'T1 P1 ATTACK | new';
    const older = 'T1 P1 MOVE_UNIT | old';

    expect(within(logSection).getByText(newest)).toBeInTheDocument();
    expect(within(logSection).getByText(older)).toBeInTheDocument();

    const text = logSection.textContent ?? '';
    expect(text.indexOf(newest)).toBeLessThan(text.indexOf(older));
  });
  it('HQ/工場/都市のツールチップに拠点耐久が表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const hqTile = screen.getByRole('button', { name: 'タイル 0,0' });
    const factoryTile = screen.getByRole('button', { name: 'タイル 0,1' });
    const cityTile = screen.getByRole('button', { name: 'タイル 1,1' });

    expect(hqTile.getAttribute('title') ?? '').toContain('拠点耐久: 20/20');
    expect(factoryTile.getAttribute('title') ?? '').toContain('拠点耐久: 20/20');
    expect(cityTile.getAttribute('title') ?? '').toContain('拠点耐久: 20/20');
  });
  it('敵方ログ表示設定がOFFのとき、経過ログに敵方の行動は表示されない', () => {
    const state = createInitialGameState();
    state.humanPlayerSide = 'P1';
    state.showEnemyActionLogs = false;
    state.actionLog = [
      { turn: 1, playerId: 'P1', action: 'MOVE_UNIT', detail: 'ally' },
      { turn: 1, playerId: 'P2', action: 'END_TURN', detail: 'enemy' },
    ];

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const logSection = screen.getByLabelText('経過ログ');
    const text = logSection.textContent ?? '';

    expect(text).toContain('MOVE_UNIT');
    expect(text).not.toContain('END_TURN');
  });
  it('攻撃前に予測ダメージが表示される', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByText(/攻撃予測:/)).toBeInTheDocument();
    expect(screen.getByText(/与ダメージ/)).toBeInTheDocument();
  });
});

