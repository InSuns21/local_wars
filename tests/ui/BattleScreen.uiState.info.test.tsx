import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('@components/board/GameCanvas', async () => await import('./helpers/mockGameCanvas'));
vi.mock('@components/board/BoardLegend', async () => await import('./helpers/mockBoardLegend'));

import { BattleScreen } from '@/screens/BattleScreen';
import { createGameStore } from '@store/gameStore';
import { createInitialGameState } from '@core/engine/createInitialGameState';

describe('BattleScreen UIテスト: 情報表示と導線', () => {
  it('勝敗確定時に結果モーダルと勝利条件が表示され、タイトル復帰ボタンが機能する', () => {
    const state = createInitialGameState();
    state.winner = 'P1';
    state.victoryReason = 'HQ_CAPTURE';
    state.humanPlayerSide = 'P1';

    const store = createGameStore(state, { rng: () => 0.5 });
    const onReturnToTitle = vi.fn();
    render(<BattleScreen useStore={store} onReturnToTitle={onReturnToTitle} />);

    expect(screen.getByRole('dialog', { name: '対局結果' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '対局結果' })).toBeInTheDocument();
    expect(screen.getByText('勝敗: 勝利')).toBeInTheDocument();
    expect(screen.getByText('勝利条件: 司令部占領')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイトルへ戻る' }));
    expect(onReturnToTitle).toHaveBeenCalledTimes(1);
  });

  it('チュートリアルボタンでハンドラが呼ばれる', () => {
    const store = createGameStore(createInitialGameState(), { rng: () => 0.5 });
    const onOpenTutorial = vi.fn();

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
    expect(screen.getByText('自軍収入: +4000/ターン')).toBeInTheDocument();
  });

  it('トップバーで確定した敵AI傾向を確認できる', () => {
    const state = createInitialGameState();
    state.selectedAiProfile = 'adaptive';
    state.resolvedAiProfile = 'captain';

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getByText('敵AI傾向: 可変→占領')).toBeInTheDocument();
  });

  it('adaptiveの再抽選結果が変わるとトップバー表示も更新される', () => {
    const state = createInitialGameState();
    state.selectedAiProfile = 'adaptive';
    state.resolvedAiProfile = 'hunter';

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    expect(screen.getByText('敵AI傾向: 可変→撃破')).toBeInTheDocument();

    act(() => {
      store.getState().setGameState({
        ...store.getState().gameState,
        resolvedAiProfile: 'captain',
      });
    });

    expect(screen.getByText('敵AI傾向: 可変→占領')).toBeInTheDocument();
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
    const newest = 'T1 自軍 攻撃 | new';
    const older = 'T1 自軍 移動 | old';

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
    expect(cityTile.getAttribute('title') ?? '').toContain('拠点耐久: 10/10');
  });

  it('選択ユニットの低燃料・残弾僅少は左バーで警告表示する', () => {
    const state = createInitialGameState();
    state.units.p1_tank = {
      ...state.units.p1_tank,
      fuel: 10,
      ammo: 1,
    };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    expect(screen.getByText('燃料警戒')).toBeInTheDocument();
    expect(screen.getByText('残り10以下')).toBeInTheDocument();
    expect(screen.getByText('弾薬警戒')).toBeInTheDocument();
    expect(screen.getByText('残り1以下')).toBeInTheDocument();
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

    expect(text).toContain('自軍 移動');
    expect(text).not.toContain('敵軍 ターン終了');
  });

  it('敵方ログ表示設定がOFFでも味方に関わる敵の戦闘と占領は表示される', () => {
    const state = createInitialGameState();
    state.humanPlayerSide = 'P1';
    state.showEnemyActionLogs = false;
    state.actionLog = [
      { turn: 1, playerId: 'P2', action: 'MOVE_UNIT', detail: 'enemy move' },
      { turn: 1, playerId: 'P2', action: 'ATTACK', detail: 'P2_tank -> P1_tank 味方HP:10->6 敵HP:10->8 被害:4/2' },
      { turn: 1, playerId: 'P2', action: 'CAPTURE', detail: 'P2_inf @ 1,1 terrain=CITY owner=P1' },
    ];

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const logSection = screen.getByLabelText('経過ログ');
    const text = logSection.textContent ?? '';

    expect(text).toContain('敵軍 攻撃');
    expect(text).toContain('敵軍 占領');
    expect(text).not.toContain('enemy move');
    expect(text).not.toContain('敵軍 移動');
  });

  it('敵軍の中立施設占領は敵方ログ非表示時に表示しない', () => {
    const state = createInitialGameState();
    state.humanPlayerSide = 'P1';
    state.showEnemyActionLogs = false;
    state.actionLog = [
      { turn: 1, playerId: 'P2', action: 'CAPTURE', detail: 'P2_inf @ 3,3 terrain=CITY owner=NEUTRAL' },
    ];

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    const logSection = screen.getByLabelText('経過ログ');
    const text = logSection.textContent ?? '';

    expect(text).not.toContain('敵軍 占領');
  });
  it('AI再生バナーが敵軍ターン中に表示され、スキップで自軍ターンへ戻る', () => {
    const state = createInitialGameState();
    state.players.P2.funds = 0;
    state.units = {
      p2_tank: { ...state.units.p2_tank, position: { x: 2, y: 2 } },
      p1_tank: { ...state.units.p1_tank, position: { x: 2, y: 1 } },
    };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    act(() => {
      store.getState().endTurn();
    });

    expect(screen.getByText('敵軍行動中...')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'スキップ' }));

    expect(screen.queryByText('敵軍行動中...')).not.toBeInTheDocument();
    expect(screen.getByText('手番: P1')).toBeInTheDocument();
  });

  it('AI再生中の可視移動は盤面へ逐次反映される', () => {
    const state = createInitialGameState();
    state.players.P2.funds = 0;
    state.units = {
      p2_tank: { ...state.units.p2_tank, position: { x: 0, y: 4 } },
      p1_tank: { ...state.units.p1_tank, position: { x: 4, y: 0 } },
    };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    act(() => {
      store.getState().endTurn();
    });

    expect(store.getState().aiPlaybackEvents.filter((event) => event.type === 'move').length).toBeGreaterThan(1);

    const firstPos = { ...store.getState().gameState.units.p2_tank.position };
    expect(within(screen.getByRole('button', { name: `タイル ${firstPos.x},${firstPos.y}` })).getByText('TANK')).toBeInTheDocument();

    act(() => {
      store.getState().stepAiPlayback();
    });

    const secondPos = store.getState().gameState.units.p2_tank.position;
    expect(secondPos).not.toEqual(firstPos);
    expect(within(screen.getByRole('button', { name: `タイル ${secondPos.x},${secondPos.y}` })).getByText('TANK')).toBeInTheDocument();
  });

  it('再生後のターン開始サマリーに新規視認が表示され、閉じられる', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;
    state.selectedAiProfile = 'balanced';
    state.aiDifficulty = 'normal';
    state.players.P2.funds = 0;
    state.units = {
      p1_tank: { ...state.units.p1_tank, position: { x: 0, y: 0 } },
      p2_tank: { ...state.units.p2_tank, position: { x: 2, y: 0 } },
    };
    state.map.tiles['2,0'] = { coord: { x: 2, y: 0 }, terrainType: 'FOREST' };

    const store = createGameStore(state, { rng: () => 0.5 });
    render(<BattleScreen useStore={store} />);

    act(() => {
      store.getState().endTurn();
    });

    if (store.getState().aiPlaybackStatus === 'running') {
      act(() => {
        store.getState().skipAiPlayback();
      });
    }

    expect(store.getState().aiTurnSummary.map((item) => item.message).join(' | ')).toContain('新たに敵戦車を視認');
    expect(screen.getByText('ターン開始サマリー')).toBeInTheDocument();
    expect(screen.getByText('新たに敵戦車を視認')).toBeInTheDocument();
    expect(screen.getByText('HQ周辺に敵戦車が接近')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByText('ターン開始サマリー')).not.toBeInTheDocument();
  });
});



