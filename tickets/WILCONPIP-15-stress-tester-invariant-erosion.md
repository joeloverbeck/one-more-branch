# WILCONPIP-15: Stress Tester Invariant Erosion and Dull Collapse Checks

**Effort**: M
**Dependencies**: WILCONPIP-01, WILCONPIP-14
**Spec reference**: "Concept Stress Tester Integration"

## Summary

Extend the concept stress tester to detect wildness invariant erosion during hardening. Two new checks:

1. **Invariant erosion test**: When a concept was seeded from a content packet, compare pre-hardened vs hardened concept to check if the wildnessInvariant has been diluted, normalized, or genericized.

2. **Dull collapse comparison**: Compare the packet's `dullCollapse` (what generic story this becomes if the invariant is removed) against the stress tester's `genericCollapse` from its `LoadBearingCheck`. If they match, the concept has collapsed despite nominally passing.

## Files to Touch

- `src/models/concept-generator.ts` — add `contentPackets?: readonly ContentPacket[]` to `ConceptStressTesterContext`
- `src/llm/prompts/concept-stress-tester-prompt.ts` — add conditional `WILDNESS INVARIANT` section and dull-collapse comparison instructions when content packets provided
- `src/llm/concept-stress-tester.ts` — pass content packets through to prompt builder

## Out of Scope

- Changes to `ConceptStressTestResult` output type (erosion detected = new drift risk with `WILDNESS_INVARIANT` mitigation type)
- Changes to stress tester JSON schema (existing output shape captures erosion as drift risks)
- Verifier changes — WILCONPIP-13
- Evaluator changes — WILCONPIP-12
- Content packet generation — WILCONPIP-03 through WILCONPIP-07

## Acceptance Criteria

### Tests

- [ ] Unit test: `ConceptStressTesterContext` accepts `contentPackets` field
- [ ] Unit test: `buildConceptStressTesterPrompt` includes `WILDNESS INVARIANT` section when content packets provided
- [ ] Unit test: `buildConceptStressTesterPrompt` includes dull-collapse comparison instructions when content packets provided
- [ ] Unit test: `buildConceptStressTesterPrompt` omits both sections when content packets undefined
- [ ] Unit test: prompt instructs LLM to flag invariant erosion as a drift risk with `WILDNESS_INVARIANT` mitigation type
- [ ] Unit test: prompt instructs LLM to compare dullCollapse against genericCollapse
- [ ] Unit test: `stressTestConcept` passes content packets through to prompt builder
- [ ] Unit test: existing stress tester calls (without contentPackets) produce identical results

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] `ConceptStressTestResult` type is unchanged
- [ ] Stress tester JSON schema is unchanged
- [ ] Stress tester runtime parsing logic is unchanged
