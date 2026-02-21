# EVOLVE-07: Tests for Concept Evolution Feature

**Priority**: HIGH (parallel with implementation)
**Depends on**: EVOLVE-01, EVOLVE-02, EVOLVE-03
**Blocks**: None

## Summary

Create comprehensive tests for the concept evolution feature covering the evolver LLM stage, evolution service, evolution routes, and client-side behavior.

## Test Files to Create

### Unit Tests

1. **`test/unit/llm/concept-evolver.test.ts`**
   - `parseConceptEvolutionResponse()`:
     - Parses valid response with 6 concepts
     - Rejects response with fewer than 6 concepts
     - Rejects response with more than 6 concepts
     - Rejects non-object response
     - Rejects response missing `concepts` array
     - Individual concepts validated by `parseConceptSpec`
   - `evolveConceptIdeas()`:
     - Calls `runLlmStage` with correct parameters
     - Returns parsed concepts and raw response

2. **`test/unit/llm/prompts/concept-evolver-prompt.test.ts`**
   - `buildConceptEvolverPrompt()`:
     - Includes kernel fields in user message
     - Includes parent concept data with scores/strengths/weaknesses
     - System message contains mutation strategies
     - System message contains diversity constraints
     - System message contains content policy
     - Handles 2 parent concepts
     - Handles 3 parent concepts

3. **`test/unit/server/services/evolution-service.test.ts`**
   - `evolveConcepts()`:
     - Calls evolver, evaluator, verifier in sequence
     - Passes evolver output to evaluator as input
     - Passes evaluator output to verifier as input
     - Fires progress stage callbacks for all 3 stages
     - Rejects fewer than 2 parent concepts
     - Rejects more than 3 parent concepts
     - Rejects missing/short API key
     - Propagates evolver errors
     - Propagates evaluator errors
     - Propagates verifier errors

4. **`test/unit/server/routes/evolution.test.ts`**
   - GET /evolve: renders page with concepts
   - GET /evolve/api/concepts-by-kernel/:kernelId: filters by kernel
   - POST /evolve/api/evolve:
     - Returns 400 for missing API key
     - Returns 400 for missing concept IDs
     - Returns 400 for too few concept IDs (1)
     - Returns 400 for too many concept IDs (4+)
     - Returns 400 for missing kernel ID
     - Returns 404 for non-existent concept
     - Returns 404 for non-existent kernel
     - Returns 400 for concepts with mismatched kernel
     - Returns 200 with evolution results on success
     - Handles LLMError correctly

### Integration Tests

5. **`test/integration/evolution-pipeline.test.ts`**
   - Full pipeline with mocked LLM calls
   - Evolver output feeds into evaluator
   - Evaluator output feeds into verifier
   - Final result contains all expected fields

## Mock Patterns

Follow existing test patterns from `test/unit/server/services/concept-service.test.ts` and `test/unit/server/routes/concepts.test.ts`. Key mock shapes:

- Evolver mock returns `{ concepts: [ConceptSpec x 6], rawResponse: '...' }`
- Evaluator mock returns `{ scoredConcepts: [...], evaluatedConcepts: [...], rawResponse: '...' }`
- Verifier mock returns `{ verifications: [...], rawResponse: '...' }`

## Acceptance Criteria

- [ ] All unit tests pass
- [ ] Integration test passes
- [ ] Coverage meets 70% threshold for new files
- [ ] Tests use the project's standard mock patterns
- [ ] No flushPromises issues (use wrapAsyncRoute test patterns from CLAUDE.md)
