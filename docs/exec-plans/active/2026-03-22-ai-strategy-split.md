# AI Strategy Split Plan

## Goal
- Reduce the size and coupling of `src/core/engine/aiTurn.ts`
- Keep the shared AI turn engine intact
- Move profile-specific behavior behind a small `AiStrategy` interface
- Start with the safest slice: `captain` and `hunter`

## Why this split
- `aiTurn.ts` currently mixes:
  - shared turn flow
  - difficulty handling
  - profile-specific planning
  - profile-specific production
  - profile-specific move bonuses
  - playback concerns
  - self-play concerns
- This makes targeted tuning harder, especially for self-play iterations

## Scope of Phase 1
- Add an `AiStrategy` interface
- Add strategy registry / resolver
- Extract `captain` and `hunter` profile differences from `aiTurn.ts`
- Keep shared scoring and command flow in `aiTurn.ts`
- Do not split playback, combat forecasting, or FoW core logic yet

## Scope of Phase 2
- Extract `turtle` and `sieger` profile differences into strategy modules
- Move profile-specific move bonuses behind `getMoveScoreBonus`
- Move profile-specific production overrides behind `chooseProductionOverride`
- Reduce `buildOperationalPlan` clutter by constructing strategy plan context through a helper

## Target architecture

### Shared engine
- `runAiTurn`
- `runAiTurnWithPlayback`
- command application order
- common evaluation helpers
- playback generation

### Strategy layer
- `AiStrategy`
- `captainStrategy`
- `hunterStrategy`
- default fallback strategy

### Future phases
- Move `drone_swarm / stealth_strike` into strategy modules
- Move profile-specific move/attack hooks into smaller evaluators
- Split difficulty policy from profile strategy

## Minimal interface

```ts
type AiStrategy = {
  profile: ResolvedAiProfile;
  adjustDesiredCapturerCount?(ctx: AiStrategyPlanContext, base: number): number;
  getHqThreatContactThreshold?(ctx: AiStrategyPlanContext): number;
  canForceHqPush?(ctx: AiStrategyPlanContext): boolean;
  getDesiredReconCount?(ctx: AiStrategyProductionContext): number;
  shouldAvoidEmergencySupportProduction?(ctx: AiStrategyProductionContext): boolean;
  shouldAvoidSupplyShipProduction?(ctx: AiStrategyProductionContext): boolean;
  chooseProductionOverride?(ctx: AiStrategyProductionContext): UnitType | null;
  getMoveScoreBonus?(ctx: AiStrategyMoveContext): number;
};
```

## captain extraction targets
- HQ threat threshold tweak in ground-only
- shortcut to `hq_push` when capturable targets are low
- recon preference when none exists
- move bonus for capturers advancing with frontline

## hunter extraction targets
- lighter capturer requirements
- earlier `hq_push` transition when pressure is possible
- recon target count
- avoid emergency support truck / supply ship preference
- tank-first production override

## Safety constraints
- Shared engine order must not change
- Existing self-play and playback behavior must stay compatible
- New strategy hooks must be optional and default-safe
- Existing tests should remain valid with only additive updates

## Validation
- `npm run typecheck`
- `npm run test:changed`
- Confirm `captain / hunter / turtle / sieger` strategy behavior still matches current expectations

## Notes
- This phase is intentionally small
- The goal is to create a seam, not to fully modularize AI in one step
