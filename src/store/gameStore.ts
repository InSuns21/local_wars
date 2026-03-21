import { create } from 'zustand';
import { applyCommand } from '@core/engine/commandApplier';
import { runAiTurnWithPlayback } from '@core/engine/aiTurn';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { canCounterAttack, forecastCombat } from '@core/rules/combat';
import { getTerrainDefenseModifier } from '@core/rules/terrainDefense';
import { findPreferredMovePath, getEnemyUnits, getReachableTiles } from '@core/rules/movement';
import type { VisibleAiPlaybackEvent } from '@core/types/aiPlayback';
import type { CombatForecast } from '@core/types/combat';
import type { Coord } from '@core/types/game';
import type { CommandResult, GameCommand, GameState } from '@core/types/state';
import { manhattanDistance, toCoordKey } from '@/utils/coord';

export type AiPlaybackStatus = 'idle' | 'running';

export type GameStoreState = {
  gameState: GameState;
  history: GameState[];
  selectedUnitId: string | null;
  selectedTile: Coord | null;
  previousSelectedPath: Coord[] | null;
  aiPlaybackStatus: AiPlaybackStatus;
  aiPlaybackEvents: VisibleAiPlaybackEvent[];
  aiPlaybackIndex: number;
  pendingAiFinalState: GameState | null;
  currentAiPlaybackEvent: VisibleAiPlaybackEvent | null;
  dispatchCommand: (command: GameCommand) => CommandResult;
  getMoveRange: (unitId: string) => Coord[];
  getAttackRange: (unitId: string) => Coord[];
  buildMovePath: (unitId: string, to: Coord) => Coord[] | null;
  simulateCombat: (attackerId: string, defenderId: string, attackerPosition?: Coord) => CombatForecast | null;
  selectUnit: (unitId: string | null) => void;
  selectTile: (coord: Coord | null) => void;
  endTurn: () => CommandResult;
  undo: () => CommandResult;
  setGameState: (state: GameState) => void;
  stepAiPlayback: () => void;
  skipAiPlayback: () => void;
};

export type CreateStoreOptions = {
  rng?: () => number;
};

const getDefenseModifier = (state: GameState, unit: GameState['units'][string]): number => {
  const tile = state.map.tiles[toCoordKey(unit.position)];
  return getTerrainDefenseModifier(tile?.terrainType, unit.type);
};

const cloneState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

const idlePlaybackState = () => ({
  aiPlaybackStatus: 'idle' as const,
  aiPlaybackEvents: [],
  aiPlaybackIndex: -1,
  pendingAiFinalState: null,
  currentAiPlaybackEvent: null,
});

export const createGameStore = (initialState: GameState, options: CreateStoreOptions = {}) =>
  create<GameStoreState>((set, get) => ({
    gameState: cloneState(initialState),
    history: [],
    selectedUnitId: null,
    selectedTile: null,
    previousSelectedPath: null,
    ...idlePlaybackState(),
    dispatchCommand: (command) => {
      if (get().aiPlaybackStatus === 'running') {
        return { ok: false, reason: '�G�R�s���̍Đ����ł��B' };
      }

      if (command.type === 'UNDO') {
        return get().undo();
      }

      const current = get().gameState;
      const deps = { rng: options.rng ?? Math.random };
      const { state, result } = applyCommand(current, command, deps);
      if (!result.ok) {
        return result;
      }

      let nextState = state;

      if (command.type === 'END_TURN') {
        const humanSide = current.humanPlayerSide ?? 'P1';
        const aiDifficulty = current.aiDifficulty ?? 'normal';
        let guard = 0;
        let finalState = state;
        const playbackEvents: VisibleAiPlaybackEvent[] = [];

        while (!finalState.winner && finalState.currentPlayerId !== humanSide && guard < 8) {
          const aiResult = runAiTurnWithPlayback(finalState, { difficulty: aiDifficulty, deps });
          finalState = aiResult.finalState;
          playbackEvents.push(...aiResult.playbackEvents);
          guard += 1;
        }

        if (playbackEvents.length > 0) {
          const firstEvent = playbackEvents[0];
          set((prev) => ({
            gameState: cloneState(firstEvent.displayState),
            history: [...prev.history, cloneState(current)],
            selectedUnitId: null,
            selectedTile: null,
            previousSelectedPath: null,
            aiPlaybackStatus: 'running',
            aiPlaybackEvents: playbackEvents,
            aiPlaybackIndex: 0,
            pendingAiFinalState: cloneState(finalState),
            currentAiPlaybackEvent: firstEvent,
          }));
          return result;
        }

        nextState = finalState;
      }

      set((prev) => ({
        gameState: cloneState(nextState),
        history: [...prev.history, cloneState(current)],
        selectedUnitId: command.type === 'END_TURN' ? null : prev.selectedUnitId,
        selectedTile: command.type === 'END_TURN' ? null : prev.selectedTile,
        previousSelectedPath: command.type === 'END_TURN' ? null : prev.previousSelectedPath,
        ...idlePlaybackState(),
      }));

      return result;
    },
    getMoveRange: (unitId) => {
      const state = get().gameState;
      const unit = state.units[unitId];
      if (!unit) return [];

      const enemyUnits = getEnemyUnits(state.units, unit.owner);
      return getReachableTiles({
        map: state.map,
        unit,
        enemyUnits,
        maxMove: (state.enableFuelSupply ?? true) ? Math.min(UNIT_DEFINITIONS[unit.type].moveRange, unit.fuel) : UNIT_DEFINITIONS[unit.type].moveRange,
      });
    },
    getAttackRange: (unitId) => {
      const state = get().gameState;
      const unit = state.units[unitId];
      if (!unit) return [];

      const def = UNIT_DEFINITIONS[unit.type];
      const coords: Coord[] = [];

      for (let y = 0; y < state.map.height; y += 1) {
        for (let x = 0; x < state.map.width; x += 1) {
          const distance = manhattanDistance(unit.position, { x, y });
          if (distance >= def.attackRangeMin && distance <= def.attackRangeMax) {
            coords.push({ x, y });
          }
        }
      }

      return coords;
    },
    buildMovePath: (unitId, to) => {
      const state = get().gameState;
      const unit = state.units[unitId];
      if (!unit) return null;

      const enemyUnits = getEnemyUnits(state.units, unit.owner);
      return findPreferredMovePath(
        {
          map: state.map,
          unit,
          enemyUnits,
          maxMove: (state.enableFuelSupply ?? true) ? Math.min(UNIT_DEFINITIONS[unit.type].moveRange, unit.fuel) : UNIT_DEFINITIONS[unit.type].moveRange,
        },
        to,
        get().previousSelectedPath,
      );
    },
    simulateCombat: (attackerId, defenderId, attackerPosition) => {
      const state = get().gameState;
      const attacker = state.units[attackerId];
      const defender = state.units[defenderId];
      if (!attacker || !defender) return null;

      const projectedAttacker = attackerPosition
        ? { ...attacker, position: { ...attackerPosition } }
        : attacker;

      const canCounter = (state.enableAmmoSupply ?? true)
        ? projectedAttacker.ammo > 0 && defender.ammo > 0 && canCounterAttack(projectedAttacker, defender)
        : canCounterAttack(projectedAttacker, defender);

      return forecastCombat(projectedAttacker, defender, {
        canCounter,
        defenderDefenseModifier: getDefenseModifier(state, defender),
        attackerDefenseModifier: getDefenseModifier(state, projectedAttacker),
      });
    },
    selectUnit: (unitId) => set({ selectedUnitId: unitId, selectedTile: null, previousSelectedPath: null }),
    selectTile: (coord) => {
      const state = get();
      const previousPath =
        coord
        && state.selectedTile
        && state.selectedUnitId
        && (coord.x !== state.selectedTile.x || coord.y !== state.selectedTile.y)
          ? state.buildMovePath(state.selectedUnitId, state.selectedTile)
          : state.previousSelectedPath;
      set({ selectedTile: coord, previousSelectedPath: previousPath });
    },
    endTurn: () => get().dispatchCommand({ type: 'END_TURN' }),
    undo: () => {
      if (get().aiPlaybackStatus === 'running') {
        return { ok: false, reason: '�G�R�s���̍Đ����͎������܂���B' };
      }

      const history = get().history;
      if (history.length === 0) {
        return { ok: false, reason: '����ȏ�߂��܂���B' };
      }

      const prevState = history[history.length - 1];
      set({
        gameState: cloneState(prevState),
        history: history.slice(0, -1),
        selectedUnitId: null,
        selectedTile: null,
        previousSelectedPath: null,
        ...idlePlaybackState(),
      });

      return { ok: true };
    },
    setGameState: (state) => set({
      gameState: cloneState(state),
      history: [],
      selectedUnitId: null,
      selectedTile: null,
      previousSelectedPath: null,
      ...idlePlaybackState(),
    }),
    stepAiPlayback: () => {
      const current = get();
      if (current.aiPlaybackStatus !== 'running') {
        return;
      }

      const nextIndex = current.aiPlaybackIndex + 1;
      if (nextIndex >= current.aiPlaybackEvents.length) {
        set({
          gameState: cloneState(current.pendingAiFinalState ?? current.gameState),
          selectedUnitId: null,
          selectedTile: null,
          previousSelectedPath: null,
          ...idlePlaybackState(),
        });
        return;
      }

      const nextEvent = current.aiPlaybackEvents[nextIndex];
      set({
        gameState: cloneState(nextEvent.displayState),
        selectedUnitId: null,
        selectedTile: null,
        previousSelectedPath: null,
        aiPlaybackStatus: 'running',
        aiPlaybackEvents: current.aiPlaybackEvents,
        aiPlaybackIndex: nextIndex,
        pendingAiFinalState: current.pendingAiFinalState,
        currentAiPlaybackEvent: nextEvent,
      });
    },
    skipAiPlayback: () => {
      const current = get();
      if (current.aiPlaybackStatus !== 'running') {
        return;
      }

      set({
        gameState: cloneState(current.pendingAiFinalState ?? current.gameState),
        selectedUnitId: null,
        selectedTile: null,
        previousSelectedPath: null,
        ...idlePlaybackState(),
      });
    },
  }));
