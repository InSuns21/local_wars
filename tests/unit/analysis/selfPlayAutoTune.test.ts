import { buildSelfPlayImprovementProposal, compareSelfPlayReports, runSelfPlaySeries } from '@core/analysis/selfPlay';
import {
  buildNightmareAutotunePlan,
  renderNightmareAutotuneMarkdown,
  serializeNightmareTuningConfig,
} from '@core/analysis/selfPlayAutoTune';

describe('selfPlayAutoTune', () => {
  const participants = {
    left: {
      id: 'left' as const,
      label: 'captain-nightmare',
      difficulty: 'nightmare' as const,
      selectedAiProfile: 'captain' as const,
    },
    right: {
      id: 'right' as const,
      label: 'hunter-hard',
      difficulty: 'hard' as const,
      selectedAiProfile: 'hunter' as const,
    },
  };

  const reportA = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 3,
    maxTurns: 6,
    seed: 101,
    fogOfWar: true,
    participants,
  });
  const reportB = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 3,
    maxTurns: 6,
    seed: 102,
    fogOfWar: true,
    participants,
  });
  const shortReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 103,
    fogOfWar: true,
    participants,
  });
  const stallReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 3,
    maxTurns: 10,
    seed: 120,
    fogOfWar: true,
    participants,
  });

  it('nightmare参加者向けの調整計画を生成できる', () => {
    const comparison = compareSelfPlayReports(reportA, reportB);
    const proposal = buildSelfPlayImprovementProposal(reportB, comparison);
    const plan = buildNightmareAutotunePlan(reportB, comparison, proposal);

    expect(plan.decisions.length).toBeGreaterThanOrEqual(1);
    expect(plan.decisions[0].targetProfile).toBe('captain');
    expect(plan.decisions[0].reasons.length).toBeGreaterThan(0);
    expect(plan.nextConfig.profiles.some((entry) => entry.profile === 'captain')).toBe(true);
  });

  it('autotune計画をMarkdownと設定TSへ出力できる', () => {
    const proposal = buildSelfPlayImprovementProposal(shortReport);
    const plan = buildNightmareAutotunePlan(shortReport, undefined, proposal);

    expect(renderNightmareAutotuneMarkdown(plan)).toContain('# nightmare autotune 提案');
    expect(serializeNightmareTuningConfig(plan.nextConfig)).toContain('NIGHTMARE_TUNING_CONFIG');
  });

  it('強いstallがあるとautotuneを保留して原因調査を優先する', () => {
    const proposal = buildSelfPlayImprovementProposal(stallReport);
    const plan = buildNightmareAutotunePlan(stallReport, undefined, proposal);

    if (stallReport.aggregate.participants.left.stallMatchRate >= 0.5 || stallReport.aggregate.participants.left.averageInactiveTurnRate >= 0.4) {
      expect(plan.decisions[0]?.adjustments ?? {}).toEqual({});
      expect(plan.decisions[0]?.reasons.join(' ')).toContain('stall detector');
    } else {
      expect(plan.decisions.length).toBeGreaterThanOrEqual(1);
    }
  });
});
