import type { AiOperationalObjective } from '@core/engine/aiTurn';
import type { Coord } from '@core/types/game';
import type { GameState } from '@core/types/state';

export type VisibleAiPlaybackEventType = 'move' | 'attack' | 'damage_report' | 'capture' | 'property_changed' | 'spotted';

export type VisibleAiPlaybackEvent = {
  type: VisibleAiPlaybackEventType;
  summary: string;
  displayState: GameState;
  focusCoord?: Coord;
  unitId?: string;
  durationMs?: number;
};

export type AiTurnSummaryItem = {
  message: string;
  focusCoord?: Coord;
};

export type AiTurnResult = {
  finalState: GameState;
  playbackEvents: VisibleAiPlaybackEvent[];
  turnStartSummary: AiTurnSummaryItem[];
  operationalObjective?: AiOperationalObjective;
};
