# NARARCAUD-18: Delayed Consequence Model & Lifecycle

**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: None
**Spec reference**: F1 (part 1) — Subsystem gaps

## Summary

Create the `DelayedConsequence` data model and lifecycle functions. A delayed consequence is a narrative event that triggers after a configurable page delay, enabling Chekhov's gun mechanics and time-bomb storytelling.

## Files to Create

- `src/models/state/delayed-consequence.ts` — `DelayedConsequence` interface: `id`, `description`, `triggerCondition`, `minPagesDelay`, `maxPagesDelay`, `currentAge`, `triggered`, `sourcePageId` (all required)
- `src/engine/consequence-lifecycle.ts` — age tracking, trigger evaluation functions

## Files to Touch

- `src/models/state/index.ts` — export new types
- `src/models/index.ts` — export if needed

## Out of Scope

- Writer/analyst schema changes (NARARCAUD-19/20)
- Page integration
- Prompt changes

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: `DelayedConsequence` interface validates correctly
- [ ] Unit test: aging function increments `currentAge`
- [ ] Unit test: trigger evaluation returns triggered consequences within min/max window
- [ ] Unit test: consequences outside window remain untriggered
- [ ] Invariant: No existing code modified beyond barrel exports
