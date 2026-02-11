**Status**: Draft

# THRCONANDDEDSPE-04: Replace-Only Enforcement and Danger-vs-Threat Rejection

## Summary
Harden reconciler enforcement so duplicate-like thread additions are rejected unless they resolve an equivalent active thread in the same payload, and reject misclassified `DANGER` threads that are immediate scene hazards.

## Depends on
- `THRCONANDDEDSPE-03`
- `specs/12-thread-contract-and-dedup-spec.md` replacement enforcement and threat-vs-danger separation

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `src/engine/state-reconciler-types.ts` (only if new diagnostics keys/types are required)
- `test/unit/engine/state-reconciler.test.ts`

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
- `npm run test:unit -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Equivalent loops cannot coexist unresolved in final active thread state.
- Replace semantics always preserve explicit ID lineage (`resolve old td-*`, add one successor).
- Threat/constraint handling semantics are unchanged except for stronger `DANGER` misclassification rejection.

