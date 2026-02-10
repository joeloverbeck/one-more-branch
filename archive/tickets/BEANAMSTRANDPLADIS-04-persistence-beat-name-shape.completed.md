# BEANAMSTRANDPLADIS-04: Persist beat names in active and versioned structures

## Summary
Reassess persistence coverage for beat `name` in both active `structure` and
`structureVersions[*].structure`, then close remaining test gaps.

## Status
**Status**: ✅ COMPLETED

## Assumption Reassessment (2026-02-10)
- `src/persistence/story-repository.ts` already serializes and deserializes beat `name`
  in both active and versioned structures.
- Unit persistence tests already assert active-structure beat name persistence.
- Coverage gap: tests do not explicitly assert beat names in persisted
  `structureVersions[*].structure` JSON payload.
- Coverage gap: `test/integration/persistence/story-repository.test.ts` still uses
  pre-contract structure fixtures missing required beat fields (`name`, `role`) and
  structure fields (`premise`, `pacingBudget`), so it does not enforce the current
  contract.

## File list it expects to touch
- `test/unit/persistence/story-repository.test.ts`
- `test/integration/persistence/story-repository.test.ts`

## Implementation checklist
1. Keep existing repository conversion logic unchanged unless a failing test proves a
   real defect.
2. Add/strengthen unit assertions for beat names inside persisted
   `structureVersions[*].structure`.
3. Update integration fixtures to the current required structure contract (including
   beat `name` and `role`, plus structure `premise` and `pacingBudget`).
4. Verify unit/integration persistence suites and `typecheck` pass.

## Out of scope
- Do not modify LLM prompt/schema contracts.
- Do not modify parse/generator/rewrite logic.
- Do not add migration or compatibility logic for legacy stories lacking beat names.
- Do not modify server play template rendering.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/persistence/story-repository.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/persistence/story-repository.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Persisted beat shape remains `id`, `name`, `description`, `objective`, `role`.
- Both active structure and every versioned structure include beat names.
- No fallback/default values are injected for missing beat names.

## Outcome
- Completion date: 2026-02-10
- What changed:
  - Strengthened `test/unit/persistence/story-repository.test.ts` to assert beat names
    are persisted in `structureVersions[*].structure`.
  - Updated `test/integration/persistence/story-repository.test.ts` fixtures to the
    current required structure contract (`beat.name`, `beat.role`, `premise`,
    `pacingBudget`).
- Deviations from original plan:
  - No changes were required in `src/persistence/story-repository.ts` because beat-name
    persistence logic was already implemented.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/persistence/story-repository.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/persistence/story-repository.test.ts` passed.
  - `npm run typecheck` passed.
