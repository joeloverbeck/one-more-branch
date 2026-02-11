# DETSTARECSPE-03: Reconciler Cross-Field Consistency and Canon Dedup

**Status**: ✅ COMPLETED

## Summary
Add deterministic cross-field consistency checks and canonical duplicate rejection required by Spec 11 before final delta derivation.

## Assumptions reassessment (2026-02-11)
- `inventory` and `health` remove/update ID validation is already implemented in `reconcileState()` via `normalizeAndValidateRemoveIds()`, including IDs introduced through `replace`.
- `characterState` removal ID validation is already implemented against `previousState.characterState`.
- Canon inputs are currently normalized+dropped (deduped) in reconciler output; they are not rejected with diagnostics when duplicates are present after reconciler normalization.
- Planner schema duplicate validation exists but is not sufficient for this ticket because it does not enforce reconciler-level normalization rules (`trim` + whitespace collapse) and does not cover duplicate per-character canon facts.

## Updated scope
- Keep existing cross-field ID validations as-is; add focused tests that lock in existing behavior.
- Implement deterministic diagnostics for duplicate canon facts (global + per-character) under reconciler normalization.
- Preserve existing public APIs and reconciler return shape.

## Depends on
- DETSTARECSPE-02
- `specs/11-deterministic-state-reconciler-spec.md`

## Blocks
- DETSTARECSPE-06
- DETSTARECSPE-07

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `test/unit/engine/state-reconciler.test.ts`

## Implementation checklist
1. Validate inventory and health remove/update references against authoritative previous-state IDs.
2. Validate character-state removals map to existing branch state entry IDs.
3. Detect duplicate `newCanonFacts` after reconciler normalization and reject deterministically with diagnostics.
4. Detect duplicate per-character canon facts after reconciler normalization and reject deterministically with diagnostics.
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

## Outcome
- Completion date: 2026-02-11
- Actual changes:
  - Added deterministic duplicate-canon diagnostics in `reconcileState()` for:
    - global canon duplicates (`stateIntents.canon.worldAdd[*]`)
    - per-character canon fact duplicates (`stateIntents.canon.characterAdd[*].facts[*]`)
  - Preserved existing behavior for cross-field ID validation and added explicit tests to lock that behavior.
  - Kept the reconciler public API and return shape unchanged.
- Deviations from original plan:
  - `src/engine/state-reconciler-types.ts` did not require changes.
  - Canon handling remains first-seen deterministic with duplicate entries rejected via diagnostics rather than hard failure/throw.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/character-state-manager.test.ts`
  - `npm run typecheck`
