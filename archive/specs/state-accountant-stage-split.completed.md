# State Accountant Stage Split

**Status**: COMPLETED
**Created**: 2026-02-13
**Last Updated**: 2026-02-13
**Scope**: Implemented planner/accountant split with merged downstream `PagePlanGenerationResult` contract

## Final Architecture Decision

The split is better than the previous single-planner architecture for long-term robustness/extensibility:
1. It keeps scene planning and state mutation planning as separate responsibilities.
2. It shrinks planner schema complexity and grammar pressure.
3. It preserves a unified downstream `PagePlanGenerationResult` by merging reduced planner output + accountant output in the retry pipeline.

## What Was Implemented

1. Added reduced planner contracts and accountant contracts.
2. Added new accountant generation path (schema, validation, transformer, prompt, API call wrapper).
3. Reduced planner output to scene/choice planning fields only.
4. Added merge step in retry pipeline:
- `PLANNING_PAGE` -> reduced plan
- `ACCOUNTING_STATE` -> state intents
- merge -> full page plan for writer/reconciler
5. Added `ACCOUNTING_STATE` engine stage and UI stage phrase/display mapping.
6. Updated pipeline metrics:
- added `accountantDurationMs`, `accountantValidationIssueCount`
- removed stale `lorekeeperDurationMs` from `GenerationPipelineMetrics`
7. Updated prompt logging prompt type union to include `accountant`.
8. Regenerated `public/js/app.js`.

## Key Files Added

1. `src/llm/accountant-types.ts`
2. `src/llm/accountant-generation.ts`
3. `src/llm/prompts/state-accountant-prompt.ts`
4. `src/llm/schemas/state-accountant-schema.ts`
5. `src/llm/schemas/state-accountant-validation-schema.ts`
6. `src/llm/schemas/state-accountant-response-transformer.ts`
7. `src/llm/schemas/shared-state-intent-schemas.ts`
8. `src/llm/schemas/shared-state-intent-normalizer.ts`

## Key Existing Files Updated

1. `src/llm/planner-types.ts`
2. `src/llm/schemas/page-planner-schema.ts`
3. `src/llm/schemas/page-planner-validation-schema.ts`
4. `src/llm/schemas/page-planner-response-transformer.ts`
5. `src/llm/planner-generation.ts`
6. `src/llm/client.ts`
7. `src/engine/reconciliation-retry-pipeline.ts`
8. `src/engine/generation-pipeline-helpers.ts`
9. `src/llm/generation-pipeline-types.ts`
10. `src/engine/types.ts`
11. `public/js/src/01-constants.js`
12. `public/js/app.js`

## Hard Test Evidence

Executed on 2026-02-13:

1. `npm run typecheck`
- Result: PASS

2. `npm run test:unit -- --coverage=false`
- Result: PASS (140 suites, 1642 tests)

3. `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts test/integration/engine/replay.test.ts test/integration/engine/story-engine.test.ts test/integration/server/play-flow.test.ts`
- Result: PASS (4 suites, 40 tests)

4. `npm run test:e2e -- --runTestsByPath test/e2e/engine/full-playthrough.test.ts test/e2e/engine/structured-story-flow.test.ts test/e2e/engine/structure-rewriting-journey.test.ts`
- Result: PASS (3 suites, 8 tests)

## New/Modified Tests in This Task

### New tests

1. `test/unit/llm/schemas/state-accountant-schema.test.ts`
- Rationale: verifies new accountant structured-output schema shape and enum contracts.

2. `test/unit/llm/schemas/state-accountant-response-transformer.test.ts`
- Rationale: verifies accountant validation/normalization path and deterministic rule-key behavior.

3. `test/unit/llm/prompts/state-accountant-prompt.test.ts`
- Rationale: verifies accountant prompt receives reduced plan + state-intent rules and proper context mode.

4. `test/unit/llm/accountant-generation.test.ts`
- Rationale: verifies accountant generation call uses correct schema and returns validated state intents.

### Modified tests

1. Planner schema/transformer/generation prompt tests updated for reduced planner output.
2. Engine pipeline tests updated for inserted `ACCOUNTING_STATE` stage and merged full-plan expectations.
3. Integration/E2E mocked-LLM tests updated to mock `generateStateAccountant` and reduced planner payload.
4. Metrics/type tests updated for accountant metrics fields and lorekeeper metric removal.
5. Client/public JS tests updated for `ACCOUNTING_STATE` phrase pool presence.

## Outcome

**Completion Date**: 2026-02-13

### What changed vs the original draft

1. Implemented the full split and pipeline integration end-to-end.
2. Resolved stale metrics shape while adding accountant metrics.
3. Added targeted accountant modules/tests and updated affected engine/client/integration/e2e tests.

### Deviations

1. Spinner phrase count was kept pragmatic (maintainable set) rather than expanding to ~96 entries.
