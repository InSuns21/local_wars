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

  it('nightmare参加者向けの調整計画を生成できる', () => {
    const before = runSelfPlaySeries({
      maps: ['plains-clash'],
      matchCount: 4,
      maxTurns: 6,
      seed: 101,
      fogOfWar: true,
      participants,
    });
    const after = runSelfPlaySeries({
      maps: ['plains-clash'],
      matchCount: 4,
      maxTurns: 6,
      seed: 102,
      fogOfWar: true,
      participants,
    });
    const comparison = compareSelfPlayReports(before, after);
    const proposal = buildSelfPlayImprovementProposal(after, comparison);
    const plan = buildNightmareAutotunePlan(after, comparison, proposal);

    expect(plan.decisions.length).toBeGreaterThanOrEqual(1);
    expect(plan.decisions[0].targetProfile).toBe('captain');
    expect(Object.keys(plan.decisions[0].adjustments).length).toBeGreaterThan(0);
    expect(plan.nextConfig.profiles.some((entry) => entry.profile === 'captain')).toBe(true);
  });

  it('autotune計画をMarkdownと設定TSへ出力できる', () => {
    const report = runSelfPlaySeries({
      maps: ['plains-clash'],
      matchCount: 2,
      maxTurns: 5,
      seed: 103,
      fogOfWar: true,
      participants,
    });
    const proposal = buildSelfPlayImprovementProposal(report);
    const plan = buildNightmareAutotunePlan(report, undefined, proposal);

    expect(renderNightmareAutotuneMarkdown(plan)).toContain('# nightmare autotune 提案');
    expect(serializeNightmareTuningConfig(plan.nextConfig)).toContain('NIGHTMARE_TUNING_CONFIG');
  });
});
