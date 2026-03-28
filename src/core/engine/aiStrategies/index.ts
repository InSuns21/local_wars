import type { ResolvedAiProfile } from '@/app/types';
import { captainStrategy } from './captainStrategy';
import { droneSwarmStrategy } from './droneSwarmStrategy';
import { hunterStrategy } from './hunterStrategy';
import { siegerStrategy } from './siegerStrategy';
import { stealthStrikeStrategy } from './stealthStrikeStrategy';
import { turtleStrategy } from './turtleStrategy';
import type { AiStrategy } from './types';

const strategyMap: Partial<Record<ResolvedAiProfile, AiStrategy>> = {
  captain: captainStrategy,
  drone_swarm: droneSwarmStrategy,
  hunter: hunterStrategy,
  sieger: siegerStrategy,
  stealth_strike: stealthStrikeStrategy,
  turtle: turtleStrategy,
};

const fallbackStrategy: AiStrategy = {
  profile: 'balanced',
};

export const getAiStrategy = (profile: ResolvedAiProfile): AiStrategy =>
  strategyMap[profile] ?? fallbackStrategy;

export type {
  AiStrategyAirportProductionContext,
  AiStrategyDroneProductionContext,
  AiOperationalObjective,
  AiOperationalPlanSnapshot,
  AiStrategy,
  AiStrategyMoveContext,
  AiStrategyNavalProductionContext,
  AiStrategyPlanContext,
  AiStrategyProductionContext,
} from './types';
