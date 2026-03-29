import { buildSelfPlayImprovementProposal, runSelfPlaySeries } from '@core/analysis/selfPlay';
import { buildNightmareAutotunePlan } from '@core/analysis/selfPlayAutoTune';
import { nightmareParticipants } from './helpers/selfPlayTestUtils';

describe('selfPlayAutoTune stall guard', () => {
  const stallReport = runSelfPlaySeries({
    maps: ['plains-clash'],
    matchCount: 1,
    maxTurns: 6,
    seed: 120,
    fogOfWar: true,
    participants: nightmareParticipants,
  });

  it('強いstallがあるとautotuneを保留して原因調査を優先する', () => {
    const proposal = buildSelfPlayImprovementProposal(stallReport);
    const plan = buildNightmareAutotunePlan(stallReport, undefined, proposal);

    if (
      stallReport.aggregate.participants.left.stallMatchRate >= 0.5 ||
      stallReport.aggregate.participants.left.averageInactiveTurnRate >= 0.4
    ) {
      expect(plan.decisions[0]?.adjustments ?? {}).toEqual({});
      expect(plan.decisions[0]?.reasons.join(' ')).toContain('stall detector');
    } else {
      expect(plan.decisions.length).toBeGreaterThanOrEqual(1);
    }
  });
});

