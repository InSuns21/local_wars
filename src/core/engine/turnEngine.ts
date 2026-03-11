import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { GameState } from '@core/types/state';
import type { PlayerId } from '@core/types/game';
import { toCoordKey } from '@/utils/coord';
import { getTileCaptureTarget } from '@core/rules/facilities';
import {
  getTurnEndFuelCost,
  isAirUnitType,
  isFuelDepletionFatalUnitType,
  isOperationalFacility,
  isSupplyChargeRefillTileForUnit,
  isSupplyTileForUnit,
} from '@core/rules/facilities';

const nextPlayer = (playerId: PlayerId): PlayerId => (playerId === 'P1' ? 'P2' : 'P1');

const getIncomeForTile = (state: GameState, terrainType: string): number => {
  if (terrainType === 'CITY' || terrainType === 'FACTORY' || terrainType === 'HQ') {
    return state.incomePerProperty ?? 1000;
  }
  if (terrainType === 'AIRPORT') {
    return state.incomeAirport ?? 1000;
  }
  if (terrainType === 'PORT') {
    return state.incomePort ?? 1000;
  }
  return 0;
};
const isCapturableProperty = (terrainType: string): boolean => terrainType === 'CITY' || terrainType === 'FACTORY' || terrainType === 'HQ' || terrainType === 'AIRPORT' || terrainType === 'PORT';

const getUnitRecoveryAmount = (state: GameState, terrainType: string): number => {
  if (terrainType === 'CITY') return Math.max(0, state.hpRecoveryCity ?? 1);
  if (terrainType === 'FACTORY') return Math.max(0, state.hpRecoveryFactory ?? 2);
  if (terrainType === 'HQ') return Math.max(0, state.hpRecoveryHq ?? 3);
  if (terrainType === 'AIRPORT') return Math.max(0, state.hpRecoveryFactory ?? 2);
  if (terrainType === 'PORT') return Math.max(0, state.hpRecoveryFactory ?? 2);
  return 0;
};

const recoverCarrierCargoUnit = (
  state: GameState,
  cargoUnit: GameState['units'][string],
  isDockedAtPort: boolean,
  enableFuelSupply: boolean,
  enableAmmoSupply: boolean,
): GameState['units'][string] => {
  const fuelPercent = Math.max(0, state.carrierCargoFuelRecoveryPercent ?? 50);
  const ammoPercent = Math.max(0, state.carrierCargoAmmoRecoveryPercent ?? 50);
  const hpRecovery = Math.max(
    0,
    isDockedAtPort ? (state.carrierCargoHpRecoveryAtPort ?? 1) : (state.carrierCargoHpRecovery ?? 1),
  );
  const definition = UNIT_DEFINITIONS[cargoUnit.type];
  const fuelRecovery = Math.max(1, Math.floor((definition.maxFuel * fuelPercent) / 100));
  const ammoRecovery = Math.max(1, Math.floor((definition.maxAmmo * ammoPercent) / 100));

  return {
    ...cargoUnit,
    fuel: enableFuelSupply ? Math.min(definition.maxFuel, cargoUnit.fuel + fuelRecovery) : cargoUnit.fuel,
    ammo: enableAmmoSupply ? Math.min(definition.maxAmmo, cargoUnit.ammo + ammoRecovery) : cargoUnit.ammo,
    hp: Math.min(10, cargoUnit.hp + hpRecovery),
  };
};

const recoverCarrierCargo = (
  state: GameState,
  units: Record<string, GameState['units'][string]>,
  enableFuelSupply: boolean,
  enableAmmoSupply: boolean,
): Record<string, GameState['units'][string]> =>
  Object.fromEntries(
    Object.entries(units).map(([id, unit]) => {
      if (unit.type !== 'CARRIER' || !unit.cargo || unit.cargo.length === 0) {
        return [id, unit];
      }

      const tile = state.map.tiles[toCoordKey(unit.position)];
      const isDockedAtPort = tile?.terrainType === 'PORT' && isOperationalFacility(tile) && tile.owner === unit.owner;
      return [
        id,
        {
          ...unit,
          cargo: unit.cargo.map((cargoUnit) => recoverCarrierCargoUnit(state, cargoUnit, isDockedAtPort, enableFuelSupply, enableAmmoSupply)),
        },
      ];
    }),
  );

const getPlayerIncome = (state: GameState, playerId: PlayerId): number =>
  Object.values(state.map.tiles)
    .filter((tile) => tile.owner === playerId && isOperationalFacility(tile))
    .reduce((total, tile) => total + getIncomeForTile(state, tile.terrainType), 0);

const recoverPropertyCapturePointsOnTurnEnd = (state: GameState, endedPlayerId: PlayerId): GameState['map']['tiles'] => {
  const enemyOccupiedCoords = new Set(
    Object.values(state.units)
      .filter((unit) => unit.hp > 0 && unit.owner !== endedPlayerId)
      .map((unit) => toCoordKey(unit.position)),
  );

  return Object.fromEntries(
    Object.entries(state.map.tiles).map(([key, tile]) => {
      if (!isCapturableProperty(tile.terrainType)) return [key, tile];
      if (tile.owner !== endedPlayerId) return [key, tile];
      if (enemyOccupiedCoords.has(key)) return [key, tile];

      const captureTarget = getTileCaptureTarget(tile);
      const current = tile.capturePoints ?? captureTarget;
      if (current >= captureTarget) return [key, tile];

      return [
        key,
        {
          ...tile,
          capturePoints: captureTarget,
        },
      ];
    }),
  );
};

const consumeTurnEndFuel = (
  state: GameState,
  endedPlayerId: PlayerId,
  enableFuelSupply: boolean,
  enableAmmoSupply: boolean,
): Record<string, typeof state.units[string]> => {
  const nextUnits: Record<string, typeof state.units[string]> = {};
  const maxSupplyCharges = state.maxSupplyCharges ?? 4;

  for (const [id, unit] of Object.entries(state.units)) {
    if (unit.owner !== endedPlayerId) {
      nextUnits[id] = { ...unit, interceptsUsedThisTurn: 0 };
      continue;
    }

    const tile = state.map.tiles[toCoordKey(unit.position)];
    const shouldRefillSupplyCharges = isSupplyChargeRefillTileForUnit(tile, unit);
    const fuelCost = getTurnEndFuelCost(unit.type);
    const canResupply = isSupplyTileForUnit(tile, unit);
    const consumedFuel = Math.max(0, unit.fuel - fuelCost);

    if (canResupply) {
      nextUnits[id] = {
        ...unit,
        interceptsUsedThisTurn: 0,
        fuel: enableFuelSupply ? UNIT_DEFINITIONS[unit.type].maxFuel : consumedFuel,
        ammo: enableAmmoSupply ? UNIT_DEFINITIONS[unit.type].maxAmmo : unit.ammo,
        hp: Math.min(10, unit.hp + getUnitRecoveryAmount(state, tile?.terrainType ?? 'PLAIN')),
        supplyCharges: shouldRefillSupplyCharges ? maxSupplyCharges : unit.supplyCharges,
      };
      continue;
    }

    if (fuelCost === 0) {
      nextUnits[id] = {
        ...unit,
        interceptsUsedThisTurn: 0,
        supplyCharges: shouldRefillSupplyCharges ? maxSupplyCharges : unit.supplyCharges,
      };
      continue;
    }

    if (isFuelDepletionFatalUnitType(unit.type) && consumedFuel <= 0) {
      continue;
    }

    nextUnits[id] = {
      ...unit,
      interceptsUsedThisTurn: 0,
      fuel: consumedFuel,
      supplyCharges: shouldRefillSupplyCharges ? maxSupplyCharges : unit.supplyCharges,
    };
  }

  return nextUnits;
};

export const nextTurnState = (state: GameState): GameState => {
  const endedPlayerId = state.currentPlayerId;
  const nextPlayerId = nextPlayer(endedPlayerId);
  const nextTurn = nextPlayerId === 'P1' ? state.turn + 1 : state.turn;

  const enableFuelSupply = state.enableFuelSupply ?? true;
  const enableAmmoSupply = state.enableAmmoSupply ?? true;
  const unitsAfterTurnEndFuel = consumeTurnEndFuel(state, endedPlayerId, enableFuelSupply, enableAmmoSupply);
  const unitsAfterCarrierRecovery = recoverCarrierCargo(state, unitsAfterTurnEndFuel, enableFuelSupply, enableAmmoSupply);

  const nextUnits = Object.fromEntries(
    Object.entries(unitsAfterCarrierRecovery).map(([id, unit]) => {
      if (unit.owner !== nextPlayerId) {
        return [id, unit];
      }

      const nextUnit = {
        ...unit,
        moved: false,
        acted: false,
        loadedThisTurn: false,
        unloadedThisTurn: false,
        interceptsUsedThisTurn: 0,
        movePointsRemaining: undefined,
        lastMovePath: [],
      };
      const tile = state.map.tiles[toCoordKey(unit.position)];
      const canResupply = isSupplyTileForUnit(tile, nextUnit);

      if (canResupply && enableFuelSupply) {
        nextUnit.fuel = UNIT_DEFINITIONS[nextUnit.type].maxFuel;
      }
      if (canResupply && enableAmmoSupply) {
        nextUnit.ammo = UNIT_DEFINITIONS[nextUnit.type].maxAmmo;
      }
      if (canResupply) {
        const recovery = getUnitRecoveryAmount(state, tile?.terrainType ?? 'PLAIN');
        nextUnit.hp = Math.min(10, nextUnit.hp + recovery);
      }

      return [id, nextUnit];
    }),
  );

  const income = getPlayerIncome(state, nextPlayerId);

  const nextPlayers = {
    P1: { ...state.players.P1 },
    P2: { ...state.players.P2 },
  };
  nextPlayers[nextPlayerId] = {
    ...nextPlayers[nextPlayerId],
    funds: nextPlayers[nextPlayerId].funds + income,
  };

  const recoveredTiles = recoverPropertyCapturePointsOnTurnEnd(state, endedPlayerId);
  const destroyedFuelDepletionUnits = Object.entries(state.units)
    .filter(([id, unit]) => unit.owner === endedPlayerId && isFuelDepletionFatalUnitType(unit.type) && !unitsAfterCarrierRecovery[id])
    .map(([id, unit]) => ({ id, type: unit.type }));

  return {
    ...state,
    currentPlayerId: nextPlayerId,
    turn: nextTurn,
    phase: 'command',
    map: {
      ...state.map,
      tiles: recoveredTiles,
    },
    units: nextUnits,
    players: nextPlayers,
    factoryProductionState: {},
    actionLog: destroyedFuelDepletionUnits.length > 0
      ? [
          ...state.actionLog,
          ...destroyedFuelDepletionUnits.map(({ id, type }) => ({
            turn: state.turn,
            playerId: endedPlayerId,
            action: isAirUnitType(type) ? 'AIR_FUEL_DEPLETION' : 'NAVAL_FUEL_DEPLETION',
            detail: `${id} は燃料切れで${type === 'SUBMARINE' ? '沈没' : '消滅'}`,
          })),
        ]
      : state.actionLog,
  };
};
