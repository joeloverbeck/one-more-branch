# WILCONPIP-12: Concept Evaluator contentCharge Scoring Dimension

**Status**: COMPLETED

**Effort**: L
**Dependencies**: WILCONPIP-01
**Spec reference**: "Concept Evaluator Changes"

## Summary

Add `contentCharge` as an 8th scoring dimension to the concept evaluator. This is a wide-cascade change touching types, weights, thresholds, guards, schemas, prompts, and persistence upcasting. The dimension measures whether the concept contains concrete, memorable, load-bearing imaginative material vs abstract genre language.

Rubric:
- 0-1: mostly abstract or stock genre with cosmetic weirdness
- 2-3: one decent differentiator, but could be reskinned into generic genre
- 4-5: unforgettable concrete impossibilities driving institutions, dilemmas, and scenes

## Files to Touch

- `src/models/concept-generator.ts` — add `contentCharge: number` to `ConceptDimensionScores`, add `contentCharge: readonly string[]` to `ConceptScoreEvidence`, add weight to `CONCEPT_SCORING_WEIGHTS`, add threshold to `CONCEPT_PASS_THRESHOLDS`, update `computeOverallScore()`, update `passesConceptThresholds()`
- `src/models/saved-concept.ts` — update `isConceptDimensionScores()` to validate `contentCharge`, update `isScoreEvidence()` to validate `contentCharge`
- `src/persistence/concept-payload-parser.ts` — add upcast hook to default `contentCharge` for legacy `SavedConcept` payloads (scores default to 0, evidence default to empty array)
- `src/llm/schemas/concept-evaluator-schema.ts` — add `contentCharge` to both scoring and evidence objects in JSON Schema
- `src/llm/prompts/concept-evaluator-prompt.ts` — add `contentCharge` rubric text (both phase 1 quick scoring and phase 2 deep evaluation)
- All test files with `ConceptDimensionScores` mocks — add `contentCharge` field

## Out of Scope

- Content packet types — WILCONPIP-01
- Concept seeder/architect/engineer prompt changes — WILCONPIP-10
- Verifier changes — WILCONPIP-13
- Stress tester changes — WILCONPIP-15
- New content evaluator for packets (separate from concept evaluator) — WILCONPIP-07

## Acceptance Criteria

### Tests

- [ ] Unit test: `ConceptDimensionScores` includes `contentCharge` field
- [ ] Unit test: `ConceptScoreEvidence` includes `contentCharge` field
- [ ] Unit test: `CONCEPT_SCORING_WEIGHTS` includes `contentCharge` and all weights still sum to 100
- [ ] Unit test: `CONCEPT_PASS_THRESHOLDS` includes `contentCharge`
- [ ] Unit test: `computeOverallScore` includes `contentCharge` contribution
- [ ] Unit test: `passesConceptThresholds` checks `contentCharge` threshold
- [ ] Unit test: `isConceptDimensionScores` validates `contentCharge` field
- [ ] Unit test: `isConceptDimensionScores` rejects scores missing `contentCharge`
- [ ] Unit test: legacy `SavedConcept` without `contentCharge` is upcasted (scores.contentCharge defaults to 0)
- [ ] Unit test: evaluator prompt includes `contentCharge` rubric text
- [ ] Unit test: evaluator JSON schema includes `contentCharge` in both scoring and evidence objects

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass (with updated mocks)
- [ ] Existing saved concepts load correctly via upcast hook
- [ ] `computeOverallScore` with all scores at 5 still returns 100
- [ ] Weight rebalancing does not change the relative ordering of existing dimensions

## Outcome

- **Completed**: 2026-03-07
- **Changes**: Added `contentCharge` as 8th scoring dimension to concept evaluator. Updated types, weights (rebalanced: conflictEngine 20→18, llmFeasibility 20→18, ironicPremise 15→14, sceneGenerativePower 10→5, contentCharge 10), thresholds (contentCharge: 2), validators, JSON schema, prompt rubric, LLM response parsers, and persistence upcast for legacy payloads. Updated all test fixtures and mocks across 7 test files. Added new unit tests for all acceptance criteria.
- **Deviations**: Also updated `src/llm/concept-evaluator.ts` and `src/llm/concept-single-evaluator.ts` (parseScores/parseScoreEvidence functions) which were not listed in the ticket but required for type compliance.
- **Verification**: typecheck passes, lint passes, 271 test suites / 3265 tests pass
