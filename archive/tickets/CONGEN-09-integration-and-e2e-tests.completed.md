# CONGEN-09: Integration and E2E Tests

**Status**: COMPLETED
**Depends on**: CONGEN-05, CONGEN-07
**Blocks**: None

## Summary

Add missing higher-level coverage for concept generation that is not already captured by unit tests: true cross-module integration of ideator → evaluator, route-to-service wiring with mocked LLM stages, and an end-to-end concept-assisted story creation flow that verifies `conceptSpec` durability.

## Reassessed Assumptions and Scope Corrections

- `POST /stories/generate-concepts` and `POST /stories/stress-test-concept` are already extensively covered in unit tests at `test/unit/server/routes/stories.test.ts`.
- Concept form behavior (seed submission, card selection, skip flow, stress-test toggle, form pre-fill, and create payload behavior) is already covered in client unit tests at `test/unit/client/new-story-page/form-submit.test.ts`.
- `conceptSpec` model and repository serialization/deserialization are already unit-tested (`test/unit/models/story.test.ts`, `test/unit/persistence/story-repository.test.ts`), but no end-to-end journey currently validates these pieces together.
- There are currently no dedicated concept integration tests in `test/integration/` and no concept-specific E2E tests in `test/e2e/`.

**Corrected intent:** avoid duplicating existing unit assertions and instead add tests that validate module boundaries and durability guarantees.

## Files to Create

- `test/fixtures/concept-generator.ts`
- `test/integration/llm/concept-pipeline.test.ts`
- `test/integration/server/concept-routes.test.ts`
- `test/e2e/engine/concept-assisted-story-flow.test.ts`

## Files to Touch

- `tickets/CONGEN-09-integration-and-e2e-tests.md` (this reassessment)

## Out of Scope

- Implementation code changes (everything should be implemented by CONGEN-01 through CONGEN-08)
- Manual testing instructions (covered in spec section 12)
- Performance or memory tests

## Work Description

### 1. Integration: Pipeline Test (`test/integration/llm/concept-pipeline.test.ts`)

Test real `conceptService.generateConcepts()` orchestration with mocked stage functions:

- Mock `generateConceptIdeas` and `evaluateConcepts` from LLM modules
- Verify call order (`ideator` then `evaluator`) and trimmed seed propagation
- Verify evaluator `overallScore` recomputation/sort contract is preserved by service return shape
- Verify stage event sequence (`GENERATING_CONCEPTS`, `EVALUATING_CONCEPTS`) end-to-end through service callback
- Add paired stress-test integration for `conceptService.stressTestConcept` stage callback order

### 2. Integration: Route Tests (`test/integration/server/concept-routes.test.ts`)

Follow existing route-handler invocation pattern (no supertest in this repository):

**`POST /stories/generate-concepts`:**
- Validate route-to-service wiring using mocked LLM stage functions behind the real `conceptService`
- Confirm success payload contract and progress lifecycle behavior at the route boundary
- Confirm structured `LLMError` mapping on failure path

**`POST /stories/stress-test-concept`:**
- Validate route-to-service wiring via real `conceptService.stressTestConcept`
- Confirm success payload contract and progress lifecycle behavior
- Confirm structured `LLMError` mapping on failure path

### 3. E2E: Concept-Assisted Story Flow (`test/e2e/engine/concept-assisted-story-flow.test.ts`)

Follow existing E2E style (route handlers + real engine/persistence + mocked LLM):

1. Call `POST /stories/generate-concepts` and capture returned evaluated concept
2. Optionally call `POST /stories/stress-test-concept` for hardened concept
3. Create story via `POST /stories/create-ajax` with selected `conceptSpec`
4. Verify story created successfully and persisted story includes expected `conceptSpec`
5. Verify the concept-assisted path does not regress existing playability baseline (story can still begin)

### 4. Test Fixtures

Create reusable fixtures:

- `createConceptSpecFixture(index?: number): ConceptSpec`
- `createEvaluatedConceptFixture(index?: number): EvaluatedConcept`
- `createConceptStressTestFixture(): ConceptStressTestResult`
- `createConceptSeedInputFixture(): ConceptSeedInput-compatible payload`

Place in `test/fixtures/concept-generator.ts` and reuse across new tests to reduce drift and duplication.

## Acceptance Criteria

### Tests That Must Pass

1. **Pipeline integration**: `conceptService.generateConcepts()` executes ideator → evaluator with correct normalized seed handoff and stage events
2. **Pipeline stress integration**: `conceptService.stressTestConcept()` emits stress-test stage events and returns hardened output
3. **Route integration**: concept routes delegate through real service and preserve response contracts/progress lifecycle
4. **Route error integration**: route returns structured LLM error payloads from underlying stage failures
5. **E2E concept-assisted creation**: generated or stress-hardened `conceptSpec` survives through `/stories/create-ajax` into persisted story

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- `npm test` passes (full suite including all new tests)
- **All existing tests remain unchanged and passing**
- No mocked LLM responses require a real API key
- Test fixtures are valid against the schemas (any schema change in prior tickets would require fixture updates here)
- E2E tests follow existing patterns (mocked LLM, no external network calls)

## Outcome

- **Completion date**: 2026-02-18
- **What changed**:
  - Added shared concept fixtures in `test/fixtures/concept-generator.ts` to remove repeated test object construction.
  - Added `test/integration/llm/concept-pipeline.test.ts` for real service orchestration with mocked OpenRouter responses (ideation/evaluation/stress paths).
  - Added `test/integration/server/concept-routes.test.ts` to verify route-to-service wiring through real concept service with mocked LLM stages.
  - Added `test/e2e/engine/concept-assisted-story-flow.test.ts` to validate generated/stress-tested `conceptSpec` persistence through `/stories/create-ajax`.
- **Deviation from original plan**:
  - Did not duplicate route/client validation scenarios already covered in `test/unit/server/routes/stories.test.ts` and `test/unit/client/new-story-page/form-submit.test.ts`.
  - Reframed E2E coverage from browser interaction to repository-consistent handler-level E2E that validates cross-layer durability.
- **Verification**:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
