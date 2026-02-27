# NARARCAUD-18: Delayed Consequence Model & Lifecycle

**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: None
**Spec reference**: F1 (part 1) — Subsystem gaps
**Status**: COMPLETED

## Summary

Create the foundational delayed consequence model and pure lifecycle utilities. A delayed consequence is a narrative event that becomes eligible after a configurable page delay.

## Assumptions Reassessed (2026-02-27)

- No delayed consequence model/lifecycle exists yet in `src/models/state` or `src/engine`.
- Existing lifecycle architecture uses pure helper modules (`thread-lifecycle`, `promise-lifecycle`) and direct imports; there is no engine barrel pattern to update.
- Existing state architecture favors dedicated modules with runtime validation helpers for persisted/LLM-facing structures.
- `PageId` is a branded type in `src/models/id.ts`; `sourcePageId` should use `PageId` (not a plain number) for type safety and consistency.
- "Interface validates correctly" is not a meaningful runtime acceptance condition in this codebase. Runtime validation should be asserted via an `isDelayedConsequence` type guard.

## Files to Create

- `src/models/state/delayed-consequence.ts` — `DelayedConsequence` interface and `isDelayedConsequence` runtime guard:
  - `id`, `description`, `triggerCondition`, `minPagesDelay`, `maxPagesDelay`, `currentAge`, `triggered`, `sourcePageId` (all required)
  - `sourcePageId` typed as `PageId`
- `src/engine/consequence-lifecycle.ts` — pure lifecycle utilities:
  - increment ages for untriggered consequences
  - return consequences that are trigger-eligible within delay window
  - preserve immutability (do not mutate input arrays/objects)
- `test/unit/models/state/delayed-consequence.test.ts` — model + type guard tests
- `test/unit/engine/consequence-lifecycle.test.ts` — lifecycle behavior tests

## Files to Touch

- `src/models/state/index.ts` — export new types
- `src/models/index.ts` — export if needed

## Out of Scope

- Writer/analyst schema changes (NARARCAUD-19/20)
- Page integration
- Prompt changes

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: `isDelayedConsequence` accepts valid shape and rejects invalid shapes
- [x] Unit test: aging function increments `currentAge`
- [x] Unit test: trigger-eligibility evaluation returns consequences within min/max window
- [x] Unit test: consequences outside window are excluded from eligible set
- [x] Unit test: lifecycle functions are immutable
- [x] Invariant: No existing production code modified beyond new files and barrel exports

## Outcome

- **Completion date**: 2026-02-27
- **What changed**:
  - Added `src/models/state/delayed-consequence.ts` with `DelayedConsequence` and `isDelayedConsequence`.
  - Added `src/engine/consequence-lifecycle.ts` with pure lifecycle helpers:
    - `incrementDelayedConsequenceAges`
    - `getTriggerEligibleDelayedConsequences`
  - Updated state/model barrel exports in `src/models/state/index.ts` and `src/models/index.ts`.
  - Added unit tests:
    - `test/unit/models/state/delayed-consequence.test.ts`
    - `test/unit/engine/consequence-lifecycle.test.ts`
- **Deviations from original plan**:
  - `sourcePageId` was implemented as branded `PageId` (not plain `number`) for consistency with existing model architecture.
  - Acceptance criteria were tightened to require runtime guard validation and immutability checks, instead of interface-only validation.
- **Verification**:
  - `npm run typecheck` passed.
  - `npm run test:unit -- --runInBand test/unit/models/state/delayed-consequence.test.ts test/unit/engine/consequence-lifecycle.test.ts` passed (and executed full unit suite successfully).
  - `npm test -- --runInBand` passed (`240/240` suites, `2827/2827` tests).
  - `npm run lint` passed.
