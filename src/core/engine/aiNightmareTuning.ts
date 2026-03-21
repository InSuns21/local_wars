import type { ResolvedAiProfile } from '@/app/types';

export type AiProfileWeightKey =
  | 'captureBias'
  | 'killBias'
  | 'safetyBias'
  | 'hqPressureBias'
  | 'artilleryBias'
  | 'antiAirBias'
  | 'droneBias'
  | 'stealthBias'
  | 'navalBias'
  | 'supplyBias'
  | 'scoutBias';

export type AiProfileWeights = Record<AiProfileWeightKey, number>;

export type NightmareProfileTuning = {
  profile: ResolvedAiProfile;
  multipliers: Partial<Record<AiProfileWeightKey, number>>;
};

export type NightmareTuningConfig = {
  version: 1;
  updatedAt: string;
  updatedBy: 'manual' | 'selfplay-autotune';
  note: string;
  profiles: NightmareProfileTuning[];
};

export const NIGHTMARE_TUNING_CONFIG: NightmareTuningConfig = {
  version: 1,
  updatedAt: '2026-03-22T00:00:00.000Z',
  updatedBy: 'manual',
  note: '初期値。Phase 3 の自己対戦 autotune ではこのファイルのみを書き換える。',
  profiles: [],
};

const DEFAULT_MULTIPLIER = 1;

export const getNightmareWeightMultipliers = (
  profile: ResolvedAiProfile,
): Partial<Record<AiProfileWeightKey, number>> =>
  NIGHTMARE_TUNING_CONFIG.profiles.find((entry) => entry.profile === profile)?.multipliers ?? {};

export const applyNightmareWeightMultipliers = (
  baseWeights: AiProfileWeights,
  profile: ResolvedAiProfile,
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare',
): AiProfileWeights => {
  if (difficulty !== 'nightmare') {
    return baseWeights;
  }

  const multipliers = getNightmareWeightMultipliers(profile);
  return {
    captureBias: baseWeights.captureBias * (multipliers.captureBias ?? DEFAULT_MULTIPLIER),
    killBias: baseWeights.killBias * (multipliers.killBias ?? DEFAULT_MULTIPLIER),
    safetyBias: baseWeights.safetyBias * (multipliers.safetyBias ?? DEFAULT_MULTIPLIER),
    hqPressureBias: baseWeights.hqPressureBias * (multipliers.hqPressureBias ?? DEFAULT_MULTIPLIER),
    artilleryBias: baseWeights.artilleryBias * (multipliers.artilleryBias ?? DEFAULT_MULTIPLIER),
    antiAirBias: baseWeights.antiAirBias * (multipliers.antiAirBias ?? DEFAULT_MULTIPLIER),
    droneBias: baseWeights.droneBias * (multipliers.droneBias ?? DEFAULT_MULTIPLIER),
    stealthBias: baseWeights.stealthBias * (multipliers.stealthBias ?? DEFAULT_MULTIPLIER),
    navalBias: baseWeights.navalBias * (multipliers.navalBias ?? DEFAULT_MULTIPLIER),
    supplyBias: baseWeights.supplyBias * (multipliers.supplyBias ?? DEFAULT_MULTIPLIER),
    scoutBias: baseWeights.scoutBias * (multipliers.scoutBias ?? DEFAULT_MULTIPLIER),
  };
};
