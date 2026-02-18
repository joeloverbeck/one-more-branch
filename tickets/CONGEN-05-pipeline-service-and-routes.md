# CONGEN-05: Pipeline Orchestration Service and Route Handlers

**Status**: PENDING
**Depends on**: CONGEN-01, CONGEN-02, CONGEN-03, CONGEN-04
**Blocks**: CONGEN-06, CONGEN-09

## Summary

Create the `ConceptService` that orchestrates the 3-stage concept pipeline, and add two new AJAX route handlers to the stories router: `POST /stories/generate-concepts` and `POST /stories/stress-test-concept`.

## Files to Create

- `src/server/services/concept-service.ts`
- `test/unit/concept-service.test.ts`

## Files to Touch

- `src/server/routes/stories.ts` — Add two new route handlers
- `src/server/services/index.ts` — Re-export concept service

## Out of Scope

- LLM schema/prompt/generator internals (CONGEN-02, 03, 04)
- UI changes (CONGEN-06, CONGEN-07)
- Stage registration and progress phrases (CONGEN-08)
- Story model changes (CONGEN-07)
- Form pre-fill mapping (CONGEN-07)
- Existing route handlers (create, create-ajax, generate-spines, delete)

## Work Description

### 1. Concept Service (`concept-service.ts`)

```typescript
export interface GenerateConceptsInput {
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly thematicInterests?: string;
  readonly sparkLine?: string;
  readonly apiKey: string;
}

export interface GenerateConceptsResult {
  readonly evaluatedConcepts: readonly EvaluatedConcept[];
}

export interface StressTestInput {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly weaknesses: readonly string[];
  readonly apiKey: string;
}
```

- `generateConcepts(input: GenerateConceptsInput, progressId?: string): Promise<GenerateConceptsResult>`
  - Validates at least one seed field is non-empty
  - Validates apiKey (>=10 chars)
  - Trims all string fields
  - Calls `generateConceptIdeas()` (Stage 1)
  - Calls `evaluateConcepts()` (Stage 2) with Stage 1 output
  - If `progressId`, reports stages to `generationProgressService`
  - Returns the evaluated top 3
- `stressTestConcept(input: StressTestInput, progressId?: string): Promise<ConceptStressTestResult>`
  - Calls `stressTestConcept()` (Stage 3)
  - If `progressId`, reports stage to progress service
  - Returns the hardened concept + risks + breaks

### 2. Route: `POST /stories/generate-concepts`

Add to `src/server/routes/stories.ts`, following the `generate-spines` pattern:

- Accept JSON body: `{ genreVibes?, moodKeywords?, contentPreferences?, thematicInterests?, sparkLine?, apiKey, progressId? }`
- Validate: apiKey required (>=10 chars), at least one seed field non-empty
- Return 400 on validation failure
- Call `conceptService.generateConcepts()`
- Return `{ success: true, evaluatedConcepts: [...] }` on success
- Return `{ success: false, error: "...", code?, retryable? }` on failure
- Handle `LLMError` and generic errors same as `generate-spines`

### 3. Route: `POST /stories/stress-test-concept`

- Accept JSON body: `{ concept, scores, weaknesses, apiKey, progressId? }`
- Validate: apiKey, concept object presence
- Call `conceptService.stressTestConcept()`
- Return `{ success: true, hardenedConcept, driftRisks, playerBreaks }`
- Error handling same as above

### 4. Input Validation

- apiKey: required, >=10 chars (consistent with existing validation)
- At least one seed field must be non-empty (genreVibes OR moodKeywords OR contentPreferences OR thematicInterests OR sparkLine)
- All string fields trimmed before passing to generators

## Acceptance Criteria

### Tests That Must Pass

`test/unit/concept-service.test.ts`:

1. **`generateConcepts` calls ideator then evaluator**: Mock both generators, verify call order and arguments
2. **`generateConcepts` rejects all-empty seeds**: Throws error when no seed fields provided
3. **`generateConcepts` rejects missing apiKey**: Throws error
4. **`generateConcepts` trims all seed fields**: Verify trimmed values passed to ideator
5. **`generateConcepts` propagates LLMError**: LLMError from ideator/evaluator propagates correctly

Route tests (in `test/unit/concept-service.test.ts` or separate `test/integration/concept-routes.test.ts` in CONGEN-09):

6. **`POST /stories/generate-concepts` returns 400 on missing apiKey**: Response `{ success: false, error: "..." }`
7. **`POST /stories/generate-concepts` returns 400 on empty seeds**: Response `{ success: false, error: "..." }`
8. **`POST /stories/generate-concepts` returns 200 on success**: Response `{ success: true, evaluatedConcepts: [...] }`
9. **`POST /stories/stress-test-concept` returns 200 on success**: Response includes hardenedConcept, driftRisks, playerBreaks

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests break
- Existing routes (`/create`, `/create-ajax`, `/generate-spines`, `/:storyId/delete`) are unchanged
- All AJAX endpoints return JSON, never HTML renders
- All LLM errors are caught and returned as structured JSON error responses
- Progress reporting uses existing `generationProgressService` API
