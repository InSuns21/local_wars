import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { BattleScreen } from '@/screens/BattleScreen';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import type { GameState } from '@core/types/state';
import { createGameStore } from '@store/gameStore';

type RenderBattleScreenOptions = {
  mutateState?: (state: GameState) => void;
  rng?: () => number;
  props?: React.ComponentProps<typeof BattleScreen>;
};

const BASE_GAME_STATE = createInitialGameState();

const cloneGameState = (): GameState => JSON.parse(JSON.stringify(BASE_GAME_STATE)) as GameState;

export const createBattleState = (mutateState?: (state: GameState) => void): GameState => {
  const state = cloneGameState();
  mutateState?.(state);
  return state;
};

export const renderBattleScreen = (
  options: RenderBattleScreenOptions = {},
): RenderResult & { store: ReturnType<typeof createGameStore> } => {
  const state = createBattleState(options.mutateState);
  const store = createGameStore(state, { rng: options.rng ?? (() => 0.5) });
  const result = render(<BattleScreen useStore={store} {...options.props} />);
  return { ...result, store };
};
