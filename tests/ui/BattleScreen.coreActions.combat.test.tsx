import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';

jest.mock('@components/board/GameCanvas', () => require('./helpers/mockGameCanvas'));
jest.mock('@components/board/BoardLegend', () => require('./helpers/mockBoardLegend'));

import { createBattleState, renderBattleScreen } from './helpers/renderBattleScreen';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';

describe('BattleScreen UIテスト: 基本操作(戦闘/施設)', () => {
  it('空港選択時は航空ユニットを生産候補に表示する', async () => {
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
      expect(optionLabels).toContain(`戦闘機 (${UNIT_DEFINITIONS.FIGHTER.cost})`);
      expect(optionLabels).toContain(`攻撃機 (${UNIT_DEFINITIONS.ATTACKER.cost})`);
    });
  });

  it('施設爆撃ボタンで都市を機能停止にできる', () => {
    const state = createBattleState();
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

    const { store } = renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,1' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,1' }));
    fireEvent.click(screen.getByRole('button', { name: '施設爆撃' }));

    expect(store.getState().gameState.map.tiles['2,1'].operational).toBe(false);
    expect(store.getState().gameState.units.p1_tank.acted).toBe(true);
  });

  it('攻撃射程マスに赤表示用属性が付く', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));

    const inRangeTile = screen.getByRole('button', { name: 'タイル 2,2' });
    const outRangeTile = screen.getByRole('button', { name: 'タイル 4,4' });

    expect(inRangeTile).toHaveAttribute('data-attack-range', 'true');
    expect(outRangeTile).toHaveAttribute('data-attack-range', 'false');
  });

  it('移動先を指定すると移動後の攻撃可能マス表示へ更新される', () => {
    renderBattleScreen();

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    expect(screen.getByRole('button', { name: 'タイル 3,2' })).toHaveAttribute('data-attack-range', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'タイル 2,2' }));
    expect(screen.getByRole('button', { name: 'タイル 3,2' })).toHaveAttribute('data-attack-range', 'true');
  });

  it('移動後に隣接した自走砲への攻撃予測では反撃なしと表示される', () => {
    const state = createBattleState();
    state.units.p2_tank = {
      ...state.units.p2_tank,
      type: 'ARTILLERY',
      position: { x: 4, y: 2 },
    };

    renderBattleScreen({ mutateState: (nextState) => Object.assign(nextState, state) });

    fireEvent.click(screen.getByRole('button', { name: 'タイル 1,2' }));
    fireEvent.click(screen.getByRole('button', { name: 'タイル 3,2' }));
    fireEvent.change(screen.getByLabelText('攻撃対象'), { target: { value: 'p2_tank' } });

    expect(screen.getByText(/被ダメージ 0\(反撃なし\)/)).toBeInTheDocument();
  });
});
