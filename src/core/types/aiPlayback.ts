import type { Coord } from '@core/types/game';
import type { GameState } from '@core/types/state';

export type VisibleAiPlaybackEventType = 'attack' | 'damage_report' | 'capture' | 'property_changed';

export type VisibleAiPlaybackEvent = {
  type: VisibleAiPlaybackEventType;
  summary: string;
  displayState: GameState;
  focusCoord?: Coord;
  unitId?: string;
  durationMs?: number;
};

export type AiTurnResult = {
  finalState: GameState;
  playbackEvents: VisibleAiPlaybackEvent[];
};
