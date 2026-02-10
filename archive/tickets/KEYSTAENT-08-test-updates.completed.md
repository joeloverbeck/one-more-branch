# KEYSTAENT-08: Update all remaining test files and fixtures

**Status**: ✅ COMPLETED
**Priority**: 8
**Depends on**: KEYSTAENT-01 through KEYSTAENT-06
**Branch**: keyed-state-entries

---

## Summary

Reassess and finish the remaining test updates for keyed state entries. Most foundational type migrations are already done; this ticket now focuses on tests that still encode legacy-style `THREAT_/CONSTRAINT_/THREAD_` prefixed content as if it were a required format.

This ticket is **test-only** and should avoid production code/API changes.

## Reassessed Assumptions (2026-02-10)

1. `TaggedStateEntry` migration is already complete in source and most tests.
2. `characterStateChangesRemoved` is already flat `string[]` in most `WriterResult` mocks.
3. `accumulatedInventory`, `accumulatedHealth`, and `accumulatedCharacterState` are already keyed-entry structures in most tests.
4. Active-state **additions** are plain descriptive text; only **removals** are IDs.  
   Legacy-like string content such as `"THREAT_X: ..."` may still parse as plain text, but tests should no longer present it as a required/expected format.
5. One intentional negative test remains valid: `isActiveState` should reject legacy `{ prefix, description, raw }` entries.

## Files to Touch

- `test/unit/engine/page-service.test.ts` — adjust active-state fixture text/comments away from legacy-prefixed format
- `test/unit/persistence/page-serializer.test.ts` — same adjustment for serialization fixtures
- `test/integration/llm/active-state-pipeline.test.ts` — remove expectations that keyed-entry text contains legacy prefixes
- Additional test files only if they still assert legacy-prefixed format semantics

## What to Implement

### Remaining Updates

1. Replace legacy-style active-state example strings in fixtures:
   - Prefer `"Guard patrol is closing in"` over `"THREAT_GUARD: Guard patrol is closing in"`
   - Prefer `"Smoke reduces visibility"` over `"CONSTRAINT_SMOKE: Smoke reduces visibility"`
   - Prefer `"Find the trapped innkeeper"` over `"THREAD_INNKEEPER: ..."`
2. Keep removals as ID-only arrays (`th-*`, `cn-*`, `td-*`, `inv-*`, `hp-*`, `cs-*`).
3. Update assertions that currently check for legacy prefixes in `.text` values.
4. Preserve the explicit negative compatibility test for legacy tagged active-state shape in `test/unit/models/state.test.ts`.

## Out of Scope

- Production code/API changes (unless a test uncovers a strict invariant violation)
- Migration fixtures that intentionally model legacy persisted data (`test/unit/persistence/migrate-keyed-entries.test.ts`)
- Performance/memory suites

## Acceptance Criteria

### Tests that must pass

1. Targeted unit/integration suites covering touched files pass.
2. `TaggedStateEntry` and `SingleCharacterStateChanges` are not used as active types in current tests.
3. Active-state tests do not assert or require legacy `THREAT_/CONSTRAINT_/THREAD_` prefix formatting for additions.
4. Keyed-entry accumulation/removal semantics remain intact (additions text, removals IDs).

### Invariants that must remain true

- Total test count does not decrease (tests are updated, not deleted)
- Existing scenario intent is preserved (format assumptions updated, behavior preserved)
- No test uses `@ts-ignore` or `as any` to work around type mismatches

## Outcome

- **Completion date**: 2026-02-10
- **What changed**:
  - Updated ticket assumptions/scope to reflect the current repository reality (most keyed-entry migrations already complete; remaining work is legacy-prefix test semantics).
  - Updated remaining test fixtures/assertions to use plain-text active-state additions (no required `THREAT_/CONSTRAINT_/THREAD_` prefix format):
    - `test/unit/engine/page-service.test.ts`
    - `test/unit/persistence/page-serializer.test.ts`
    - `test/integration/llm/active-state-pipeline.test.ts`
  - Preserved intentional legacy negative guard coverage in `test/unit/models/state.test.ts`.
- **Deviations from original plan**:
  - Original ticket overestimated remaining migration breadth and proposed broad file sweeps.
  - Actual implementation narrowed scope to targeted, behavior-preserving test updates.
- **Verification**:
  - `npm run test:unit -- --runInBand test/unit/engine/page-service.test.ts test/unit/persistence/page-serializer.test.ts` (script pattern executed full unit suite; passed)
  - `npm run test:integration -- --runInBand test/integration/llm/active-state-pipeline.test.ts` (script pattern executed full integration suite; passed)
