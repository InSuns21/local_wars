import type { ResolvedAiProfile } from '@/app/types';
import {
  NIGHTMARE_TUNING_CONFIG,
  type AiProfileWeightKey,
  type NightmareProfileTuning,
  type NightmareTuningConfig,
} from '@core/engine/aiNightmareTuning';
import type {
  SelfPlayComparisonReport,
  SelfPlayImprovementProposal,
  SelfPlayParticipantId,
  SelfPlaySeriesReport,
} from '@core/analysis/selfPlay';

type WeightAdjustments = Partial<Record<AiProfileWeightKey, number>>;

export type NightmareAutotuneDecision = {
  participantId: SelfPlayParticipantId;
  label: string;
  selectedProfile: string;
  targetProfile: ResolvedAiProfile;
  reasons: string[];
  adjustments: WeightAdjustments;
};

export type NightmareAutotunePlan = {
  generatedAt: string;
  basedOnGeneratedAt: string;
  comparisonGeneratedAt?: string;
  decisions: NightmareAutotuneDecision[];
  nextConfig: NightmareTuningConfig;
};

const WEIGHT_KEYS: AiProfileWeightKey[] = [
  'captureBias',
  'killBias',
  'safetyBias',
  'hqPressureBias',
  'artilleryBias',
  'antiAirBias',
  'droneBias',
  'stealthBias',
  'navalBias',
  'supplyBias',
  'scoutBias',
];

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const round = (value: number, digits = 3): number => {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
};

const isResolvedProfile = (value: string): value is ResolvedAiProfile =>
  ['balanced', 'captain', 'hunter', 'turtle', 'sieger', 'drone_swarm', 'stealth_strike'].includes(value);

const detectTargetProfile = (
  report: SelfPlaySeriesReport,
  participantId: SelfPlayParticipantId,
): ResolvedAiProfile | null => {
  const participant = report.config.participants[participantId];
  if (isResolvedProfile(participant.selectedAiProfile)) {
    return participant.selectedAiProfile;
  }
  const dominant = report.aggregate.participants[participantId].resolvedProfileBreakdown[0]?.profile;
  return dominant && isResolvedProfile(dominant) ? dominant : null;
};

const addAdjustment = (
  adjustments: WeightAdjustments,
  key: AiProfileWeightKey,
  delta: number,
): void => {
  adjustments[key] = round((adjustments[key] ?? 1) + delta);
};

const hasSevereStall = (report: SelfPlaySeriesReport, participantId: SelfPlayParticipantId): boolean => {
  const aggregate = report.aggregate.participants[participantId];
  return aggregate.stallMatchRate >= 0.5
    || aggregate.averageInactiveTurnRate >= 0.4
    || (report.aggregate.turnLimitRate >= 0.8
      && aggregate.averagePropertyCaptures < 1
      && aggregate.averageProductionCount < 1);
};

const buildDecision = (
  report: SelfPlaySeriesReport,
  comparison: SelfPlayComparisonReport | undefined,
  proposal: SelfPlayImprovementProposal | undefined,
  participantId: SelfPlayParticipantId,
): NightmareAutotuneDecision | null => {
  const config = report.config.participants[participantId];
  if (config.difficulty !== 'nightmare') {
    return null;
  }

  const targetProfile = detectTargetProfile(report, participantId);
  if (!targetProfile) {
    return null;
  }

  if (hasSevereStall(report, participantId)) {
    return {
      participantId,
      label: config.label,
      selectedProfile: config.selectedAiProfile,
      targetProfile,
      reasons: [
        'stall detector が強い停滞を検出したため、重み調整より先に自己対戦の停止要因を解消します。',
        `停滞率 ${round(report.aggregate.participants[participantId].averageInactiveTurnRate * 100, 1)}% / stall試合率 ${round(report.aggregate.participants[participantId].stallMatchRate * 100, 1)}%`,
      ],
      adjustments: {},
    };
  }

  const aggregate = report.aggregate.participants[participantId];
  const delta = comparison?.participants[participantId];
  const proposalTarget = proposal?.targets.find((item) => item.participantId === participantId);
  const adjustments: WeightAdjustments = {};
  const reasons: string[] = [];

  if (aggregate.winRate < 0.5) {
    addAdjustment(adjustments, 'killBias', 0.08);
    addAdjustment(adjustments, 'hqPressureBias', 0.05);
    reasons.push(`勝率 ${round(aggregate.winRate * 100, 1)}% が低いため、決定力を少し上げます。`);
  }

  if (aggregate.averageHighValueTradeBalance < 0) {
    addAdjustment(adjustments, 'safetyBias', 0.08);
    addAdjustment(adjustments, 'killBias', -0.04);
    reasons.push('高額ユニット収支がマイナスのため、安全性を上げて不利交換を抑えます。');
  }

  if (aggregate.averageLowSupplyUnitCount > 0.5) {
    addAdjustment(adjustments, 'supplyBias', 0.1);
    reasons.push('低補給残存が多いため、補給と帰投の重みを上げます。');
  }

  if (report.config.fogOfWar && aggregate.scoutSurvivalRate < 0.5) {
    addAdjustment(adjustments, 'scoutBias', 0.12);
    addAdjustment(adjustments, 'safetyBias', 0.05);
    reasons.push('FoW で偵察生存率が低いため、索敵と安全重視を強めます。');
  }

  if (aggregate.responseRates.antiAir.opportunityCount > 0 && aggregate.responseRates.antiAir.rate < 0.7) {
    addAdjustment(adjustments, 'antiAirBias', 0.12);
    reasons.push('対空応答率が低いため、対空重みを強化します。');
  }

  if (aggregate.responseRates.antiDrone.opportunityCount > 0 && aggregate.responseRates.antiDrone.rate < 0.7) {
    addAdjustment(adjustments, 'antiAirBias', 0.08);
    addAdjustment(adjustments, 'droneBias', 0.08);
    reasons.push('対ドローン応答率が低いため、対ドローン迎撃とドローン戦対応を強化します。');
  }

  if (aggregate.responseRates.antiSub.opportunityCount > 0 && aggregate.responseRates.antiSub.rate < 0.7) {
    addAdjustment(adjustments, 'navalBias', 0.12);
    reasons.push('対潜応答率が低いため、海戦対応の重みを上げます。');
  }

  if (aggregate.mapWinRateSpread > 0.18 || aggregate.sideWinRateGap > 0.12) {
    addAdjustment(adjustments, 'safetyBias', 0.05);
    addAdjustment(adjustments, 'captureBias', 0.04);
    reasons.push('マップ差または先後差が大きいため、安定化のための安全性と施設志向を少し上げます。');
  }

  if ((report.aggregate.turnLimitRate > 0.25 && aggregate.averagePropertyCaptures < 1) || aggregate.winRate < 0.45) {
    addAdjustment(adjustments, 'captureBias', 0.06);
    addAdjustment(adjustments, 'hqPressureBias', 0.06);
    reasons.push('決着力不足を補うため、占領圧と HQ 圧力を強めます。');
  }

  if (delta && delta.winRateDelta < -0.05) {
    addAdjustment(adjustments, 'safetyBias', 0.05);
    reasons.push('比較対象から勝率が悪化しているため、回帰抑制として安全側へ寄せます。');
  }

  if (proposalTarget && proposalTarget.recommendations.some((text) => text.includes('補給'))) {
    addAdjustment(adjustments, 'supplyBias', 0.05);
  }
  if (proposalTarget && proposalTarget.recommendations.some((text) => text.includes('偵察'))) {
    addAdjustment(adjustments, 'scoutBias', 0.05);
  }
  if (proposalTarget && proposalTarget.recommendations.some((text) => text.includes('対潜'))) {
    addAdjustment(adjustments, 'navalBias', 0.05);
  }

  for (const key of WEIGHT_KEYS) {
    if (adjustments[key] == null) continue;
    adjustments[key] = clamp(adjustments[key] ?? 1, 0.8, 1.25);
  }

  if (Object.keys(adjustments).length === 0) {
    return null;
  }

  return {
    participantId,
    label: config.label,
    selectedProfile: config.selectedAiProfile,
    targetProfile,
    reasons,
    adjustments,
  };
};

const mergeTuningProfiles = (
  currentConfig: NightmareTuningConfig,
  decisions: NightmareAutotuneDecision[],
): NightmareTuningConfig => {
  const merged = new Map<ResolvedAiProfile, NightmareProfileTuning>(
    currentConfig.profiles.map((entry) => [entry.profile, { ...entry, multipliers: { ...entry.multipliers } }]),
  );

  for (const decision of decisions) {
    const existing = merged.get(decision.targetProfile) ?? { profile: decision.targetProfile, multipliers: {} };
    const nextMultipliers = { ...existing.multipliers };
    for (const key of WEIGHT_KEYS) {
      if (decision.adjustments[key] == null) continue;
      const previous = nextMultipliers[key] ?? 1;
      nextMultipliers[key] = clamp(round(previous * (decision.adjustments[key] ?? 1), 3), 0.7, 1.5);
    }
    merged.set(decision.targetProfile, {
      profile: decision.targetProfile,
      multipliers: nextMultipliers,
    });
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'selfplay-autotune',
    note: '自己対戦 Phase 3 の限定自動改修で更新。',
    profiles: Array.from(merged.values()).sort((a, b) => a.profile.localeCompare(b.profile)),
  };
};

export const buildNightmareAutotunePlan = (
  report: SelfPlaySeriesReport,
  comparison?: SelfPlayComparisonReport,
  proposal?: SelfPlayImprovementProposal,
  currentConfig: NightmareTuningConfig = NIGHTMARE_TUNING_CONFIG,
): NightmareAutotunePlan => {
  const decisions = (['left', 'right'] as const)
    .map((participantId) => buildDecision(report, comparison, proposal, participantId))
    .filter((value): value is NightmareAutotuneDecision => value != null);

  return {
    generatedAt: new Date().toISOString(),
    basedOnGeneratedAt: report.generatedAt,
    comparisonGeneratedAt: comparison?.generatedAt,
    decisions,
    nextConfig: mergeTuningProfiles(currentConfig, decisions),
  };
};

const renderAdjustments = (adjustments: WeightAdjustments): string =>
  WEIGHT_KEYS
    .filter((key) => adjustments[key] != null)
    .map((key) => `${key}x${adjustments[key]}`)
    .join(', ') || '調整保留';

export const renderNightmareAutotuneMarkdown = (plan: NightmareAutotunePlan): string => [
  '# nightmare autotune 提案',
  '',
  `生成日時: ${plan.generatedAt}`,
  `- 対象レポート: ${plan.basedOnGeneratedAt}`,
  ...(plan.comparisonGeneratedAt ? [`- 差分参照: ${plan.comparisonGeneratedAt}`] : []),
  '',
  ...(plan.decisions.length === 0
    ? ['- 今回は自動改修対象の nightmare 参加者が見つからなかったか、調整が不要でした。']
    : plan.decisions.flatMap((decision) => [
      `## ${decision.label}`,
      `- 対象プロファイル: ${decision.targetProfile}`,
      `- 調整内容: ${renderAdjustments(decision.adjustments)}`,
      ...decision.reasons.map((reason) => `- ${reason}`),
      '',
    ])),
  '## 次設定',
  ...plan.nextConfig.profiles.map((entry) =>
    `- ${entry.profile}: ${WEIGHT_KEYS.filter((key) => entry.multipliers[key] != null).map((key) => `${key}=${entry.multipliers[key]}`).join(', ') || '変更なし'}`),
  '',
].join('\n');

export const serializeNightmareTuningConfig = (config: NightmareTuningConfig): string => {
  const profileBlocks = config.profiles.length === 0
    ? '  profiles: [],'
    : [
      '  profiles: [',
      ...config.profiles.map((entry) => {
        const multipliers = WEIGHT_KEYS
          .filter((key) => entry.multipliers[key] != null)
          .map((key) => `${key}: ${entry.multipliers[key]}`)
          .join(', ');
        return `    { profile: '${entry.profile}', multipliers: { ${multipliers} } },`;
      }),
      '  ],',
    ].join('\n');

  return `import type { ResolvedAiProfile } from '@/app/types';\n\nexport type AiProfileWeightKey =\n  | 'captureBias'\n  | 'killBias'\n  | 'safetyBias'\n  | 'hqPressureBias'\n  | 'artilleryBias'\n  | 'antiAirBias'\n  | 'droneBias'\n  | 'stealthBias'\n  | 'navalBias'\n  | 'supplyBias'\n  | 'scoutBias';\n\nexport type AiProfileWeights = Record<AiProfileWeightKey, number>;\n\nexport type NightmareProfileTuning = {\n  profile: ResolvedAiProfile;\n  multipliers: Partial<Record<AiProfileWeightKey, number>>;\n};\n\nexport type NightmareTuningConfig = {\n  version: 1;\n  updatedAt: string;\n  updatedBy: 'manual' | 'selfplay-autotune';\n  note: string;\n  profiles: NightmareProfileTuning[];\n};\n\nexport const NIGHTMARE_TUNING_CONFIG: NightmareTuningConfig = {\n  version: 1,\n  updatedAt: '${config.updatedAt}',\n  updatedBy: '${config.updatedBy}',\n  note: '${config.note}',\n${profileBlocks}\n};\n\nconst DEFAULT_MULTIPLIER = 1;\n\nexport const getNightmareWeightMultipliers = (\n  profile: ResolvedAiProfile,\n): Partial<Record<AiProfileWeightKey, number>> =>\n  NIGHTMARE_TUNING_CONFIG.profiles.find((entry) => entry.profile === profile)?.multipliers ?? {};\n\nexport const applyNightmareWeightMultipliers = (\n  baseWeights: AiProfileWeights,\n  profile: ResolvedAiProfile,\n  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare',\n): AiProfileWeights => {\n  if (difficulty !== 'nightmare') {\n    return baseWeights;\n  }\n\n  const multipliers = getNightmareWeightMultipliers(profile);\n  return {\n    captureBias: baseWeights.captureBias * (multipliers.captureBias ?? DEFAULT_MULTIPLIER),\n    killBias: baseWeights.killBias * (multipliers.killBias ?? DEFAULT_MULTIPLIER),\n    safetyBias: baseWeights.safetyBias * (multipliers.safetyBias ?? DEFAULT_MULTIPLIER),\n    hqPressureBias: baseWeights.hqPressureBias * (multipliers.hqPressureBias ?? DEFAULT_MULTIPLIER),\n    artilleryBias: baseWeights.artilleryBias * (multipliers.artilleryBias ?? DEFAULT_MULTIPLIER),\n    antiAirBias: baseWeights.antiAirBias * (multipliers.antiAirBias ?? DEFAULT_MULTIPLIER),\n    droneBias: baseWeights.droneBias * (multipliers.droneBias ?? DEFAULT_MULTIPLIER),\n    stealthBias: baseWeights.stealthBias * (multipliers.stealthBias ?? DEFAULT_MULTIPLIER),\n    navalBias: baseWeights.navalBias * (multipliers.navalBias ?? DEFAULT_MULTIPLIER),\n    supplyBias: baseWeights.supplyBias * (multipliers.supplyBias ?? DEFAULT_MULTIPLIER),\n    scoutBias: baseWeights.scoutBias * (multipliers.scoutBias ?? DEFAULT_MULTIPLIER),\n  };\n};\n`;
};
