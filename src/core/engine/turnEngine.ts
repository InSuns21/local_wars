import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { GameState } from '@core/types/state';
import type { PlayerId } from '@core/types/game';
import { toCoordKey } from '@/utils/coord';

const CAPTURE_TARGET = 20;

const nextPlayer = (playerId: PlayerId): PlayerId => (playerId === 'P1' ? 'P2' : 'P1');

const isIncomeProperty = (terrainType: string): boolean => terrainType === 'FACTORY' || terrainType === 'HQ';

const isSupplyProperty = (terrainType: string): boolean =>
  terrainType === 'CITY' || terrainType === 'FACTORY' || terrainType === 'HQ';

const isCapturableProperty = (terrainType: string): boolean =>
  terrainType === 'CITY' || terrainType === 'FACTORY' || terrainType === 'HQ';

const getUnitRecoveryAmount = (state: GameState, terrainType: string): number => {
  if (terrainType === 'CITY') return Math.max(0, state.hpRecoveryCity ?? 1);
  if (terrainType === 'FACTORY') return Math.max(0, state.hpRecoveryFactory ?? 2);
  if (terrainType === 'HQ') return Math.max(0, state.hpRecoveryHq ?? 3);
  return 0;
};

const countOwnedIncomeProperties = (state: GameState, playerId: PlayerId): number =>
  Object.values(state.map.tiles).filter(
    (tile) => tile.owner === playerId && isIncomeProperty(tile.terrainType),
  ).length;

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

      const current = tile.capturePoints ?? CAPTURE_TARGET;
      if (current >= CAPTURE_TARGET) return [key, tile];

      return [
        key,
        {
          ...tile,
          capturePoints: CAPTURE_TARGET,
        },
      ];
    }),
  );
};

export const nextTurnState = (state: GameState): GameState => {
  const endedPlayerId = state.currentPlayerId;
  const nextPlayerId = nextPlayer(endedPlayerId);
  const nextTurn = nextPlayerId === 'P1' ? state.turn + 1 : state.turn;

  const enableFuelSupply = state.enableFuelSupply ?? true;
  const enableAmmoSupply = state.enableAmmoSupply ?? true;

  const nextUnits = Object.fromEntries(
    Object.entries(state.units).map(([id, unit]) => {
      if (unit.owner !== nextPlayerId) {
        return [id, unit];
      }

      const nextUnit = { ...unit, moved: false, acted: false, movePointsRemaining: undefined, lastMovePath: [] };
      const tile = state.map.tiles[toCoordKey(unit.position)];
      const canResupply = tile && tile.owner === nextPlayerId && isSupplyProperty(tile.terrainType);

      if (canResupply && enableFuelSupply) {
        nextUnit.fuel = UNIT_DEFINITIONS[nextUnit.type].maxFuel;
      }
      if (canResupply && enableAmmoSupply) {
        nextUnit.ammo = UNIT_DEFINITIONS[nextUnit.type].maxAmmo;
      }
      if (canResupply) {
        const recovery = getUnitRecoveryAmount(state, tile.terrainType);
        nextUnit.hp = Math.min(10, nextUnit.hp + recovery);
      }

      return [id, nextUnit];
    }),
  );

  const incomePerProperty = state.incomePerProperty ?? 1000;
  const incomeProperties = countOwnedIncomeProperties(state, nextPlayerId);
  const income = incomeProperties * incomePerProperty;

  const nextPlayers = {
    P1: { ...state.players.P1 },
    P2: { ...state.players.P2 },
  };
  nextPlayers[nextPlayerId] = {
    ...nextPlayers[nextPlayerId],
    funds: nextPlayers[nextPlayerId].funds + income,
  };

  const recoveredTiles = recoverPropertyCapturePointsOnTurnEnd(state, endedPlayerId);

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
  };
};
