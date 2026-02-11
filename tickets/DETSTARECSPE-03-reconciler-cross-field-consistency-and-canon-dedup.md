# DETSTARECSPE-03: Reconciler Cross-Field Consistency and Canon Dedup

**Status**: Draft

## Summary
Add deterministic cross-field consistency checks and canonical dedup logic required by Spec 11 before final delta derivation.

## Depends on
- DETSTARECSPE-02
- `specs/11-deterministic-state-reconciler-spec.md`

## Blocks
- DETSTARECSPE-06
- DETSTARECSPE-07

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `src/engine/state-reconciler-types.ts`
- `test/unit/engine/state-reconciler.test.ts`

## Implementation checklist
1. Validate inventory and health remove/update references against authoritative previous-state IDs.
2. Validate character-state removals map to existing branch state entry IDs.
3. Detect duplicate `newCanonFacts` after normalization and reject deterministically.
4. Detect duplicate per-character canon facts after normalization and reject deterministically.
5. Ensure diagnostics include field/category codes for each failed rule.

## Out of scope
- Narrative lexical evidence gate.
- Thread near-duplicate similarity thresholds.
- Retry policy orchestration in `page-service`.
- Prompt wording or schema updates.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/character-state-manager.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Canon additions are idempotent under normalization.
- Cross-field ID checks never mutate input data structures.
- Valid inputs remain accepted without lossy transformation.
