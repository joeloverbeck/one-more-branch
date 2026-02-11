**Status**: ✅ COMPLETED

# THRCONANDDEDSPE-04: Replace-Only Enforcement and Danger-vs-Threat Rejection

## Summary
Harden reconciler enforcement so duplicate-like thread additions are rejected unless they resolve an equivalent active thread in the same payload, and reject misclassified `DANGER` threads that are immediate scene hazards.

## Assumption Reassessment (2026-02-11)
- The core behaviors in this ticket are already implemented in `src/engine/state-reconciler.ts`:
  - near-duplicate thread adds against unresolved equivalent active threads are rejected
  - equivalent thread refinement is allowed only when resolve is present in the same payload
  - duplicate-like thread adds within the same payload are deterministically rejected
  - immediate-hazard `DANGER` threads are rejected with deterministic diagnostic code
- Existing unit tests in `test/unit/engine/state-reconciler.test.ts` already cover these behaviors directly.
- The original acceptance command list had one stale command using `test:unit` for an integration test path.

## Depends on
- `THRCONANDDEDSPE-03`
- `specs/12-thread-contract-and-dedup-spec.md` replacement enforcement and threat-vs-danger separation

## File list it expects to touch
- `tickets/THRCONANDDEDSPE-04-replace-only-enforcement-and-danger-vs-threat-rejection.md` (assumption/scope corrections)
- `src/engine/state-reconciler.ts` (only if verification finds a real behavior gap)
- `src/engine/state-reconciler-types.ts` (only if new diagnostics keys/types are required)
- `test/unit/engine/state-reconciler.test.ts` (only if verification finds missing edge-case coverage)

## Implementation checklist
1. Enforce replacement-only path for near-duplicate equivalent unresolved loops:
   - reject direct add if equivalent active thread exists and is unresolved
   - require corresponding resolve (`td-*`) in same payload
2. Ensure equivalent duplicate-like adds in same payload are deterministically rejected.
3. Enforce `DANGER` classification gate:
   - immediate present-tense scene hazards are rejected as misclassified
   - diagnostic points to threat/constraint category
4. Ensure diagnostics are machine-readable and stable.

## Out of scope
- No prompt section updates.
- No end-to-end retry behavior changes.
- No storage schema/persistence migration updates.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/page-planner-response-transformer.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Equivalent loops cannot coexist unresolved in final active thread state.
- Replace semantics always preserve explicit ID lineage (`resolve old td-*`, add one successor).
- Threat/constraint handling semantics are unchanged except for stronger `DANGER` misclassification rejection.

## Outcome
- Completion date: 2026-02-11
- What was actually changed:
  - Reassessed and corrected ticket assumptions/scope against current implementation and tests.
  - Corrected stale acceptance command for integration coverage (`test:integration` instead of `test:unit`).
  - No production code changes were required because the behavior was already implemented.
- Deviations from original plan:
  - Planned reconciler/type/test code edits were not needed after verification.
  - Work focused on ticket accuracy and validation evidence.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts` (pass)
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/page-planner-response-transformer.test.ts` (pass)
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts` (pass)
  - `npm run typecheck` (pass)
