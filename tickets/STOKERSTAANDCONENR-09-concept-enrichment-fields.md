# STOKERSTAANDCONENR-09: Concept Enrichment -- Add 3 New Fields

**Status**: PENDING
**Priority**: MEDIUM
**Depends On**: None (independent of kernel tickets; can be done in parallel)
**Spec Phase**: 6a, 6b, 6c, 6d, 6e, 6f

## Summary

Add `whatIfQuestion`, `ironicTwist`, and `playerFantasy` to ConceptSpec. Update the type guard, ideator schema, ideator prompt, spec parser, and evaluator prompt. This is the concept enrichment portion of the spec.

## File List

### Modified Files
- `src/models/concept-generator.ts` -- Add 3 fields to `ConceptSpec`, update `isConceptSpec`
- `src/llm/schemas/concept-ideator-schema.ts` -- Add 3 required string properties
- `src/llm/prompts/concept-ideator-prompt.ts` -- Add quality guidance for 3 new fields
- `src/llm/concept-spec-parser.ts` -- Add validation for 3 new fields
- `src/llm/prompts/concept-evaluator-prompt.ts` -- Update hookStrength and conflictEngine rubrics

### Test Files to Update
- `test/unit/llm/concept-ideator.test.ts` -- Update mocks to include new fields
- Any other test files with ConceptSpec mocks (search for `oneLineHook` or `isConceptSpec` in test files)

## Detailed Requirements

### `src/models/concept-generator.ts`

Add to `ConceptSpec` interface (after `stateComplexity`):
```typescript
readonly whatIfQuestion: string;
readonly ironicTwist: string;
readonly playerFantasy: string;
```

Update `isConceptSpec` to validate all 3 as `isNonEmptyString`:
```typescript
isNonEmptyString(concept['whatIfQuestion']) &&
isNonEmptyString(concept['ironicTwist']) &&
isNonEmptyString(concept['playerFantasy'])
```

### `src/llm/schemas/concept-ideator-schema.ts`

Add 3 new required string properties to the concept object schema:
- `whatIfQuestion: { type: 'string' }`
- `ironicTwist: { type: 'string' }`
- `playerFantasy: { type: 'string' }`

All 3 must be added to the `required` array.

### `src/llm/prompts/concept-ideator-prompt.ts`

Add quality guidance for the 3 new fields in the system prompt:
- `whatIfQuestion`: "A single question ending with '?' that translates the dramatic thesis into a specific, producible situation. Should create dramatic possibility space."
- `ironicTwist`: "1-2 sentences describing the built-in irony -- how the protagonist's strength becomes their weakness, or how the solution to the problem creates the problem."
- `playerFantasy`: "1 sentence describing what it FEELS LIKE to be the protagonist. Not what they do, but the experiential promise. Should create immediate desire to play."

### `src/llm/concept-spec-parser.ts`

Add validation for the 3 new fields. Each must be a non-empty string. Follow existing validation pattern in this file.

### `src/llm/prompts/concept-evaluator-prompt.ts`

Update scoring rubric descriptions:
- `hookStrength` dimension should additionally evaluate `whatIfQuestion` quality and `playerFantasy` appeal
- `conflictEngine` dimension should additionally evaluate `ironicTwist` quality

These are prompt text changes only -- no code logic changes to the scoring algorithm.

## Out of Scope

- Kernel data model and pipeline (STOKERSTAANDCONENR-01 through -08)
- Concept UI rendering of new fields (STOKERSTAANDCONENR-10)
- Concept-to-kernel integration (STOKERSTAANDCONENR-10)
- Changes to `ConceptContext` interface (not needed -- it's a subset for downstream consumers)
- Changes to concept stress tester
- Changes to concept evaluator scoring weights or thresholds

## Acceptance Criteria

### Tests That Must Pass
- `isConceptSpec` returns false for ConceptSpec objects missing `whatIfQuestion`
- `isConceptSpec` returns false for ConceptSpec objects missing `ironicTwist`
- `isConceptSpec` returns false for ConceptSpec objects missing `playerFantasy`
- `isConceptSpec` returns true for complete ConceptSpec objects including all 3 new fields
- Concept ideator schema includes `whatIfQuestion`, `ironicTwist`, `playerFantasy` as required
- Concept ideator prompt mentions quality guidance for all 3 new fields
- Concept spec parser validates all 3 new fields
- All existing concept tests pass after mock updates
- `npm run typecheck` passes

### Invariants
- `ConceptSpec` remains backward-compatible for reading (old saved concepts without the 3 fields will fail `isConceptSpec` -- this is acceptable as generation always produces them)
- `isConceptSpec` validation is exhaustive (all fields checked)
- Evaluator scoring weights and thresholds are UNCHANGED
- `ConceptContext` interface is NOT modified (it's a projection used by downstream stages)
- No changes to concept stress tester
