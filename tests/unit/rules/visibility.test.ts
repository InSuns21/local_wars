import { applyCommand } from '@core/engine/commandApplier';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { getVisibleEnemyCoordKeys, getVisibleEnemyUnitIds, getVisibleTileCoordKeys } from '@core/rules/visibility';

describe('visibility ルール', () => {
  it('索敵OFF時は敵ユニットが全て見える', () => {
    const state = createInitialGameState();
    state.fogOfWar = false;

    const visible = getVisibleEnemyUnitIds(state, 'P1');

    expect(visible.has('p2_inf')).toBe(true);
    expect(visible.has('p2_tank')).toBe(true);
  });

  it('索敵ON時は視界内の敵ユニットのみ見える', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;

    // P1から十分遠ざけて視界外にする
    state.units.p2_inf.position = { x: 4, y: 4 };
    state.units.p2_tank.position = { x: 4, y: 3 };

    const visible = getVisibleEnemyUnitIds(state, 'P1');

    expect(visible.size).toBe(0);
  });

  it('山にいる歩兵は視界が1マス広がる', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;

    state.map.tiles['1,1'] = {
      ...state.map.tiles['1,1'],
      terrainType: 'MOUNTAIN',
    };
    state.units.p1_inf.position = { x: 1, y: 1 };
    state.units.p1_tank.position = { x: 0, y: 4 };

    state.units.p2_inf.position = { x: 4, y: 1 };
    state.units.p2_tank.position = { x: 4, y: 4 };

    const visible = getVisibleEnemyUnitIds(state, 'P1');

    expect(visible.has('p2_inf')).toBe(true);
    expect(visible.has('p2_tank')).toBe(false);
  });

  it('戦闘で視界提供ユニットが消滅すると、そのユニット由来の視界も消える', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;

    state.currentPlayerId = 'P2';

    state.units.p1_inf.position = { x: 1, y: 1 };
    state.units.p1_inf.hp = 1;
    state.units.p1_tank.position = { x: 0, y: 4 };

    state.units.p2_tank.position = { x: 2, y: 1 };
    state.units.p2_tank.hp = 10;
    state.units.p2_tank.ammo = 6;

    state.units.p2_inf.position = { x: 4, y: 4 };

    const visibleBefore = getVisibleEnemyUnitIds(state, 'P1');
    expect(visibleBefore.has('p2_tank')).toBe(true);

    const attacked = applyCommand(
      state,
      { type: 'ATTACK', attackerId: 'p2_tank', defenderId: 'p1_inf' },
      { rng: () => 0.5 },
    );

    expect(attacked.result.ok).toBe(true);
    expect(attacked.state.units.p1_inf).toBeUndefined();

    const visibleAfter = getVisibleEnemyUnitIds(attacked.state, 'P1');
    expect(visibleAfter.has('p2_tank')).toBe(false);
  });
  it('索敵OFF時の可視座標キーは全敵ユニット位置を返す', () => {
    const state = createInitialGameState();
    state.fogOfWar = false;

    const keys = getVisibleEnemyCoordKeys(state, 'P1');
    expect(keys.has('3,3')).toBe(true);
    expect(keys.has('3,2')).toBe(true);
  });

  it('索敵ON時の可視座標キーは視界内敵のみ返す', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;

    state.units.p2_inf.position = { x: 2, y: 1 }; // p1_inf(1,1)の視界2内
    state.units.p2_tank.position = { x: 4, y: 4 }; // 視界外

    const keys = getVisibleEnemyCoordKeys(state, 'P1');
    expect(keys.has('2,1')).toBe(true);
    expect(keys.has('4,4')).toBe(false);
  });
  it('FoW時でも自軍の都市・工場・HQは常に可視になる', () => {
    const state = createInitialGameState();
    state.fogOfWar = true;

    state.units.p1_inf.position = { x: 4, y: 4 };
    state.units.p1_tank.position = { x: 4, y: 3 };

    const visibleTiles = getVisibleTileCoordKeys(state, 'P1');

    expect(visibleTiles.has('0,0')).toBe(true); // P1 HQ
    expect(visibleTiles.has('0,1')).toBe(true); // P1 FACTORY
    expect(visibleTiles.has('1,1')).toBe(true); // P1 CITY
  });

});

