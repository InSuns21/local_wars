import { renderSelfPlayMarkdown, runSelfPlaySeries } from '@core/analysis/selfPlay';
import { defaultParticipants, nightmareParticipants } from './helpers/selfPlayTestUtils';

describe('selfPlay metrics', () => {
  const nightmareReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 4,
    seed: 30,
    fogOfWar: true,
    participants: nightmareParticipants,
  });

  const stallReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 4,
    seed: 50,
    fogOfWar: true,
    participants: defaultParticipants,
  });

  const fowRecoveryReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 8,
    seed: 510,
    fogOfWar: true,
    participants: nightmareParticipants,
  });

  const groundOnlyObjectiveReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 10,
    seed: 20260322,
    fogOfWar: true,
    baseSettings: {
      enableAirUnits: false,
      enableNavalUnits: false,
      enableSuicideDrones: false,
    },
    participants: {
      left: {
        id: 'left',
        label: 'captain-nightmare-ground',
        difficulty: 'nightmare',
        selectedAiProfile: 'captain',
      },
      right: {
        id: 'right',
        label: 'hunter-nightmare-ground',
        difficulty: 'nightmare',
        selectedAiProfile: 'hunter',
      },
    },
  });

  it('nightmare向けの詳細指標をレポートへ含められる', () => {
    const left = nightmareReport.aggregate.participants.left;
    expect(left.firstPlayerWinRate).toBeGreaterThanOrEqual(0);
    expect(left.secondPlayerWinRate).toBeGreaterThanOrEqual(0);
    expect(left.responseRates.antiAir.opportunityCount).toBeGreaterThanOrEqual(0);
    expect(left.compositionShares.frontline).toBeGreaterThanOrEqual(0);
    expect(left.mapWinRateSpread).toBeGreaterThanOrEqual(0);
    expect(left.objectiveRates.capture).toBeGreaterThanOrEqual(0);

    const markdown = renderSelfPlayMarkdown(nightmareReport);
    expect(markdown).toContain('nightmare調整向け詳細指標');
    expect(markdown).toContain('対空応答率');
    expect(markdown).toContain('objective内訳');
    expect(markdown).toContain('objective要約');
    expect(markdown).toContain('dominant');
  });

  it('stall detectorで停滞指標を集計できる', () => {
    const left = stallReport.aggregate.participants.left;
    expect(left.averageInactiveTurnRate).toBeGreaterThanOrEqual(0);
    expect(left.averageLongestInactiveStreak).toBeGreaterThanOrEqual(0);
    expect(left.stallMatchRate).toBeGreaterThanOrEqual(0);
    expect(stallReport.matches[0].stall.turnActivities.length).toBeGreaterThan(0);

    const markdown = renderSelfPlayMarkdown(stallReport);
    expect(markdown).toContain('平均停滞ターン率');
    expect(markdown).toContain('stall要因候補');
  });

  it('FoW付き自己対戦でも全面stallには戻りにくい', () => {
    expect(fowRecoveryReport.aggregate.participants.left.stallMatchRate).toBeLessThan(1);
    expect(fowRecoveryReport.aggregate.participants.right.stallMatchRate).toBeLessThan(1);
    expect(fowRecoveryReport.aggregate.participants.left.averageInactiveTurnRate).toBeLessThan(0.5);
  });

  it('ground-onlyのobjective推定でもhq_pushを拾える', () => {
    const objectives = groundOnlyObjectiveReport.matches[0].stall.turnActivities
      .filter((activity) => activity.side === 'P2')
      .map((activity) => activity.objective);

    expect(objectives).toContain('hq_push');
  });
});

