import {
  buildSelfPlayImprovementProposal,
  compareSelfPlayReports,
  renderSelfPlayComparisonMarkdown,
  renderSelfPlayImprovementProposalMarkdown,
  renderSelfPlayMarkdown,
  runSelfPlayMatch,
  runSelfPlaySeries,
} from '@core/analysis/selfPlay';

describe('selfPlay', () => {
  const participants = {
    left: {
      id: 'left' as const,
      label: 'captain-hard',
      difficulty: 'hard' as const,
      selectedAiProfile: 'captain' as const,
    },
    right: {
      id: 'right' as const,
      label: 'hunter-hard',
      difficulty: 'hard' as const,
      selectedAiProfile: 'hunter' as const,
    },
  };

  const basicReport = runSelfPlaySeries({
    maps: ['plains-clash', 'river-crossing'],
    matchCount: 4,
    maxTurns: 6,
    seed: 10,
    fogOfWar: true,
    swapSidesEveryMatch: true,
    participants,
  });

  const nightmareReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 3,
    maxTurns: 6,
    seed: 30,
    fogOfWar: true,
    participants: {
      ...participants,
      left: { ...participants.left, difficulty: 'nightmare', label: 'captain-nightmare' },
    },
  });

  const stallReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 3,
    maxTurns: 8,
    seed: 50,
    fogOfWar: true,
    participants,
  });

  const fowRecoveryReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 3,
    maxTurns: 16,
    seed: 510,
    fogOfWar: true,
    participants: {
      left: { ...participants.left, difficulty: 'nightmare', label: 'captain-nightmare' },
      right: participants.right,
    },
  });

  const markdownReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 3,
    fogOfWar: false,
    participants,
  });

  const comparisonBefore = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 21,
    fogOfWar: false,
    participants,
  });
  const comparisonAfter = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 22,
    fogOfWar: false,
    participants: {
      ...participants,
      left: { ...participants.left, difficulty: 'nightmare', label: 'captain-nightmare' },
    },
  });

  const proposalBefore = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 41,
    fogOfWar: true,
    participants,
  });
  const proposalAfter = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 42,
    fogOfWar: true,
    participants: {
      ...participants,
      left: { ...participants.left, difficulty: 'nightmare', label: 'captain-nightmare' },
    },
  });

  it('単一の自己対戦結果を返せる', () => {
    const match = runSelfPlayMatch({
      mapId: 'plains-clash',
      matchIndex: 1,
      seed: 1,
      maxTurns: 8,
      fogOfWar: false,
      participants,
      swapSides: false,
    });

    expect(match.mapId).toBe('plains-clash');
    expect(match.matchIndex).toBe(1);
    expect(match.participants.left.label).toBe('captain-hard');
    expect(match.turnsPlayed).toBeLessThanOrEqual(8);
  });

  it('複数試合の集計レポートを返せる', () => {
    expect(basicReport.matches).toHaveLength(4);
    expect(basicReport.aggregate.totalMatches).toBe(4);
    expect(basicReport.aggregate.mapBreakdown).toHaveLength(2);
  });

  it('nightmare向けの詳細指標をレポートへ含められる', () => {
    const left = nightmareReport.aggregate.participants.left;
    expect(left.firstPlayerWinRate).toBeGreaterThanOrEqual(0);
    expect(left.secondPlayerWinRate).toBeGreaterThanOrEqual(0);
    expect(left.responseRates.antiAir.opportunityCount).toBeGreaterThanOrEqual(0);
    expect(left.compositionShares.frontline).toBeGreaterThanOrEqual(0);
    expect(left.mapWinRateSpread).toBeGreaterThanOrEqual(0);
    const markdown = renderSelfPlayMarkdown(nightmareReport);
    expect(markdown).toContain('nightmare調整向け詳細指標');
    expect(markdown).toContain('対空応答率');
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

  it('Markdownレポートを生成できる', () => {
    expect(renderSelfPlayMarkdown(markdownReport)).toContain('# AI自己対戦レポート');
  });

  it('前後レポートの差分を生成できる', () => {
    const comparison = compareSelfPlayReports(comparisonBefore, comparisonAfter);
    expect(renderSelfPlayComparisonMarkdown(comparison)).toContain('# AI自己対戦 差分レポート');
    expect(comparison.participants.left.label).toBe('captain-nightmare');
    expect(comparison.participants.left.firstPlayerWinRateDelta).toBeDefined();
  });

  it('改善提案Markdownを自動生成できる', () => {
    const proposal = buildSelfPlayImprovementProposal(proposalAfter, compareSelfPlayReports(proposalBefore, proposalAfter));
    const markdown = renderSelfPlayImprovementProposalMarkdown(proposal);

    expect(markdown).toContain('# AI自己対戦 改善提案');
    expect(markdown).toContain('### 改善仮説');
    expect(proposal.targets[0].recommendations.length).toBeGreaterThan(0);
  });
});
