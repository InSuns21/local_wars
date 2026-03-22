import {
  buildSelfPlayImprovementProposal,
  compareSelfPlayReports,
  renderSelfPlayComparisonMarkdown,
  renderSelfPlayImprovementProposalMarkdown,
  runSelfPlaySeries,
} from '@core/analysis/selfPlay';
import { defaultParticipants, nightmareParticipants } from './helpers/selfPlayTestUtils';

describe('selfPlay proposals', () => {
  const comparisonBefore = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 21,
    fogOfWar: false,
    participants: defaultParticipants,
  });

  const comparisonAfter = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 22,
    fogOfWar: false,
    participants: nightmareParticipants,
  });

  const proposalBefore = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 41,
    fogOfWar: true,
    participants: defaultParticipants,
  });

  const proposalAfter = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 2,
    maxTurns: 5,
    seed: 42,
    fogOfWar: true,
    participants: nightmareParticipants,
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
