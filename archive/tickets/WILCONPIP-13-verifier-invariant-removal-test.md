# WILCONPIP-13: Verifier Invariant-Removal Load-Bearing Test

**Status**: COMPLETED

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

- [x] Unit test: `ConceptVerifierContext` accepts `contentPackets` field
- [x] Unit test: `buildConceptSpecificityPrompt` includes invariant-removal test when content packets provided
- [x] Unit test: `buildConceptSpecificityPrompt` preserves existing load-bearing check (genreSubversion + coreFlaw + coreConflictLoop removal test)
- [x] Unit test: `buildConceptSpecificityPrompt` omits invariant-removal test when content packets undefined
- [x] Unit test: `buildConceptScenarioPrompt` includes setpiece exploitation requirements when content packets provided
- [x] Unit test: `buildConceptScenarioPrompt` omits setpiece requirements when content packets undefined
- [x] Unit test: `verifyConcepts` passes content packets through to both prompt builders
- [x] Unit test: existing verifier calls (without contentPackets) produce identical results

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] Existing load-bearing check is NOT replaced -- both checks coexist
- [x] `ConceptVerification` output type is unchanged
- [x] Specificity and scenario JSON schemas are unchanged

## Outcome

- **Completed**: 2026-03-08
- **Files changed**:
  - `src/models/concept-generator.ts` — added `contentPackets?: readonly ContentPacket[]` to `ConceptVerifierContext`
  - `src/llm/prompts/concept-specificity-prompt.ts` — added `buildContentPacketInvariantDirective()` and conditional injection into system prompt
  - `src/llm/prompts/concept-scenario-prompt.ts` — added `buildContentPacketSetpieceDirective()` and conditional injection into system prompt
  - `test/unit/llm/prompts/concept-verifier-prompt.test.ts` — 7 new tests
  - `test/unit/llm/concept-verifier.test.ts` — 2 new tests (passthrough + backward compat)
- **No changes needed to `concept-verifier.ts`** — it already passes the full context object through to both prompt builders
- **No deviations** from the original ticket
- **Verification**: 271 test suites pass, 3274 tests, typecheck clean, lint clean
