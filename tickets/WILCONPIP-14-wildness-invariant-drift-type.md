# WILCONPIP-14: WILDNESS_INVARIANT Drift Risk Mitigation Type

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

- [ ] Unit test: `isDriftRiskMitigationType('WILDNESS_INVARIANT')` returns true
- [ ] Unit test: `DRIFT_RISK_MITIGATION_TYPES` array contains `'WILDNESS_INVARIANT'`
- [ ] Unit test: stress tester JSON schema `mitigationType` enum includes `'WILDNESS_INVARIANT'`
- [ ] Unit test: existing values (`STATE_CONSTRAINT`, `WORLD_AXIOM`, `SCENE_RULE`, `RETRIEVAL_SCOPE`) still pass

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] `DriftRiskMitigationType` type is a union derived from the array (existing pattern preserved)
- [ ] No changes to stress tester runtime logic
