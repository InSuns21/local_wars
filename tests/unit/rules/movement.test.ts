import {
  canEnterTile,
  findMovePath,
  findPreferredMovePath,
  getEnemyUnits,
  getMovementCost,
  getPathCost,
  getReachableTiles,
  isEnemyZoc,
} from '@core/rules/movement';
import type { MapState } from '@core/types/map';
import type { UnitState } from '@core/types/unit';

const makeMap = (): MapState => {
  const tiles: MapState['tiles'] = {};
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      tiles[`${x},${y}`] = { coord: { x, y }, terrainType: 'PLAIN' };
    }
  }
  tiles['1,1'] = { coord: { x: 1, y: 1 }, terrainType: 'MOUNTAIN' };
  tiles['2,1'] = { coord: { x: 2, y: 1 }, terrainType: 'RIVER' };
  return { width: 4, height: 4, tiles };
};

const makeUnit = (overrides: Partial<UnitState>): UnitState => ({
  id: 'u1',
  owner: 'P1',
  type: 'TANK',
  hp: 10,
  fuel: 99,
  ammo: 9,
  position: { x: 0, y: 0 },
  moved: false,
  acted: false,
  ...overrides,
});

describe('移動ルール', () => {
  it('地形と移動タイプから移動コストを返す', () => {
    expect(getMovementCost('PLAIN', 'FOOT')).toBe(1);
    expect(canEnterTile('MOUNTAIN', 'TREAD')).toBe(false);
  });

  it('敵ZOCを隣接マスで判定する（HP0敵はZOCを持たない）', () => {
    const enemy: UnitState = makeUnit({
      id: 'e1',
      owner: 'P2',
      type: 'TANK',
      position: { x: 1, y: 1 },
      hp: 10,
    });

    expect(isEnemyZoc({ x: 1, y: 0 }, [enemy])).toBe(true);
    expect(isEnemyZoc({ x: 0, y: 0 }, [enemy])).toBe(false);
    expect(isEnemyZoc({ x: 1, y: 0 }, [{ ...enemy, hp: 0 }])).toBe(false);
  });

  it('移動可能範囲を計算し通行不可地形を除外する', () => {
    const map = makeMap();
    const unit = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });

    const result = getReachableTiles({ map, unit, enemyUnits: [], maxMove: 3 });
    expect(result).toEqual(
      expect.arrayContaining([
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
      ]),
    );

    expect(result).not.toContainEqual({ x: 1, y: 1 });
  });

  it('歩兵系は山を通行でき、歩兵系以外の陸上ユニットは通行できない', () => {
    const map = makeMap();

    const infantry = makeUnit({ id: 'inf', type: 'INFANTRY' });
    const airDefenseInfantry = makeUnit({ id: 'ad', type: 'AIR_DEFENSE_INFANTRY' });
    const tank = makeUnit({ id: 'tank', type: 'TANK' });

    const infantryRange = getReachableTiles({ map, unit: infantry, enemyUnits: [], maxMove: 3 });
    const airDefenseInfantryRange = getReachableTiles({ map, unit: airDefenseInfantry, enemyUnits: [], maxMove: 3 });
    const tankRange = getReachableTiles({ map, unit: tank, enemyUnits: [], maxMove: 3 });

    expect(infantryRange).toContainEqual({ x: 1, y: 1 });
    expect(airDefenseInfantryRange).toContainEqual({ x: 1, y: 1 });
    expect(tankRange).not.toContainEqual({ x: 1, y: 1 });
  });

  it('海岸は地上・航空ユニットが進入できるが海上ユニットは進入できない', () => {
    const map = makeMap();
    map.tiles['1,0'] = { coord: { x: 1, y: 0 }, terrainType: 'COAST' };

    expect(canEnterTile('COAST', 'FOOT')).toBe(true);
    expect(canEnterTile('COAST', 'TREAD')).toBe(true);
    expect(canEnterTile('COAST', 'WHEEL')).toBe(true);
    expect(canEnterTile('COAST', 'AIR')).toBe(true);
    expect(canEnterTile('COAST', 'NAVAL')).toBe(false);

    expect(getMovementCost('COAST', 'FOOT')).toBe(1);
    expect(getMovementCost('COAST', 'TREAD')).toBe(1);
    expect(getMovementCost('COAST', 'WHEEL')).toBe(2);
    expect(getMovementCost('COAST', 'NAVAL')).toBe(Number.POSITIVE_INFINITY);
  });

  it('getPathCostは空経路で0を返し、非隣接マス遷移を弾く', () => {
    const map = makeMap();
    const unit = makeUnit({ type: 'TANK' });
    const input = { map, unit, enemyUnits: [], maxMove: 5 };

    expect(getPathCost(input, [])).toBe(0);
    expect(getPathCost(input, [{ x: 2, y: 0 }])).toBeNull();
  });

  it('getPathCostは存在しないタイル・通行不可地形・移動力超過を弾く', () => {
    const map = makeMap();
    const tank = makeUnit({ type: 'TANK' });

    delete map.tiles['1,0'];
    expect(
      getPathCost({ map, unit: tank, enemyUnits: [], maxMove: 5 }, [{ x: 1, y: 0 }]),
    ).toBeNull();

    map.tiles['1,0'] = { coord: { x: 1, y: 0 }, terrainType: 'MOUNTAIN' };
    expect(
      getPathCost({ map, unit: tank, enemyUnits: [], maxMove: 5 }, [{ x: 1, y: 0 }]),
    ).toBeNull();

    expect(
      getPathCost({ map, unit: tank, enemyUnits: [], maxMove: 1 }, [{ x: 1, y: 0 }, { x: 2, y: 0 }]),
    ).toBeNull();
  });

  it('getPathCostは経路途中ZOCから先へ進むルートを弾く', () => {
    const map = makeMap();
    const unit = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const enemy = makeUnit({ id: 'e1', owner: 'P2', position: { x: 1, y: 1 } });

    const blocked = getPathCost(
      { map, unit, enemyUnits: [enemy], maxMove: 5 },
      [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
    );

    expect(blocked).toBeNull();
  });

  it('findMovePathは到達可能な終点の経路を返し、始点指定はnull', () => {
    const map = makeMap();
    const unit = makeUnit({ type: 'INFANTRY', position: { x: 0, y: 0 } });

    const path = findMovePath({ map, unit, enemyUnits: [], maxMove: 3 }, { x: 1, y: 1 });
    expect(path).not.toBeNull();
    expect(path?.[path.length - 1]).toEqual({ x: 1, y: 1 });

    const stay = findMovePath({ map, unit, enemyUnits: [], maxMove: 3 }, { x: 0, y: 0 });
    expect(stay).toBeNull();
  });

  it('findMovePathは移動力0や通行不能終点ではnullを返す', () => {
    const map = makeMap();
    const tank = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });

    const noMove = findMovePath({ map, unit: tank, enemyUnits: [], maxMove: 0 }, { x: 1, y: 0 });
    expect(noMove).toBeNull();

    const blocked = findMovePath({ map, unit: tank, enemyUnits: [], maxMove: 5 }, { x: 1, y: 1 });
    expect(blocked).toBeNull();
  });

  it('findPreferredMovePathは同コストなら直前の経路そのものを継ぎ足す', () => {
    const map = makeMap();
    map.tiles['1,1'] = { coord: { x: 1, y: 1 }, terrainType: 'PLAIN' };
    const unit = makeUnit({ type: 'INFANTRY', position: { x: 0, y: 0 } });

    const direct = findMovePath({ map, unit, enemyUnits: [], maxMove: 6 }, { x: 2, y: 1 });
    const preferred = findPreferredMovePath(
      { map, unit, enemyUnits: [], maxMove: 6 },
      { x: 2, y: 1 },
      [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    );

    expect(direct).toEqual([{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }]);
    expect(preferred).toEqual([{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }]);
  });

  it('findMovePathはblockedCoordKeysを避けて別ルートを選ぶ', () => {
    const map = makeMap();
    const unit = makeUnit({ type: 'INFANTRY', position: { x: 0, y: 0 } });

    const path = findMovePath(
      {
        map,
        unit,
        enemyUnits: [],
        maxMove: 6,
        blockedCoordKeys: new Set(['1,0']),
      },
      { x: 2, y: 0 },
    );

    expect(path).toEqual([{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 0 }]);
  });

  it('findPreferredMovePathは遠回りになる経由指定を採用しない', () => {
    const map = makeMap();
    const unit = makeUnit({ type: 'INFANTRY', position: { x: 0, y: 0 } });

    const preferred = findPreferredMovePath(
      { map, unit, enemyUnits: [], maxMove: 6 },
      { x: 2, y: 0 },
      [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    );

    expect(preferred).toEqual([{ x: 1, y: 0 }, { x: 2, y: 0 }]);
  });

  it('getReachableTilesは移動力0で空配列を返す', () => {
    const map = makeMap();
    const unit = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });

    const tiles = getReachableTiles({ map, unit, enemyUnits: [], maxMove: 0 });
    expect(tiles).toEqual([]);
  });

  it('getEnemyUnitsは自軍とHP0を除いた敵のみ返す', () => {
    const units: Record<string, UnitState> = {
      a: makeUnit({ id: 'a', owner: 'P1', hp: 10 }),
      b: makeUnit({ id: 'b', owner: 'P2', hp: 10 }),
      c: makeUnit({ id: 'c', owner: 'P2', hp: 0 }),
    };

    const enemies = getEnemyUnits(units, 'P1');
    expect(enemies.map((u) => u.id)).toEqual(['b']);
  });
  it('getPathCostは有効経路で移動コスト合計を返す', () => {
    const map = makeMap();
    const unit = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });

    const cost = getPathCost(
      { map, unit, enemyUnits: [], maxMove: 5 },
      [{ x: 1, y: 0 }, { x: 2, y: 0 }],
    );

    expect(cost).toBe(2);
  });

  it('findMovePathは経路途中ZOCマスから先に進む遷移を探索しない', () => {
    const map = makeMap();
    // 横一列以外を通れないようにしてZOC経路のみを作る
    map.tiles['0,1'].terrainType = 'SEA';
    map.tiles['1,1'].terrainType = 'SEA';
    map.tiles['2,1'].terrainType = 'SEA';
    map.tiles['3,1'].terrainType = 'SEA';

    const unit = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const enemy = makeUnit({ id: 'e1', owner: 'P2', position: { x: 2, y: 1 } });

    const path = findMovePath({ map, unit, enemyUnits: [enemy], maxMove: 5 }, { x: 3, y: 0 });
    expect(path).toBeNull();
  });

  it('getReachableTilesは経路途中ZOCマスより先のタイルを含めない', () => {
    const map = makeMap();
    map.tiles['0,1'].terrainType = 'SEA';
    map.tiles['1,1'].terrainType = 'SEA';
    map.tiles['2,1'].terrainType = 'SEA';
    map.tiles['3,1'].terrainType = 'SEA';

    const unit = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const enemy = makeUnit({ id: 'e1', owner: 'P2', position: { x: 2, y: 1 } });

    const tiles = getReachableTiles({ map, unit, enemyUnits: [enemy], maxMove: 5 });
    expect(tiles).toContainEqual({ x: 2, y: 0 });
    expect(tiles).not.toContainEqual({ x: 3, y: 0 });
  });
});




