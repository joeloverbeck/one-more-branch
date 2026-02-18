# CONGEN-09: Integration and E2E Tests

**Status**: PENDING
**Depends on**: CONGEN-05, CONGEN-07
**Blocks**: None

## Summary

Add integration tests for the full concept generation pipeline (ideator → evaluator flow with mocked LLM) and route-level HTTP tests for the two new endpoints. Add an E2E test for the complete user journey from seed input through concept selection to form pre-fill.

## Files to Create

- `test/integration/concept-pipeline.test.ts`
- `test/integration/concept-routes.test.ts`
- `test/e2e/concept-flow.test.ts`

## Files to Touch

- None (all new test files)

## Out of Scope

- Implementation code changes (everything should be implemented by CONGEN-01 through CONGEN-08)
- Manual testing instructions (covered in spec section 12)
- Performance or memory tests

## Work Description

### 1. Integration: Pipeline Test (`concept-pipeline.test.ts`)

Test the full ideation → evaluation pipeline with mocked LLM responses:

- Mock `fetch` to return valid concept ideation JSON (6 concepts)
- Verify ideator produces ConceptSpec array
- Mock `fetch` to return valid evaluation JSON (3 evaluated concepts)
- Verify evaluator produces sorted EvaluatedConcept array with recomputed scores
- Verify the full pipeline returns top 3 concepts
- Test pipeline with stress-test: mock fetch for all 3 stages, verify hardened concept output

### 2. Integration: Route Tests (`concept-routes.test.ts`)

Follow the pattern of existing route tests (use supertest or direct handler invocation with mocked req/res):

**`POST /stories/generate-concepts`:**
- Returns 400 when apiKey missing
- Returns 400 when all seed fields empty
- Returns 200 with `evaluatedConcepts` array when seeds + apiKey provided (mock LLM)
- Returns 500 with structured error on LLM failure
- Handles progress tracking correctly (progressId in request → stages reported)

**`POST /stories/stress-test-concept`:**
- Returns 400 when apiKey missing
- Returns 400 when concept missing
- Returns 200 with hardenedConcept, driftRisks, playerBreaks (mock LLM)
- Returns 500 with structured error on LLM failure

### 3. E2E: Full Concept Flow (`concept-flow.test.ts`)

Follow existing E2E test patterns (mocked LLM/fetch):

1. Start at `/stories/new`
2. Submit seed input (genre vibes + mood keywords) with API key
3. Verify concept generation endpoint called with correct payload
4. Mock LLM to return concepts → verify 3 concept cards returned
5. Select a concept → verify form pre-fill values match concept fields
6. Verify "Skip" path: skip concept generation → existing form shown empty
7. Verify stress-test path: toggle harden → select concept → stress-test endpoint called → form pre-filled with hardened concept

### 4. Test Fixtures

Create reusable fixtures:

- `validConceptSpec`: A complete ConceptSpec object with all fields
- `validConceptIdeationResponse`: Raw JSON matching ideator schema (6 concepts)
- `validConceptEvaluationResponse`: Raw JSON matching evaluator schema (3 evaluated concepts)
- `validConceptStressTestResponse`: Raw JSON matching stress-tester schema
- `validConceptSeedInput`: A ConceptSeedInput with all fields populated

Place in `test/fixtures/` or inline in test files (follow existing fixture pattern).

## Acceptance Criteria

### Tests That Must Pass

1. **Pipeline integration: ideation → evaluation flow**: Full pipeline returns 3 sorted evaluated concepts
2. **Pipeline integration: ideation → evaluation → stress-test flow**: Full pipeline returns hardened concept
3. **Route: generate-concepts validation**: 400 on missing apiKey, 400 on empty seeds
4. **Route: generate-concepts success**: 200 with evaluatedConcepts
5. **Route: generate-concepts error handling**: 500 with structured LLM error
6. **Route: stress-test-concept validation**: 400 on missing fields
7. **Route: stress-test-concept success**: 200 with complete result
8. **E2E: seed → concepts → select → form pre-fill**: Complete happy path
9. **E2E: skip concept generation**: Existing flow still works

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run test` passes (full suite including all new tests)
- **All existing tests remain unchanged and passing**
- No mocked LLM responses require a real API key
- Test fixtures are valid against the schemas (any schema change in prior tickets would require fixture updates here)
- E2E tests follow existing patterns (mocked fetch, no real network calls)
