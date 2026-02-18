# CONGEN-08: Stage Registration and Progress Tracking

**Status**: COMPLETED
**Depends on**: CONGEN-01
**Blocks**: None

## Summary

Reassess and verify concept-stage registration and concept progress flow integration. The originally proposed implementation work is already present in the codebase; this ticket is completed as a verification and documentation correction pass.

## Reassessed Assumptions and Scope Corrections

### What the ticket originally assumed

- `src/engine/types.ts` still needed concept stages added.
- `src/config/stage-model.ts` still needed concept stage model literals added.
- `src/server/services/generation-progress.ts` still needed `'concept-generation'` flow type added.
- Concept routes still needed cutover from `'new-story'` to `'concept-generation'` and concept stage events.
- Client-side concept stage display support was still out of scope.

### What is true in the current codebase

- `src/engine/types.ts` already contains:
  - `'GENERATING_CONCEPTS'`
  - `'EVALUATING_CONCEPTS'`
  - `'STRESS_TESTING_CONCEPT'`
- `src/config/stage-model.ts` already contains:
  - `'conceptIdeator'`
  - `'conceptEvaluator'`
  - `'conceptStressTester'`
- `src/server/services/generation-progress.ts` already includes `'concept-generation'` in `GenerationFlowType`.
- `src/server/routes/stories.ts` concept endpoints already start progress with `'concept-generation'`.
- Concept stage events are emitted by `src/server/services/concept-service.ts` and propagated to progress updates by `src/server/routes/stories.ts`.
- Client-side concept stage display names/phrase pools are already implemented and covered by `test/unit/server/public/app.test.ts`.

### Corrected scope for this ticket

- Verify that stage literals, flow types, and route behavior are wired consistently.
- Verify tests for stage/model/flow contracts and route progress lifecycle.
- Do not change architecture where behavior is already correct and covered.

## Architecture Reassessment

The current architecture is more robust than moving stage emission logic into route handlers:

- Stage ownership is correctly centralized in `conceptService` (the component that actually runs concept stages).
- Routes act as transport/progress adapters only, mapping `GenerationStageEvent` to `generationProgressService` updates.
- Progress flow type (`'concept-generation'`) is explicit and canonical, with no compatibility aliases.

Conclusion: the implemented architecture is aligned with the target direction (clean cutover, no aliasing, no dual-write behavior). No additional architectural change is beneficial in this ticket scope.

## Verification Performed

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit -- --coverage=false test/unit/engine/types.test.ts test/unit/config/stage-model.test.ts test/unit/server/services/generation-progress.test.ts test/unit/server/services/concept-service.test.ts test/unit/server/routes/stories.test.ts`

All commands passed.

## Acceptance Criteria (Validated)

1. `GENERATION_STAGES` includes concept stages.
2. `GenerationStage` accepts concept stage values (validated via typecheck + tests).
3. `getStageModel` accepts concept stage names.
4. Progress service accepts `'concept-generation'`.
5. Existing generation stages remain valid.
6. Concept routes use `'concept-generation'` flow.
7. Concept generation/stress-test progress uses concept stage names.

## Outcome

- Completion date: 2026-02-18
- Actual changes vs original plan:
  - No production code changes were required; implementation had already landed.
  - Ticket assumptions and scope were corrected to match the real system state.
  - Verification was executed with typecheck, lint, and relevant unit tests.
- Deviations from original plan:
  - The original implementation tasks were already complete before this pass.
