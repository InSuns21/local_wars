import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { createBattleState, renderBattleScreen } from './helpers/renderBattleScreen';
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

  it('生産可能な工場がないときは工場セレクトを表示せずメッセージを表示する', () => {
    renderBattleScreen({
      mutateState: (state) => {
        state.units.p1_inf.position = { x: 0, y: 1 };
        state.units.p1_tank.position = { x: 0, y: 2 };
      },
    });

    expect(screen.getByText('生産拠点: 選択可能な拠点なし')).toBeInTheDocument();
    expect(screen.queryByLabelText('生産拠点')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生産実行' })).toBeDisabled();
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

    const unitSelect = screen.getByLabelText('ユニット') as HTMLSelectElement;
    await waitFor(() => {
      const optionLabels = Array.from(unitSelect.options).map((option) => option.textContent);
      expect(optionLabels).toContain(`空中補給機 (${UNIT_DEFINITIONS.AIR_TANKER.cost})`);
      expect(optionLabels).toContain(`輸送ヘリ (${UNIT_DEFINITIONS.TRANSPORT_HELI.cost})`);
      expect(optionLabels).not.toContain(`補給車 (${UNIT_DEFINITIONS.SUPPLY_TRUCK.cost})`);
      expect(optionLabels).not.toContain(`輸送車 (${UNIT_DEFINITIONS.TRANSPORT_TRUCK.cost})`);
    });
  });
});
