# DETSTARECSPE-02: Reconciler Core - Normalization, ID Validation, Replace Expansion

**Status**: ✅ COMPLETED

## Summary
Implement the deterministic core of `reconcileState()` for normalization, remove/resolve ID validation, and replace-to-remove+add expansion.

## Assumption Reassessment (2026-02-11)
- `src/engine/state-reconciler.ts` does not exist yet in this repository; only reconciler contracts exist in:
  - `src/engine/state-reconciler-types.ts`
  - `src/engine/state-reconciler-errors.ts`
- `test/unit/engine/state-reconciler.test.ts` does not exist yet and must be created as part of this ticket.
- Planner schema/transformer already performs baseline trim/filter normalization and replace payload hygiene. Reconciler still needs deterministic normalization and defensive validation because it is the final authority over remove/resolve ID correctness against authoritative previous state.
- `test/unit/llm/validation/state-id-prefixes.test.ts` validates LLM-side ID prefix utilities, not reconciler behavior; it remains a regression guard but is not sufficient coverage for reconciler core logic.

## Depends on
- DETSTARECSPE-01
- `specs/11-deterministic-state-reconciler-spec.md`

## Blocks
- DETSTARECSPE-03
- DETSTARECSPE-04
- DETSTARECSPE-05

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `src/engine/state-reconciler-types.ts`
- `test/unit/engine/state-reconciler.test.ts`

## Implementation checklist
1. Add `reconcileState(plan, writerOutput, previousState)` pure function shell.
2. Normalize intent text using deterministic trimming, whitespace collapse, and casefold comparison keys.
3. Validate all remove/resolve IDs exist in authoritative previous state by category.
4. Expand `replace` intents into deterministic remove+add operations before downstream checks.
5. Return deterministic diagnostics for unknown IDs and malformed replace payloads.
6. Add output-stability tests that run reconciliation repeatedly with identical input.

## Out of scope
- Narrative evidence gate logic.
- Cross-field consistency checks beyond unknown-ID validation.
- Thread dedup/similarity thresholds from Spec 12.
- `page-service` or `page-builder` integration.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/validation/state-id-prefixes.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Reconciler behavior is deterministic and side-effect free.
- Unknown IDs are rejected rather than ignored.
- Replace semantics always become exactly one remove/resolve and one add.

## Outcome
- **Completion date**: 2026-02-11
- **What changed**:
  - Added `src/engine/state-reconciler.ts` with `reconcileState(plan, writerOutput, previousState)` deterministic core logic for:
    - intent normalization (trim + whitespace collapse + casefold dedupe keys)
    - replace expansion into remove/resolve + add
    - authoritative previous-state ID validation for remove/resolve categories
    - deterministic diagnostics for unknown IDs and malformed replace payloads
  - Extended reconciler contracts in `src/engine/state-reconciler-types.ts` with `StateReconciliationPreviousState`.
  - Added `test/unit/engine/state-reconciler.test.ts` covering normalization, replace expansion, unknown ID rejection, malformed replace diagnostics, and repeated-run stability.
- **Deviations from original plan**:
  - `src/engine/state-reconciler.ts` and `test/unit/engine/state-reconciler.test.ts` did not previously exist; implementation included creating both files rather than editing them.
  - `src/engine/state-reconciler-errors.ts` was not changed because this ticket’s implemented scope did not require new error-class behavior.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts` ✅
  - `npm run test:unit -- --runTestsByPath test/unit/llm/validation/state-id-prefixes.test.ts` ✅
  - `npm run typecheck` ✅
