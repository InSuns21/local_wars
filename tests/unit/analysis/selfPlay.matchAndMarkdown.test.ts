import {
  renderSelfPlayMarkdown,
  runSelfPlayMatch,
  runSelfPlaySeries,
} from '@core/analysis/selfPlay';
import { defaultParticipants } from './helpers/selfPlayTestUtils';

describe('selfPlay match and markdown', () => {
  const basicReport = runSelfPlaySeries({
    maps: ['plains-clash', 'river-crossing'],
    matchCount: 2,
    maxTurns: 4,
    seed: 10,
    fogOfWar: true,
    swapSidesEveryMatch: true,
    participants: defaultParticipants,
  });

  const markdownReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 4,
    seed: 3,
    fogOfWar: false,
    participants: defaultParticipants,
  });

  it('単一の自己対戦結果を返せる', () => {
    const match = runSelfPlayMatch({
      mapId: 'plains-clash',
      matchIndex: 1,
      seed: 1,
      maxTurns: 8,
      fogOfWar: false,
      participants: defaultParticipants,
      swapSides: false,
    });

    expect(match.mapId).toBe('plains-clash');
    expect(match.matchIndex).toBe(1);
    expect(match.participants.left.label).toBe('captain-hard');
    expect(match.turnsPlayed).toBeLessThanOrEqual(8);
  });

  it('複数試合の集計レポートを返せる', () => {
    expect(basicReport.matches).toHaveLength(2);
    expect(basicReport.aggregate.totalMatches).toBe(2);
    expect(basicReport.aggregate.mapBreakdown).toHaveLength(2);
  });

  it('Markdownレポートを生成できる', () => {
    expect(renderSelfPlayMarkdown(markdownReport)).toContain('# AI自己対戦レポート');
  });
});

