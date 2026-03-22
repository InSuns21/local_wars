import type { ResolvedAiProfile } from '@/app/types';
import { captainStrategy } from './captainStrategy';
import { hunterStrategy } from './hunterStrategy';
import { siegerStrategy } from './siegerStrategy';
import { turtleStrategy } from './turtleStrategy';
import type { AiStrategy } from './types';

const strategyMap: Partial<Record<ResolvedAiProfile, AiStrategy>> = {
  captain: captainStrategy,
  hunter: hunterStrategy,
  sieger: siegerStrategy,
  turtle: turtleStrategy,
};

const fallbackStrategy: AiStrategy = {
  profile: 'balanced',
};

export const getAiStrategy = (profile: ResolvedAiProfile): AiStrategy =>
  strategyMap[profile] ?? fallbackStrategy;

export type {
  AiOperationalObjective,
  AiOperationalPlanSnapshot,
  AiStrategy,
  AiStrategyMoveContext,
  AiStrategyPlanContext,
  AiStrategyProductionContext,
} from './types';
