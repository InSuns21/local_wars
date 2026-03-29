import { buildSelfPlayImprovementProposal, compareSelfPlayReports, runSelfPlaySeries } from '@core/analysis/selfPlay';
import {
  buildNightmareAutotunePlan,
  renderNightmareAutotuneMarkdown,
  serializeNightmareTuningConfig,
} from '@core/analysis/selfPlayAutoTune';
import { nightmareParticipants } from './helpers/selfPlayTestUtils';

describe('selfPlayAutoTune plan', () => {
  const reportA = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 4,
    seed: 101,
    fogOfWar: true,
    participants: nightmareParticipants,
  });

  const reportB = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 4,
    seed: 102,
    fogOfWar: true,
    participants: nightmareParticipants,
  });

  const shortReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 4,
    seed: 103,
    fogOfWar: true,
    participants: nightmareParticipants,
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
});

