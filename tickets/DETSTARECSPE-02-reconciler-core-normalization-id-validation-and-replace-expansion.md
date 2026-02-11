# DETSTARECSPE-02: Reconciler Core - Normalization, ID Validation, Replace Expansion

**Status**: Draft

## Summary
Implement the deterministic core of `reconcileState()` for normalization, remove/resolve ID validation, and replace-to-remove+add expansion.

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
- `src/engine/state-reconciler-errors.ts`
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
