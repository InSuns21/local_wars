import type { GameState } from '@core/types/state';
import { toCoordKey } from '@/utils/coord';

export type VictoryReason = 'HQ_CAPTURE' | 'ANNIHILATION' | 'VP_LIMIT' | null;

export type VictoryResult = {
  winner: 'P1' | 'P2' | null;
  reason: VictoryReason;
};

export type VictoryOptions = {
  vpLimit?: number;
};

const hasAliveUnits = (state: GameState, playerId: 'P1' | 'P2'): boolean =>
  Object.values(state.units).some((u) => u.owner === playerId && u.hp > 0);

const resolveMainHqByPlayer = (state: GameState) => {
  const fromMeta = state.map.commandHqByPlayer;
  if (fromMeta?.P1 && fromMeta?.P2) {
    return {
      p1: fromMeta.P1,
      p2: fromMeta.P2,
    };
  }

  const hqs = Object.values(state.map.tiles)
    .filter((tile) => tile.terrainType === 'HQ')
    .sort((a, b) => a.coord.x - b.coord.x);

  if (hqs.length < 2) {
    return { p1: null, p2: null };
  }

  return {
    p1: hqs[0].coord,
    p2: hqs[hqs.length - 1].coord,
  };
};

export const checkVictory = (state: GameState, options: VictoryOptions = {}): VictoryResult => {
  const mainHq = resolveMainHqByPlayer(state);

  if (mainHq.p1) {
    const p1HqTile = state.map.tiles[toCoordKey(mainHq.p1)];
    if (p1HqTile?.owner === 'P2') return { winner: 'P2', reason: 'HQ_CAPTURE' };
  }

  if (mainHq.p2) {
    const p2HqTile = state.map.tiles[toCoordKey(mainHq.p2)];
    if (p2HqTile?.owner === 'P1') return { winner: 'P1', reason: 'HQ_CAPTURE' };
  }

  const p1Alive = hasAliveUnits(state, 'P1');
  const p2Alive = hasAliveUnits(state, 'P2');
  if (!p1Alive && p2Alive) return { winner: 'P2', reason: 'ANNIHILATION' };
  if (!p2Alive && p1Alive) return { winner: 'P1', reason: 'ANNIHILATION' };

  if (options.vpLimit !== undefined) {
    if (state.players.P1.vp >= options.vpLimit) return { winner: 'P1', reason: 'VP_LIMIT' };
    if (state.players.P2.vp >= options.vpLimit) return { winner: 'P2', reason: 'VP_LIMIT' };
  }

  return { winner: null, reason: null };
};
