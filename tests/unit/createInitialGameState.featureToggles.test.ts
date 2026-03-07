import { createInitialGameState } from '@core/engine/createInitialGameState';
import type { SkirmishScenario } from '@data/skirmishMaps';
import { getSkirmishScenario } from '@data/skirmishMaps';

jest.mock('@data/skirmishMaps', () => ({
  getSkirmishScenario: jest.fn(),
}));

const mockedGetSkirmishScenario = getSkirmishScenario as jest.MockedFunction<typeof getSkirmishScenario>;

const baseSettings = {
  aiDifficulty: 'normal' as const,
  humanPlayerSide: 'P1' as const,
  fogOfWar: false,
  initialFunds: 10000,
  incomePerProperty: 1000,
  incomeAirport: 1000,
  incomePort: 1000,
  hpRecoveryCity: 1,
  hpRecoveryFactory: 2,
  hpRecoveryHq: 3,
  enableAirUnits: true,
  enableNavalUnits: true,
  enableFuelSupply: true,
  enableAmmoSupply: true,
};

const buildScenario = (): SkirmishScenario => ({
  id: 'mock-map',
  name: 'mock',
  map: {
    width: 4,
    height: 4,
    tiles: {
      '0,0': { coord: { x: 0, y: 0 }, terrainType: 'AIRPORT' },
      '0,1': { coord: { x: 0, y: 1 }, terrainType: 'PORT' },
      '0,2': { coord: { x: 0, y: 2 }, terrainType: 'SEA' },
      '1,0': { coord: { x: 1, y: 0 }, terrainType: 'FACTORY', owner: 'P1', capturePoints: 20 },
      '1,1': { coord: { x: 1, y: 1 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 },
      '2,2': { coord: { x: 2, y: 2 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 },
    },
  },
  units: {
    p1_fighter: {
      id: 'p1_fighter', owner: 'P1', type: 'FIGHTER', hp: 10, fuel: 99, ammo: 9,
      position: { x: 0, y: 0 }, moved: false, acted: false, lastMovePath: [],
    },
    p1_bomber: {
      id: 'p1_bomber', owner: 'P1', type: 'BOMBER', hp: 10, fuel: 99, ammo: 9,
      position: { x: 1, y: 0 }, moved: false, acted: false, lastMovePath: [],
    },
    p2_destroyer: {
      id: 'p2_destroyer', owner: 'P2', type: 'DESTROYER', hp: 10, fuel: 99, ammo: 9,
      position: { x: 0, y: 2 }, moved: false, acted: false, lastMovePath: [],
    },
    p2_lander: {
      id: 'p2_lander', owner: 'P2', type: 'LANDER', hp: 10, fuel: 99, ammo: 9,
      position: { x: 1, y: 2 }, moved: false, acted: false, lastMovePath: [],
    },
    p1_inf: {
      id: 'p1_inf', owner: 'P1', type: 'INFANTRY', hp: 10, fuel: 99, ammo: 9,
      position: { x: 1, y: 1 }, moved: false, acted: false, lastMovePath: [],
    },
  },
});

describe('createInitialGameState 航空/海ユニット常時有効', () => {
  beforeEach(() => {
    mockedGetSkirmishScenario.mockReset();
    mockedGetSkirmishScenario.mockReturnValue(buildScenario());
  });

  it('旧設定で航空ユニットOFFが渡されても空港と航空ユニットを保持する', () => {
    const state = createInitialGameState({
      mapId: 'mock-map',
      settings: { ...baseSettings, enableAirUnits: false },
    });

    expect(state.map.tiles['0,0']).toBeDefined();
    expect(state.units.p1_fighter).toBeDefined();
    expect(state.units.p1_bomber).toBeDefined();
  });

  it('旧設定で海ユニットOFFが渡されても港/海と海ユニットを保持する', () => {
    const state = createInitialGameState({
      mapId: 'mock-map',
      settings: { ...baseSettings, enableNavalUnits: false },
    });

    expect(state.map.tiles['0,1']).toBeDefined();
    expect(state.map.tiles['0,2']).toBeDefined();
    expect(state.units.p2_destroyer).toBeDefined();
    expect(state.units.p2_lander).toBeDefined();
  });
});
