import {
  compareSelfPlayReports,
  renderSelfPlayComparisonMarkdown,
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

  it('単戦の自己対戦結果を返せる', () => {
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
  });
});
