import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
    const onReturnToTitle = jest.fn();
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
    expect(screen.getByText('自軍収入: +3000/ターン')).toBeInTheDocument();
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
});
