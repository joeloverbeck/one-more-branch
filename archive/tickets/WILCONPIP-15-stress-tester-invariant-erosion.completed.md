# WILCONPIP-15: Stress Tester Invariant Erosion and Dull Collapse Checks

**Status**: COMPLETED

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

- [x] Unit test: `ConceptStressTesterContext` accepts `contentPackets` field
- [x] Unit test: `buildConceptStressTesterPrompt` includes `WILDNESS INVARIANT` section when content packets provided
- [x] Unit test: `buildConceptStressTesterPrompt` includes dull-collapse comparison instructions when content packets provided
- [x] Unit test: `buildConceptStressTesterPrompt` omits both sections when content packets undefined
- [x] Unit test: prompt instructs LLM to flag invariant erosion as a drift risk with `WILDNESS_INVARIANT` mitigation type
- [x] Unit test: prompt instructs LLM to compare dullCollapse against genericCollapse
- [x] Unit test: `stressTestConcept` passes content packets through to prompt builder
- [x] Unit test: existing stress tester calls (without contentPackets) produce identical results

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] `ConceptStressTestResult` type is unchanged
- [x] Stress tester JSON schema is unchanged
- [x] Stress tester runtime parsing logic is unchanged

## Outcome

- Completion date: March 8, 2026
- What changed:
  - `ConceptStressTesterContext` now supports optional `contentPackets` in `src/models/concept-generator.ts`.
  - Stress tester prompt includes conditional `WILDNESS INVARIANT EROSION CHECK` and dull-collapse vs generic-collapse comparison directives in `src/llm/prompts/concept-stress-tester-prompt.ts`.
  - `stressTestConcept` passes context (including `contentPackets`) through prompt building in `src/llm/concept-stress-tester.ts`.
  - Unit coverage for all acceptance checks is present in `test/unit/llm/concept-stress-tester.test.ts`.
- Deviations from original plan:
  - None identified; implementation matches ticket scope.
- Verification results:
  - Confirmed by focused run: `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/concept-stress-tester.test.ts` (20/20 passing).
