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
    const report = runSelfPlaySeries({
      maps: ['plains-clash', 'river-crossing'],
      matchCount: 4,
      maxTurns: 6,
      seed: 10,
      fogOfWar: true,
      swapSidesEveryMatch: true,
      participants,
    });

    expect(report.matches).toHaveLength(4);
    expect(report.aggregate.totalMatches).toBe(4);
    expect(report.aggregate.mapBreakdown).toHaveLength(2);
  });

  it('nightmare向けの詳細指標をレポートへ含められる', () => {
    const report = runSelfPlaySeries({
      maps: ['plains-clash'],
      matchCount: 4,
      maxTurns: 6,
      seed: 30,
      fogOfWar: true,
      participants: {
        ...participants,
        left: { ...participants.left, difficulty: 'nightmare', label: 'captain-nightmare' },
      },
    });

    const left = report.aggregate.participants.left;
    expect(left.firstPlayerWinRate).toBeGreaterThanOrEqual(0);
    expect(left.secondPlayerWinRate).toBeGreaterThanOrEqual(0);
    expect(left.responseRates.antiAir.opportunityCount).toBeGreaterThanOrEqual(0);
    expect(left.compositionShares.frontline).toBeGreaterThanOrEqual(0);
    expect(left.mapWinRateSpread).toBeGreaterThanOrEqual(0);
    const markdown = renderSelfPlayMarkdown(report);
    expect(markdown).toContain('nightmare調整向け詳細指標');
    expect(markdown).toContain('対空応答率');
  });

  it('Markdownレポートを生成できる', () => {
    const report = runSelfPlaySeries({
      maps: ['plains-clash'],
      matchCount: 2,
      maxTurns: 5,
      seed: 3,
      fogOfWar: false,
      participants,
    });

    expect(renderSelfPlayMarkdown(report)).toContain('# AI自己対戦レポート');
  });

  it('前後レポートの差分を生成できる', () => {
    const before = runSelfPlaySeries({
      maps: ['plains-clash'],
      matchCount: 2,
      maxTurns: 5,
      seed: 21,
      fogOfWar: false,
      participants,
    });
    const after = runSelfPlaySeries({
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

    const comparison = compareSelfPlayReports(before, after);
    expect(renderSelfPlayComparisonMarkdown(comparison)).toContain('# AI自己対戦 差分レポート');
    expect(comparison.participants.left.label).toBe('captain-nightmare');
    expect(comparison.participants.left.firstPlayerWinRateDelta).toBeDefined();
  });

  it('改善提案Markdownを自動生成できる', () => {
    const before = runSelfPlaySeries({
      maps: ['plains-clash'],
      matchCount: 2,
      maxTurns: 5,
      seed: 41,
      fogOfWar: true,
      participants,
    });
    const after = runSelfPlaySeries({
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

    const proposal = buildSelfPlayImprovementProposal(after, compareSelfPlayReports(before, after));
    const markdown = renderSelfPlayImprovementProposalMarkdown(proposal);

    expect(markdown).toContain('# AI自己対戦 改善提案');
    expect(markdown).toContain('### 改善仮説');
    expect(proposal.targets[0].recommendations.length).toBeGreaterThan(0);
  });
});