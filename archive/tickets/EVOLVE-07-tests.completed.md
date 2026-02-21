# EVOLVE-07: Tests for Concept Evolution Feature

**Status**: COMPLETED
**Priority**: HIGH
**Depends on**: EVOLVE-01, EVOLVE-02, EVOLVE-03
**Blocks**: None

## Summary

Reassess and complete test coverage for the concept evolution feature based on the current implementation.

## Reassessed Assumptions (Current Repo Reality)

1. Evolution feature implementation already exists and is wired end-to-end:
   - `src/llm/concept-evolver.ts`
   - `src/llm/prompts/concept-evolver-prompt.ts`
   - `src/server/services/evolution-service.ts`
   - `src/server/routes/evolution.ts`
   - `src/server/views/pages/evolution.ejs`
2. Most unit tests listed in the original ticket already exist.
3. Prompt assertions are currently co-located in `test/unit/llm/concept-evolver.test.ts`; there is no separate `test/unit/llm/prompts/concept-evolver-prompt.test.ts` file.
4. Additional unplanned but valuable tests already exist:
   - `test/unit/server/views/evolution.test.ts`
   - `test/unit/client/evolution-page/controller.test.ts`
5. Missing from the original intent: a dedicated integration test for the evolution pipeline (`evolver -> evaluator -> verifier`) equivalent to existing concept pipeline integration coverage.

## Scope Correction

This ticket is narrowed to closing the remaining high-value coverage gaps instead of recreating tests that already exist.

### Required Additions

1. Strengthen evolver parsing/prompt coverage in `test/unit/llm/concept-evolver.test.ts`:
   - Reject non-object payloads in `parseConceptEvolutionResponse()`.
   - Verify prompt behavior with 3 parent concepts.
2. Strengthen service fail-fast invariant in `test/unit/server/services/evolution-service.test.ts`:
   - If evolver fails, evaluator/verifier are not called.
3. Add integration coverage:
   - `test/integration/llm/evolution-pipeline.test.ts`
   - Validate real orchestration (`evolveConceptIdeas -> evaluateConcepts -> verifyConcepts`) with mocked fetch responses.

## Architectural Assessment

The implemented standalone evolution pipeline remains the right architecture versus alternatives.

- Benefit over folding into concept generation service: clear stage boundaries and lower coupling.
- Benefit over route-level orchestration: keeps business logic centralized in `evolution-service` and maintains testability.
- Reuse of evaluator/verifier with `ConceptSpec[]` is robust and extensible.

No aliasing or backward-compatibility shim is needed. The current architecture is already aligned with clean extension points.

## Acceptance Criteria

- [x] Added/updated tests listed in Scope Correction.
- [x] Relevant unit + integration suites pass.
- [x] Lint passes.
- [x] Ticket status updated to `COMPLETED` with Outcome section.
- [x] Ticket moved to `archive/tickets/`.

## Outcome

**Completed on**: 2026-02-21

What was changed:
- Added unit coverage in `test/unit/llm/concept-evolver.test.ts` for non-object response rejection and 3-parent prompt inclusion.
- Strengthened fail-fast invariant in `test/unit/server/services/evolution-service.test.ts` so downstream stages are asserted not called when evolver fails.
- Added integration coverage in `test/integration/llm/evolution-pipeline.test.ts` to validate end-to-end orchestration and stage callbacks.

Deviations from original plan:
- Did not create `test/unit/llm/prompts/concept-evolver-prompt.test.ts`; prompt tests remain co-located in `test/unit/llm/concept-evolver.test.ts` to match current test organization.
- Expanded verification target to include existing view/client test coverage already present in repo.

Verification results:
- `npm test -- test/unit/llm/concept-evolver.test.ts test/unit/server/services/evolution-service.test.ts` passed.
- `npm run test:integration -- test/integration/llm/evolution-pipeline.test.ts` passed.
- `npm run lint` passed.
