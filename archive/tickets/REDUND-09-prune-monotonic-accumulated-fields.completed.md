# REDUND-09: Prune Monotonic Accumulated Fields

**Status**: COMPLETED
**Priority**: Low
**Effort**: L
**Dependencies**: REDUND-07 (prune promises — establishes pattern)
**Category**: Storage redundancy (architectural)

## Summary

Multiple accumulated fields were assumed to grow monotonically with no pruning. Reassessment shows this is only partially true. This ticket now focuses on the fields that are actually unbounded in current code and should be lifecycle-pruned.

## Reassessed Assumptions

Validated against current implementation:

1. `threadAges` assumption was stale:
   - Already pruned in `computeContinuationThreadAges(...)` by rebuilding from `parentOpenThreads` and dropping resolved IDs.
   - No new pruning needed here.

2. `accumulatedDelayedConsequences` assumption is valid:
   - Triggered entries are currently retained forever.
   - This causes monotonic growth across long runs.

3. `accumulatedKnowledgeState` assumption is partially valid:
   - Entries are keyed by character and replaced on new analyst observations.
   - But a character entry can persist indefinitely even when no unresolved asymmetry remains unless we explicitly prune neutral snapshots.

4. `accumulatedFulfilledPremisePromises` assumption was incorrect:
   - Current lifecycle only deduplicates and trims.
   - It does **not** enforce membership in canonical `story.premisePromises`, so it can grow unbounded from novel strings.

## Problem

Fields with meaningful risk after reassessment:

| Field | Growth Pattern | Pruning Strategy |
|-------|---------------|-----------------|
| `accumulatedDelayedConsequences` | Triggered items stay forever | Prune triggered items immediately |
| `accumulatedKnowledgeState` | Character snapshots persist without unresolved asymmetry | Prune entries with no `falseBeliefs` and no `secrets` |
| `accumulatedFulfilledPremisePromises` | Can append arbitrary unique strings | Keep only canonical story premise promises |
| `threadAges` | Already lifecycle-pruned | No change |

For a 100-page story, these fields alone account for ~180KB of redundant data.

## Proposed Fix

Implement lifecycle-owned pruning (not page-assembly-only logic):

1. **`accumulatedDelayedConsequences`**: After applying triggers, retain only `triggered === false`.
2. **`accumulatedKnowledgeState`**: After merge-by-character, prune entries where both `falseBeliefs` and `secrets` are empty.
3. **`accumulatedFulfilledPremisePromises`**: Enforce canonicalization against `story.premisePromises` and only accumulate canonical entries.
4. **`threadAges`**: No implementation work in this ticket (already correct).

## Files to Touch

- `src/engine/state-lifecycle.ts` — keep lifecycle pruning/validation centralized
- `src/engine/page-builder.ts` — wire canonical premise list into lifecycle input and keep delayed-consequence assembly consistent with lifecycle rules
- `src/engine/continuation-context-builder.ts` — verify downstream context remains compatible with active-only accumulated state
- `test/unit/engine/state-lifecycle.test.ts` — add canonical premise filtering + knowledge pruning tests
- `test/unit/engine/page-builder.test.ts` — assert delayed-consequence pruning and canonical premise accumulation
- `test/integration/engine/page-builder-pipeline.test.ts` — guard end-to-end lifecycle behavior

## Risks

- Prompt/regression risk: some prompt sections may implicitly rely on historical triggered items.
- Data semantics risk: pruning knowledge entries with no unresolved asymmetry assumes those snapshots are not needed as long-term memory.
- Mitigation: run targeted unit + integration suites and keep pruning logic in lifecycle modules to reduce drift.

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Triggered delayed consequences are pruned from `accumulatedDelayedConsequences`
- [x] Knowledge entries with no unresolved asymmetry (`falseBeliefs=[]` and `secrets=[]`) are pruned
- [x] Fulfilled premise promises are restricted to canonical `story.premisePromises`
- [x] Confirmed `threadAges` behavior remains lifecycle-pruned (no regressions)
- [x] Relevant unit and integration tests pass

## Outcome

- Completion date: 2026-03-07
- What changed:
  - `state-lifecycle` now prunes neutral knowledge entries and enforces canonical fulfilled premise promises.
  - `page-builder` now drops triggered delayed consequences from accumulated carry-forward state.
  - `post-generation-processor` now passes canonical `story.premisePromises` into page lifecycle computation.
  - Unit and integration tests were extended to lock in these pruning invariants.
- Deviations from original plan:
  - Original ticket proposed `threadAges` pruning work, but this was already implemented; no code changes were made there.
  - Original ticket treated fulfilled premise promises as naturally bounded; implementation corrected this by canonicalizing against story premises.
  - `continuation-context-builder` needed verification only, not code changes.
- Verification:
  - `npm run test:unit -- test/unit/engine/state-lifecycle.test.ts test/unit/engine/page-builder.test.ts test/unit/engine/continuation-context-builder.test.ts`
  - `npm run test:integration -- test/integration/engine/page-builder-pipeline.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
