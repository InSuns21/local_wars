import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { createBattleState, renderBattleScreen } from './helpers/renderBattleScreen';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';

describe('BattleScreen UIテスト: コマンド操作(生産/状態)', () => {
  it('資金不足時は生産実行ボタンが不活性になる', () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.players.P1.funds = 0;
      },
    });

    fireEvent.change(screen.getByLabelText('生産拠点'), { target: { value: '0,1' } });
    fireEvent.change(screen.getByLabelText('ユニット'), { target: { value: 'INFANTRY' } });

    expect(screen.getByRole('button', { name: '生産実行' })).toBeDisabled();
  });

  it('生産UIでユニット価格を表示し、資金不足時は生産実行が不活性になる', () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.players.P1.funds = 500;
      },
    });

    expect(screen.getByRole('option', { name: '歩兵 (1000)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '補給車 (3000)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: `輸送車 (${UNIT_DEFINITIONS.TRANSPORT_TRUCK.cost})` })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: `防空歩兵 (${UNIT_DEFINITIONS.AIR_DEFENSE_INFANTRY.cost})` })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: `自爆ドローン (${UNIT_DEFINITIONS.SUICIDE_DRONE.cost})` })).not.toBeInTheDocument();
    expect(screen.getByText('必要資金: 1000')).toBeInTheDocument();
    expect(screen.getByText('現在手番の資金: 500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生産実行' })).toBeDisabled();
  });

  it('生産直後ユニットは移動・攻撃・占領が不活性になる', () => {
    const state = createBattleState();
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

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));

    expect(screen.getByRole('button', { name: '移動実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '攻撃実行' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '占領実行' })).toBeDisabled();
  });

  it('工場や空港が占有中でも生産拠点セレクトは表示され、通常生産は失敗しうる', () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.units.p1_inf.position = { x: 0, y: 1 };
        state.units.p1_tank.position = { x: 0, y: 2 };
      },
    });

    expect(screen.getByLabelText('生産拠点')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生産実行' })).toBeEnabled();
  });

  it('ドローン無効時は工場で自爆ドローンと対ドローン防空車を出さない', () => {
    renderBattleScreen();

    const unitSelect = screen.getByLabelText('ユニット') as HTMLSelectElement;
    const optionLabels = Array.from(unitSelect.options).map((option) => option.textContent);
    expect(optionLabels).not.toContain(`自爆ドローン (${UNIT_DEFINITIONS.SUICIDE_DRONE.cost})`);
    expect(optionLabels).not.toContain(`対ドローン防空車 (${UNIT_DEFINITIONS.COUNTER_DRONE_AA.cost})`);
  });

  it('ドローン有効時は工場で自爆ドローンと対ドローン防空車を生産候補に出し、ドローン導線を常時表示する', async () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.enableSuicideDrones = true;
      },
    });

    await waitFor(() => {
      const unitSelect = screen.getByLabelText('ユニット') as HTMLSelectElement;
      const optionLabels = Array.from(unitSelect.options).map((option) => option.textContent);
      expect(optionLabels).toContain(`自爆ドローン (${UNIT_DEFINITIONS.SUICIDE_DRONE.cost})`);
      expect(optionLabels).toContain(`対ドローン防空車 (${UNIT_DEFINITIONS.COUNTER_DRONE_AA.cost})`);
    });
    expect(screen.getByText('ドローン枠 0/3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ドローン生産' })).toBeInTheDocument();
  });

  it('ドローン無効時は工場のドローン関連UI表示を隠す', () => {
    renderBattleScreen();

    expect(screen.queryByText(/ドローン枠/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ドローン生産' })).not.toBeInTheDocument();
    expect(screen.queryByText(/ドローンは工場周辺5マスへ自動配置/)).not.toBeInTheDocument();
  });

  it.each([
    'drone-factory-front',
    'interceptor-belt',
    'industrial-drone-raid',
  ] as const)('ドローン戦向けマップ %s では生産UIの初期選択が工場優先になる', async (mapId) => {
    const scenarioState = createInitialGameState({ mapId });
    scenarioState.enableSuicideDrones = true;

    renderBattleScreen({
      mutateState: (state) => Object.assign(state, scenarioState),
    });

    await waitFor(() => {
      expect(screen.getByLabelText('生産拠点')).toHaveValue('1,3');
    });
  });

  it('空港選択時は空中補給機を含む航空ユニットを生産候補に出す', async () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.map.tiles['0,2'] = {
          coord: { x: 0, y: 2 },
          terrainType: 'AIRPORT',
          owner: 'P1',
          capturePoints: 20,
          structureHp: 20,
          operational: true,
        };
        state.units.p1_inf.position = { x: 0, y: 1 };
      },
    });

    fireEvent.change(screen.getByLabelText('生産拠点'), { target: { value: '0,2' } });

    const unitSelect = screen.getByLabelText('ユニット') as HTMLSelectElement;
    await waitFor(() => {
      const optionLabels = Array.from(unitSelect.options).map((option) => option.textContent);
      expect(optionLabels).toContain(`空中補給機 (${UNIT_DEFINITIONS.AIR_TANKER.cost})`);
      expect(optionLabels).toContain(`輸送ヘリ (${UNIT_DEFINITIONS.TRANSPORT_HELI.cost})`);
      expect(optionLabels).not.toContain(`補給車 (${UNIT_DEFINITIONS.SUPPLY_TRUCK.cost})`);
      expect(optionLabels).not.toContain(`輸送車 (${UNIT_DEFINITIONS.TRANSPORT_TRUCK.cost})`);
    });
  });

  it('港選択時は海上ユニットを生産候補に出す', async () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.map.tiles['0,3'] = {
          coord: { x: 0, y: 3 },
          terrainType: 'PORT',
          owner: 'P1',
          capturePoints: 20,
          structureHp: 20,
          operational: true,
        };
        state.units.p1_inf.position = { x: 1, y: 1 };
      },
    });

    fireEvent.change(screen.getByLabelText('生産拠点'), { target: { value: '0,3' } });

    const unitSelect = screen.getByLabelText('ユニット') as HTMLSelectElement;
    await waitFor(() => {
      const optionLabels = Array.from(unitSelect.options).map((option) => option.textContent);
      expect(optionLabels).toContain(`駆逐艦 (${UNIT_DEFINITIONS.DESTROYER.cost})`);
      expect(optionLabels).toContain(`揚陸艦 (${UNIT_DEFINITIONS.LANDER.cost})`);
      expect(optionLabels).toContain(`空母 (${UNIT_DEFINITIONS.CARRIER.cost})`);
      expect(optionLabels).toContain(`潜水艦 (${UNIT_DEFINITIONS.SUBMARINE.cost})`);
      expect(optionLabels).toContain(`戦艦 (${UNIT_DEFINITIONS.BATTLESHIP.cost})`);
      expect(optionLabels).toContain(`補給艦 (${UNIT_DEFINITIONS.SUPPLY_SHIP.cost})`);
      expect(optionLabels).not.toContain(`戦闘機 (${UNIT_DEFINITIONS.FIGHTER.cost})`);
      expect(optionLabels).not.toContain(`歩兵 (${UNIT_DEFINITIONS.INFANTRY.cost})`);
    });
  });
});
