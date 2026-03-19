import type { GameSettings } from '@/app/types';
import { getSkirmishScenario } from '@data/skirmishMaps';
import type { GameState } from '@core/types/state';
import { UNIT_DEFINITIONS } from './unitDefinitions';

export type GameInitializationOptions = {
  mapId?: string;
  settings?: GameSettings;
};

const applySupplyChargeDefaults = (state: GameState, maxSupplyCharges: number): GameState['units'] =>
  Object.fromEntries(
    Object.entries(state.units).map(([id, unit]) => {
      if (!UNIT_DEFINITIONS[unit.type].resupplyTarget) {
        return [id, unit];
      }
      return [
        id,
        {
          ...unit,
          supplyCharges: unit.supplyCharges ?? maxSupplyCharges,
        },
      ];
    }),
  );

const applyFeatureToggles = (state: GameState, settings?: GameSettings): GameState => {
  if (!settings) {
    return {
      ...state,
      units: applySupplyChargeDefaults(state, state.maxSupplyCharges ?? 4),
      enemyMemory: state.enemyMemory ?? {},
    };
  }

  return {
    ...state,
    players: {
      P1: { ...state.players.P1, funds: settings.initialFunds },
      P2: { ...state.players.P2, funds: settings.initialFunds },
    },
    map: {
      ...state.map,
      tiles: { ...state.map.tiles },
    },
    units: applySupplyChargeDefaults({ ...state, units: { ...state.units } }, settings.maxSupplyCharges),
    enemyMemory: state.enemyMemory ?? {},
    factoryProductionState: {},
    incomePerProperty: settings.incomePerProperty,
    incomeAirport: settings.incomeAirport,
    incomePort: settings.incomePort,
    selectedAiProfile: settings.selectedAiProfile ?? state.selectedAiProfile ?? 'auto',
    hpRecoveryCity: settings.hpRecoveryCity,
    hpRecoveryFactory: settings.hpRecoveryFactory,
    hpRecoveryHq: settings.hpRecoveryHq,
    maxSupplyCharges: settings.maxSupplyCharges,
    fogOfWar: settings.fogOfWar,
    enableFuelSupply: settings.enableFuelSupply,
    enableAmmoSupply: settings.enableAmmoSupply,
    enableSuicideDrones: settings.enableSuicideDrones,
    maxFactoryDronesPerFactory: settings.maxFactoryDronesPerFactory,
    droneInterceptionChancePercent: settings.droneInterceptionChancePercent,
    droneInterceptionMaxPerTurn: settings.droneInterceptionMaxPerTurn,
    droneAiProductionRatioLimitPercent: settings.droneAiProductionRatioLimitPercent,
    carrierCargoFuelRecoveryPercent: settings.carrierCargoFuelRecoveryPercent,
    carrierCargoAmmoRecoveryPercent: settings.carrierCargoAmmoRecoveryPercent,
    carrierCargoHpRecovery: settings.carrierCargoHpRecovery,
    carrierCargoHpRecoveryAtPort: settings.carrierCargoHpRecoveryAtPort,
    facilityCaptureCostIncreasePercent: settings.facilityCaptureCostIncreasePercent ?? 50,
    showEnemyActionLogs: settings.showEnemyActionLogs ?? false,
  };
};

const buildFallbackMapState = (): Pick<GameState, 'map' | 'units'> => ({
  map: {
    width: 5,
    height: 5,
    tiles: {
      '0,0': { coord: { x: 0, y: 0 }, terrainType: 'HQ', owner: 'P1', capturePoints: 20 },
      '4,4': { coord: { x: 4, y: 4 }, terrainType: 'HQ', owner: 'P2', capturePoints: 20 },
      '1,1': { coord: { x: 1, y: 1 }, terrainType: 'CITY', owner: 'P1', capturePoints: 10, structureHp: 10, operational: true },
      '3,3': { coord: { x: 3, y: 3 }, terrainType: 'CITY', owner: 'P2', capturePoints: 10, structureHp: 10, operational: true },
      '0,1': { coord: { x: 0, y: 1 }, terrainType: 'FACTORY', owner: 'P1', capturePoints: 20, structureHp: 20, operational: true },
      '4,3': { coord: { x: 4, y: 3 }, terrainType: 'FACTORY', owner: 'P2', capturePoints: 20, structureHp: 20, operational: true },
      '0,2': { coord: { x: 0, y: 2 }, terrainType: 'AIRPORT', owner: 'P1', capturePoints: 20, structureHp: 20, operational: true },
      '4,2': { coord: { x: 4, y: 2 }, terrainType: 'AIRPORT', owner: 'P2', capturePoints: 20, structureHp: 20, operational: true },
      '0,3': { coord: { x: 0, y: 3 }, terrainType: 'PLAIN' },
      '0,4': { coord: { x: 0, y: 4 }, terrainType: 'PLAIN' },
      '1,0': { coord: { x: 1, y: 0 }, terrainType: 'PLAIN' },
      '1,2': { coord: { x: 1, y: 2 }, terrainType: 'PLAIN' },
      '1,3': { coord: { x: 1, y: 3 }, terrainType: 'PLAIN' },
      '1,4': { coord: { x: 1, y: 4 }, terrainType: 'PLAIN' },
      '2,0': { coord: { x: 2, y: 0 }, terrainType: 'FACTORY', capturePoints: 20, structureHp: 20, operational: true },
      '2,1': { coord: { x: 2, y: 1 }, terrainType: 'PLAIN' },
      '2,2': { coord: { x: 2, y: 2 }, terrainType: 'PLAIN' },
      '2,3': { coord: { x: 2, y: 3 }, terrainType: 'PLAIN' },
      '2,4': { coord: { x: 2, y: 4 }, terrainType: 'PLAIN' },
      '3,0': { coord: { x: 3, y: 0 }, terrainType: 'PLAIN' },
      '3,1': { coord: { x: 3, y: 1 }, terrainType: 'PLAIN' },
      '3,2': { coord: { x: 3, y: 2 }, terrainType: 'PLAIN' },
      '3,4': { coord: { x: 3, y: 4 }, terrainType: 'PLAIN' },
      '4,0': { coord: { x: 4, y: 0 }, terrainType: 'PLAIN' },
      '4,1': { coord: { x: 4, y: 1 }, terrainType: 'PLAIN' },
    },
  },
  units: {
    p1_inf: {
      id: 'p1_inf',
      owner: 'P1',
      type: 'INFANTRY',
      hp: 10,
      fuel: 99,
      ammo: 9,
      position: { x: 1, y: 1 },
      moved: false,
      acted: false,
      lastMovePath: [],
    },
    p1_tank: {
      id: 'p1_tank',
      owner: 'P1',
      type: 'TANK',
      hp: 10,
      fuel: 70,
      ammo: 6,
      position: { x: 1, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
    },
    p2_inf: {
      id: 'p2_inf',
      owner: 'P2',
      type: 'INFANTRY',
      hp: 10,
      fuel: 99,
      ammo: 9,
      position: { x: 3, y: 3 },
      moved: false,
      acted: false,
      lastMovePath: [],
    },
    p2_tank: {
      id: 'p2_tank',
      owner: 'P2',
      type: 'TANK',
      hp: 10,
      fuel: 70,
      ammo: 6,
      position: { x: 3, y: 2 },
      moved: false,
      acted: false,
      lastMovePath: [],
    },
  },
});

const resolveMapState = (mapId?: string): Pick<GameState, 'map' | 'units'> => {
  if (!mapId) {
    return buildFallbackMapState();
  }

  const scenario = getSkirmishScenario(mapId);
  if (!scenario) {
    return buildFallbackMapState();
  }

  return {
    map: scenario.map,
    units: scenario.units,
  };
};

export const createInitialGameState = (options: GameInitializationOptions = {}): GameState => {
  const startPlayer = options.settings?.humanPlayerSide ?? 'P1';
  const mapState = resolveMapState(options.mapId);

  const base: GameState = {
    turn: 1,
    currentPlayerId: startPlayer,
    humanPlayerSide: startPlayer,
    aiDifficulty: options.settings?.aiDifficulty ?? 'normal',
    selectedAiProfile: options.settings?.selectedAiProfile ?? 'auto',
    resolvedAiProfile: undefined,
    enemyMemory: {},
    fogOfWar: options.settings?.fogOfWar ?? false,
    enableFuelSupply: options.settings?.enableFuelSupply ?? true,
    enableAmmoSupply: options.settings?.enableAmmoSupply ?? true,
    showEnemyActionLogs: options.settings?.showEnemyActionLogs ?? false,
    facilityCaptureCostIncreasePercent: options.settings?.facilityCaptureCostIncreasePercent ?? 50,
    phase: 'command',
    mapId: options.mapId,
    map: mapState.map,
    units: mapState.units,
    players: {
      P1: { id: 'P1', funds: 10000, vp: 0 },
      P2: { id: 'P2', funds: 10000, vp: 0 },
    },
    rngSeed: 1,
    actionLog: options.mapId
      ? [{ turn: 1, playerId: startPlayer, action: 'MAP_SELECTED', detail: options.mapId }]
      : [],
    winner: null,
    victoryReason: null,
    incomePerProperty: options.settings?.incomePerProperty ?? 1000,
    incomeAirport: options.settings?.incomeAirport ?? 1000,
    incomePort: options.settings?.incomePort ?? 1000,
    hpRecoveryCity: options.settings?.hpRecoveryCity ?? 1,
    hpRecoveryFactory: options.settings?.hpRecoveryFactory ?? 2,
    hpRecoveryHq: options.settings?.hpRecoveryHq ?? 3,
    maxSupplyCharges: options.settings?.maxSupplyCharges ?? 4,
    enableSuicideDrones: options.settings?.enableSuicideDrones ?? false,
    maxFactoryDronesPerFactory: options.settings?.maxFactoryDronesPerFactory ?? 3,
    droneInterceptionChancePercent: options.settings?.droneInterceptionChancePercent ?? 70,
    droneInterceptionMaxPerTurn: options.settings?.droneInterceptionMaxPerTurn ?? 2,
    droneAiProductionRatioLimitPercent: options.settings?.droneAiProductionRatioLimitPercent ?? 50,
    carrierCargoFuelRecoveryPercent: options.settings?.carrierCargoFuelRecoveryPercent ?? 50,
    carrierCargoAmmoRecoveryPercent: options.settings?.carrierCargoAmmoRecoveryPercent ?? 50,
    carrierCargoHpRecovery: options.settings?.carrierCargoHpRecovery ?? 1,
    carrierCargoHpRecoveryAtPort: options.settings?.carrierCargoHpRecoveryAtPort ?? 1,
    factoryProductionState: {},
  };

  return applyFeatureToggles(base, options.settings);
};