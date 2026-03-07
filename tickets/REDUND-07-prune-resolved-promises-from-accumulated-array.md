# REDUND-07: Prune Resolved Promises from accumulatedPromises

**Priority**: Medium
**Effort**: M
**Dependencies**: REDUND-02 (remove resolvedPromiseMeta)
**Category**: Storage redundancy (architectural)

## Summary

`accumulatedPromises` grows monotonically — resolved promises remain in the array indefinitely. Since promise payoff assessments are already stored in `analystResult.promisePayoffAssessments`, resolved promises can be removed from the accumulated array after assessment. This changes growth from O(n) to bounded.

## Problem

Every page re-serializes ALL accumulated promises (active + resolved). Promise fields are ~400 bytes each. Over a 100-page story with ~50 total promises, this creates ~20KB of redundant promise data.

Currently:
- Promise detected on page 5 -> added to `accumulatedPromises`
- Promise resolved on page 15 -> payoff assessed in `analystResult`, but promise stays in array
- Pages 16-100 -> resolved promise re-serialized 85 times for no purpose

## Proposed Fix

1. After the analyst assesses a promise's payoff, remove it from `accumulatedPromises`
2. Keep `promisesResolved` IDs in the analyst result (they're already there)
3. In `page-builder.ts`, filter out resolved promise IDs from the accumulated array
4. Verify no downstream consumer needs resolved promises in the accumulated list

**Pre-implementation check**: Grep all usages of `accumulatedPromises` to confirm no code path filters for resolved promises or needs them present.

## Files to Touch

- `src/engine/page-builder.ts` — filter resolved promises from accumulated array
- `src/engine/continuation-context-builder.ts` — verify it only needs active promises
- `test/` — update tests and fixtures

## Risks

- Some prompt might reference resolved promises for "callback" or "echo" effects
- Must verify the Promise Tracker prompt doesn't need resolved promises to avoid re-detecting them
- Mitigation: keep a lightweight `resolvedPromiseIds: string[]` to prevent re-detection

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Resolved promises no longer appear in `accumulatedPromises` on subsequent pages
- [ ] Promise Tracker does not re-detect previously resolved promises
- [ ] All existing tests pass
- [ ] `npm run test:coverage` thresholds met
