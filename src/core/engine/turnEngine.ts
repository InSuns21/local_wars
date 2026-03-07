import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { GameState } from '@core/types/state';
import type { PlayerId } from '@core/types/game';
import { toCoordKey } from '@/utils/coord';
import { getTileCaptureTarget } from '@core/rules/facilities';
import { getTurnEndFuelCost, isAirUnitType, isOperationalFacility, isSupplyTileForUnit } from '@core/rules/facilities';

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
  return 0;
};

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

  for (const [id, unit] of Object.entries(state.units)) {
    if (unit.owner !== endedPlayerId || !isAirUnitType(unit.type)) {
      nextUnits[id] = unit;
      continue;
    }

    const fuelCost = getTurnEndFuelCost(unit.type);
    const consumedFuel = Math.max(0, unit.fuel - fuelCost);
    const tile = state.map.tiles[toCoordKey(unit.position)];
    const canResupply = isSupplyTileForUnit(tile, unit);

    if (canResupply) {
      nextUnits[id] = {
        ...unit,
        fuel: enableFuelSupply ? UNIT_DEFINITIONS[unit.type].maxFuel : consumedFuel,
        ammo: enableAmmoSupply ? UNIT_DEFINITIONS[unit.type].maxAmmo : unit.ammo,
        hp: Math.min(10, unit.hp + getUnitRecoveryAmount(state, tile?.terrainType ?? 'PLAIN')),
      };
      continue;
    }

    if (consumedFuel <= 0) {
      continue;
    }

    nextUnits[id] = { ...unit, fuel: consumedFuel };
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

  const nextUnits = Object.fromEntries(
    Object.entries(unitsAfterTurnEndFuel).map(([id, unit]) => {
      if (unit.owner !== nextPlayerId) {
        return [id, unit];
      }

      const nextUnit = { ...unit, moved: false, acted: false, movePointsRemaining: undefined, lastMovePath: [] };
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
  const destroyedAirIds = Object.keys(state.units).filter(
    (id) => state.units[id].owner === endedPlayerId && isAirUnitType(state.units[id].type) && !unitsAfterTurnEndFuel[id],
  );

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
    actionLog: destroyedAirIds.length > 0
      ? [
          ...state.actionLog,
          ...destroyedAirIds.map((unitId) => ({
            turn: state.turn,
            playerId: endedPlayerId,
            action: 'AIR_FUEL_DEPLETION',
            detail: `${unitId} は燃料切れで消滅`,
          })),
        ]
      : state.actionLog,
  };
};
