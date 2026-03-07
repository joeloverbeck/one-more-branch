# WILCONPIP-13: Verifier Invariant-Removal Load-Bearing Test

**Effort**: M
**Dependencies**: WILCONPIP-01, WILCONPIP-10
**Spec reference**: "Verifier Phase 1 (Specificity) Changes", "Verifier Phase 2 (Scenario) Changes"

## Summary

Extend the concept verifier's two phases to include content-packet-aware tests:

**Phase 1 (Specificity)**: Add an invariant-removal load-bearing test. When a concept was seeded from a content packet, the Specificity phase asks: "Remove the wildnessInvariant or primary content packet. Does the story collapse into generic genre?" This is **additive** to the existing load-bearing check (which removes `genreSubversion + coreFlaw + coreConflictLoop`).

**Phase 2 (Scenario)**: When content packets are in context, require that at least 2 escalating setpieces exploit the packet's signatureImage or escalationPath, and at least 1 setpiece shows the packet's socialEngine in action.

## Files to Touch

- `src/models/concept-generator.ts` — add `contentPackets?: readonly ContentPacket[]` to `ConceptVerifierContext`
- `src/llm/prompts/concept-specificity-prompt.ts` — add conditional invariant-removal test instructions when content packets provided
- `src/llm/prompts/concept-scenario-prompt.ts` — add conditional setpiece exploitation requirements when content packets provided
- `src/llm/concept-verifier.ts` — pass content packets through to both prompt builders

## Out of Scope

- Changes to `ConceptVerification` output type (the existing `loadBearingCheck` field captures the result)
- Changes to `concept-single-verifier.ts` (single-concept verifier can be updated in a follow-up)
- Evaluator changes — WILCONPIP-12
- Stress tester changes — WILCONPIP-15
- Changes to specificity or scenario JSON schemas (use existing output shape)

## Acceptance Criteria

### Tests

- [ ] Unit test: `ConceptVerifierContext` accepts `contentPackets` field
- [ ] Unit test: `buildConceptSpecificityPrompt` includes invariant-removal test when content packets provided
- [ ] Unit test: `buildConceptSpecificityPrompt` preserves existing load-bearing check (genreSubversion + coreFlaw + coreConflictLoop removal test)
- [ ] Unit test: `buildConceptSpecificityPrompt` omits invariant-removal test when content packets undefined
- [ ] Unit test: `buildConceptScenarioPrompt` includes setpiece exploitation requirements when content packets provided
- [ ] Unit test: `buildConceptScenarioPrompt` omits setpiece requirements when content packets undefined
- [ ] Unit test: `verifyConcepts` passes content packets through to both prompt builders
- [ ] Unit test: existing verifier calls (without contentPackets) produce identical results

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] Existing load-bearing check is NOT replaced -- both checks coexist
- [ ] `ConceptVerification` output type is unchanged
- [ ] Specificity and scenario JSON schemas are unchanged
