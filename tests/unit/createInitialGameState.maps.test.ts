import { createInitialGameState } from '@core/engine/createInitialGameState';
import { MAP_CATALOG } from '@data/maps';
import { getSkirmishScenario } from '@data/skirmishMaps';
import { isNavalUnitType } from '@core/rules/facilities';

describe('createInitialGameState マップ読み込み', () => {
  it('mapIdを指定すると該当マップの盤面と初期配置を読み込む', () => {
    const state = createInitialGameState({ mapId: 'river-crossing' });

    expect(state.map.width).toBe(14);
    expect(state.map.height).toBe(10);
    expect(state.map.tiles['6,4']?.terrainType).toBe('BRIDGE');
    expect(state.units.p1_art.position).toEqual({ x: 2, y: 5 });
    expect(state.units.p2_art.position).toEqual({ x: 11, y: 4 });
  });

  it('異なるmapIdで盤面構造が変わる', () => {
    const plains = createInitialGameState({ mapId: 'plains-clash' });
    const canyon = createInitialGameState({ mapId: 'canyon-push' });

    expect(plains.map.width).not.toBe(canyon.map.width);
    expect(plains.map.tiles['6,4']?.terrainType).toBe('ROAD');
    expect(canyon.map.tiles['6,4']?.terrainType).toBe('ROAD');
    expect(canyon.map.tiles['5,4']?.terrainType).toBe('PLAIN');
  });

  it('未定義mapIdの場合はフォールバックマップを使う', () => {
    const state = createInitialGameState({ mapId: 'unknown-map-id' });

    expect(state.map.width).toBe(5);
    expect(state.map.height).toBe(5);
    expect(state.units.p1_tank.position).toEqual({ x: 1, y: 2 });
  });
  it('mapIdを指定すると勝敗判定用の司令部メタが復元される', () => {
    const state = createInitialGameState({ mapId: 'plains-clash' });

    expect(state.map.commandHqByPlayer?.P1).toEqual({ x: 1, y: 1 });
    expect(state.map.commandHqByPlayer?.P2).toEqual({ x: 10, y: 8 });
  });
});

describe('スカーミッシュマップ定義', () => {
  it('MAP_CATALOGが27件あり、全IDが実マップ定義に存在する', () => {
    expect(MAP_CATALOG).toHaveLength(27);

    for (const meta of MAP_CATALOG) {
      const scenario = getSkirmishScenario(meta.id);
      expect(scenario).not.toBeNull();
      expect(scenario?.map.width).toBe(meta.width);
      expect(scenario?.map.height).toBe(meta.height);
    }
  });

  it('空港を含むマップは16x16以上で都市が6個以上ある', () => {
    for (const meta of MAP_CATALOG) {
      const scenario = getSkirmishScenario(meta.id);
      if (!scenario) continue;

      const tiles = Object.values(scenario.map.tiles);
      const hasAirport = tiles.some((tile) => tile.terrainType === 'AIRPORT');
      if (!hasAirport) continue;

      const cityCount = tiles.filter((tile) => tile.terrainType === 'CITY').length;
      expect(scenario.map.width).toBeGreaterThanOrEqual(16);
      expect(scenario.map.height).toBeGreaterThanOrEqual(16);
      expect(cityCount).toBeGreaterThanOrEqual(6);
    }
  });

  it('すべてのマップでHQと工場はマンハッタン距離1以内に置かれない', () => {
    for (const meta of MAP_CATALOG) {
      const scenario = getSkirmishScenario(meta.id);
      if (!scenario) continue;

      const hqs = Object.values(scenario.map.tiles).filter((tile) => tile.terrainType === 'HQ');
      const factories = Object.values(scenario.map.tiles).filter((tile) => tile.terrainType === 'FACTORY');

      for (const hq of hqs) {
        for (const factory of factories) {
          const distance = Math.abs(hq.coord.x - factory.coord.x) + Math.abs(hq.coord.y - factory.coord.y);
          expect(distance).toBeGreaterThan(1);
        }
      }
    }
  });

  it('補給線重視マップ3種が追加され、補給回廊だけ空港を持たない', () => {
    const supplyGauntlet = getSkirmishScenario('supply-gauntlet');
    const relaySkyway = getSkirmishScenario('relay-skyway');
    const longMarchAirlift = getSkirmishScenario('long-march-airlift');

    expect(supplyGauntlet).not.toBeNull();
    expect(relaySkyway).not.toBeNull();
    expect(longMarchAirlift).not.toBeNull();

    const supplyAirports = Object.values(supplyGauntlet?.map.tiles ?? {}).filter((tile) => tile.terrainType === 'AIRPORT');
    const relayAirports = Object.values(relaySkyway?.map.tiles ?? {}).filter((tile) => tile.terrainType === 'AIRPORT');
    const longMarchAirports = Object.values(longMarchAirlift?.map.tiles ?? {}).filter((tile) => tile.terrainType === 'AIRPORT');

    expect(supplyAirports).toHaveLength(0);
    expect(relayAirports.length).toBeGreaterThanOrEqual(2);
    expect(longMarchAirports.length).toBeGreaterThanOrEqual(2);
  });

  it('ドローン向けマップ3種が追加されている', () => {
    expect(getSkirmishScenario('drone-factory-front')).not.toBeNull();
    expect(getSkirmishScenario('interceptor-belt')).not.toBeNull();
    expect(getSkirmishScenario('industrial-drone-raid')).not.toBeNull();
  });

  it('海戦向けマップ6種が追加されている', () => {
    const islandLanding = getSkirmishScenario('island-landing');
    const islandHopping = getSkirmishScenario('island-hopping');
    const coastalCannonade = getSkirmishScenario('coastal-cannonade');
    const combinedSeaFront = getSkirmishScenario('combined-sea-front');
    const carrierStrike = getSkirmishScenario('carrier-strike');
    const droneSeaFront = getSkirmishScenario('drone-sea-front');

    expect(islandLanding).not.toBeNull();
    expect(islandHopping).not.toBeNull();
    expect(coastalCannonade).not.toBeNull();
    expect(combinedSeaFront).not.toBeNull();
    expect(carrierStrike).not.toBeNull();
    expect(droneSeaFront).not.toBeNull();

    expect(Object.values(islandLanding?.map.tiles ?? {}).some((tile) => tile.terrainType === 'COAST')).toBe(true);
    expect(islandLanding?.map.tiles['5,6']?.terrainType).toBe('SEA');
    expect(islandLanding?.map.tiles['6,6']?.terrainType).toBe('SEA');
    expect(Object.values(islandHopping?.map.tiles ?? {}).filter((tile) => tile.terrainType === 'PORT').length).toBeGreaterThanOrEqual(5);
    expect(islandHopping?.map.tiles['5,8']?.terrainType).toBe('SEA');
    expect(islandHopping?.map.tiles['9,10']?.terrainType).toBe('SEA');
    expect(islandHopping?.map.tiles['13,11']?.terrainType).toBe('SEA');
    expect(islandHopping?.map.tiles['17,13']?.terrainType).toBe('SEA');
    expect(Object.values(coastalCannonade?.map.tiles ?? {}).some((tile) => tile.terrainType === 'SEA')).toBe(true);
    expect(Object.values(combinedSeaFront?.map.tiles ?? {}).some((tile) => tile.terrainType === 'AIRPORT')).toBe(true);
    expect(Object.values(carrierStrike?.units ?? {}).some((unit) => unit.type === 'CARRIER')).toBe(true);
    expect(Object.values(droneSeaFront?.units ?? {}).some((unit) => unit.type === 'COUNTER_DRONE_AA')).toBe(true);
  });

  it('CITY・FACTORY・AIRPORT・HQ は全マップで四方を海に囲まれない', () => {
    const getAdjacentTiles = (scenario: NonNullable<ReturnType<typeof getSkirmishScenario>>, x: number, y: number) => [
      scenario.map.tiles[`${x},${y - 1}`],
      scenario.map.tiles[`${x + 1},${y}`],
      scenario.map.tiles[`${x},${y + 1}`],
      scenario.map.tiles[`${x - 1},${y}`],
    ].filter((tile): tile is NonNullable<typeof tile> => Boolean(tile));

    const mustNotBeSurroundedBySeaTerrains = new Set(['CITY', 'FACTORY', 'AIRPORT', 'HQ']);

    for (const meta of MAP_CATALOG) {
      const scenario = getSkirmishScenario(meta.id);
      expect(scenario).not.toBeNull();
      if (!scenario) continue;

      for (const tile of Object.values(scenario.map.tiles)) {
        if (!mustNotBeSurroundedBySeaTerrains.has(tile.terrainType)) continue;
        const adjacentTiles = getAdjacentTiles(scenario, tile.coord.x, tile.coord.y);
        expect(adjacentTiles).toHaveLength(4);
        expect(adjacentTiles.every((adjacent) => adjacent.terrainType === 'SEA')).toBe(false);
      }
    }
  });

  it('海戦マップの港・海岸・海上初期配置が制約を満たす', () => {
    const getAdjacentTiles = (scenario: NonNullable<ReturnType<typeof getSkirmishScenario>>, x: number, y: number) => [
      scenario.map.tiles[`${x},${y - 1}`],
      scenario.map.tiles[`${x + 1},${y}`],
      scenario.map.tiles[`${x},${y + 1}`],
      scenario.map.tiles[`${x - 1},${y}`],
    ].filter((tile): tile is NonNullable<typeof tile> => Boolean(tile));

    const isLandTile = (terrainType: string) => terrainType !== 'SEA';
    const isNavalStagingTile = (terrainType: string | undefined) => terrainType === 'SEA' || terrainType === 'PORT';

    for (const mapId of ['island-landing', 'island-hopping', 'coastal-cannonade', 'combined-sea-front', 'carrier-strike', 'drone-sea-front']) {
      const scenario = getSkirmishScenario(mapId);
      expect(scenario).not.toBeNull();
      if (!scenario) continue;

      for (const tile of Object.values(scenario.map.tiles)) {
        const adjacentTiles = getAdjacentTiles(scenario, tile.coord.x, tile.coord.y);

        if (tile.terrainType === 'PORT') {
          expect(adjacentTiles.some((adjacent) => adjacent.terrainType === 'SEA')).toBe(true);
          expect(adjacentTiles.some((adjacent) => isLandTile(adjacent.terrainType))).toBe(true);
        }

        if (tile.terrainType === 'COAST') {
          const seaAdjacentCount = adjacentTiles.filter((adjacent) => adjacent.terrainType === 'SEA').length;
          const coastAdjacentCount = adjacentTiles.filter((adjacent) => adjacent.terrainType === 'COAST').length;

          expect(seaAdjacentCount).toBeGreaterThanOrEqual(1);
          expect(seaAdjacentCount).toBeLessThan(3);
          expect(coastAdjacentCount).toBeLessThan(3);
          expect(adjacentTiles.some((adjacent) => isLandTile(adjacent.terrainType) && adjacent.terrainType !== 'COAST')).toBe(true);
        }
      }

      for (const unit of Object.values(scenario.units)) {
        if (!isNavalUnitType(unit.type)) continue;
        expect(isNavalStagingTile(scenario.map.tiles[`${unit.position.x},${unit.position.y}`]?.terrainType)).toBe(true);
      }
    }
  });

  it('迎撃防衛線は前線に対ドローン防空車を初期配置し、中央工場をやや後方に置く', () => {
    const interceptorBelt = getSkirmishScenario('interceptor-belt');
    expect(interceptorBelt).not.toBeNull();

    expect(interceptorBelt?.map.tiles['7,4']?.terrainType).toBe('FACTORY');
    expect(interceptorBelt?.map.tiles['6,4']?.terrainType).toBe('PLAIN');
    expect(Object.values(interceptorBelt?.units ?? {}).some((unit) => unit.type === 'COUNTER_DRONE_AA' && unit.owner === 'P1')).toBe(true);
    expect(Object.values(interceptorBelt?.units ?? {}).some((unit) => unit.type === 'COUNTER_DRONE_AA' && unit.owner === 'P2')).toBe(true);
  });

  it('道路誘導マップの斜め道路にマンハッタン補間タイルが追加されている', () => {
    const runwayRush = getSkirmishScenario('runway-rush');
    const relaySkyway = getSkirmishScenario('relay-skyway');
    const longMarchAirlift = getSkirmishScenario('long-march-airlift');

    expect(runwayRush?.map.tiles['9,7']?.terrainType).toBe('ROAD');

    expect(relaySkyway?.map.tiles['4,3']?.terrainType).toBe('ROAD');
    expect(relaySkyway?.map.tiles['7,6']?.terrainType).toBe('ROAD');
    expect(relaySkyway?.map.tiles['12,10']?.terrainType).toBe('ROAD');
    expect(relaySkyway?.map.tiles['14,12']?.terrainType).toBe('ROAD');

    expect(longMarchAirlift?.map.tiles['4,2']?.terrainType).toBe('ROAD');
    expect(longMarchAirlift?.map.tiles['7,5']?.terrainType).toBe('ROAD');
    expect(longMarchAirlift?.map.tiles['11,8']?.terrainType).toBe('ROAD');
    expect(longMarchAirlift?.map.tiles['14,11']?.terrainType).toBe('ROAD');
    expect(longMarchAirlift?.map.tiles['16,13']?.terrainType).toBe('ROAD');
  });
});

