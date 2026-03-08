# WILCONPIP-14: WILDNESS_INVARIANT Drift Risk Mitigation Type

**Status**: COMPLETED
**Effort**: S
**Dependencies**: None (can be done independently)
**Spec reference**: "Concept Stress Tester Integration" (DriftRiskMitigationType section)

## Summary

Add `WILDNESS_INVARIANT` to the `DRIFT_RISK_MITIGATION_TYPES` array in `src/models/concept-generator.ts`. This allows drift risks to be mitigated specifically by referencing the wildness invariant. This is a small, isolated type change.

## Files to Touch

- `src/models/concept-generator.ts` — add `'WILDNESS_INVARIANT'` to `DRIFT_RISK_MITIGATION_TYPES` array
- `src/llm/schemas/concept-stress-tester-schema.ts` — add `'WILDNESS_INVARIANT'` to the `mitigationType` enum in JSON Schema

## Out of Scope

- Stress tester prompt changes — WILCONPIP-15
- Stress tester invariant erosion test — WILCONPIP-15
- Concept evaluator changes — WILCONPIP-12
- Any other model changes

## Acceptance Criteria

### Tests

- [x] Unit test: `isDriftRiskMitigationType('WILDNESS_INVARIANT')` returns true
- [x] Unit test: `DRIFT_RISK_MITIGATION_TYPES` array contains `'WILDNESS_INVARIANT'`
- [x] Unit test: stress tester JSON schema `mitigationType` enum includes `'WILDNESS_INVARIANT'`
- [x] Unit test: existing values (`STATE_CONSTRAINT`, `WORLD_AXIOM`, `SCENE_RULE`, `RETRIEVAL_SCOPE`) still pass

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] `DriftRiskMitigationType` type is a union derived from the array (existing pattern preserved)
- [x] No changes to stress tester runtime logic

## Outcome

- **Completed**: 2026-03-08
- **Changes**: Added `'WILDNESS_INVARIANT'` to `DRIFT_RISK_MITIGATION_TYPES` array in `src/models/concept-generator.ts`. No change needed to `concept-stress-tester-schema.ts` since it spreads the array at runtime.
- **Deviations**: The ticket listed `concept-stress-tester-schema.ts` as a file to touch, but no code change was needed there — the schema uses `[...DRIFT_RISK_MITIGATION_TYPES]` spread, so it automatically includes the new value.
- **Verification**: 271 test suites pass (3278 tests), typecheck clean, lint clean.
