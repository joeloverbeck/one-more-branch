# STANARPROPLA-12: Clean up all old NarrativePromise references and verify

**Status**: PENDING
**Depends on**: STANARPROPLA-01 through STANARPROPLA-11 (all prior tickets)
**Blocks**: None

## Summary

Search the entire codebase for remaining references to the old promise system (`NarrativePromise`, `inheritedNarrativePromises`, `parentAnalystNarrativePromises`, `narrativePromises`, `computeInheritedNarrativePromises`, `MAX_INHERITED_PROMISES`, `PROMISE_AGE_OUT_PAGES`). Fix all remaining references in source and test files. Remove the old `NarrativePromise` interface and `PromiseType` string union from `keyed-entry.ts`. Run full verification suite.

## File list

- **Modify**: `src/models/state/keyed-entry.ts` - Remove old `NarrativePromise` interface and old `PromiseType` string union (if still present after STANARPROPLA-01 left them for backward compat)
- **Modify**: `src/models/state/index.ts` - Remove old `NarrativePromise` export
- **Modify**: Any remaining `src/**/*.ts` files found by grep
- **Modify**: All `test/**/*.ts` files with outdated mocks:
  - Test mocks using `narrativePromises` on analyst results -> change to `promisesDetected`, `promisesResolved`, `promisePayoffAssessments`
  - Test mocks using `inheritedNarrativePromises` on pages -> change to `accumulatedPromises` (with `id` and `age` fields)
  - Test mocks importing `NarrativePromise` -> change to `TrackedPromise`
  - Test mocks for `PageBuildContext` -> update promise field names

## Out of scope

- Do NOT modify the design doc (`docs/plans/2026-02-14-stateful-narrative-promises-design.md`)
- Do NOT modify the implementation plan (`docs/plans/2026-02-14-stateful-narrative-promises-plan.md`)
- Do NOT add new features or change behavior - this ticket is purely cleanup
- Do NOT modify any prompt text or schema logic

## Acceptance criteria

### Specific tests that must pass

- `npm test` - ALL tests pass
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm run build` - PASS
- `npm run test:coverage` - Coverage thresholds met (70% branches/functions/lines/statements)

### Invariants that must remain true

- No references to `NarrativePromise` remain in `src/` (the type is fully removed)
- No references to `inheritedNarrativePromises` remain in `src/` or `test/`
- No references to `parentAnalystNarrativePromises` remain anywhere
- No references to `computeInheritedNarrativePromises` remain anywhere
- No references to `MAX_INHERITED_PROMISES` remain anywhere
- No references to `PROMISE_AGE_OUT_PAGES` remain anywhere
- No references to `narrativePromises` (the old analyst result field) remain in `src/` or `test/`
- Verify with: `grep -r 'NarrativePromise\|inheritedNarrativePromises\|MAX_INHERITED_PROMISES\|PROMISE_AGE_OUT_PAGES\|computeInheritedNarrativePromises\|parentAnalystNarrativePromises' src/ test/ --include='*.ts'` returns zero matches
- All existing invariants from CLAUDE.md remain true:
  - Page immutability
  - Deterministic replay
  - Branch isolation
  - Keyed state IDs (server-assigned sequential, now including `pr-N`)
  - Ending consistency
  - Choice minimum (2-5 for non-ending)
