# NARARCAUD-21: Depth vs Breadth Monitor

**Status**: COMPLETED
**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: None
**Spec reference**: F2 — Subsystem gaps

## Summary

Add `narrativeFocus` classification to the analyst (`DEEPENING` | `BROADENING` | `BALANCED`) and build a focus trajectory from ancestors. The planner warns when 3+ consecutive scenes are BROADENING, which indicates the narrative is spreading too thin.

## Assumptions Reassessed Against Current Code

1. The repository already has a trajectory pattern (`thematicValenceTrajectory`) flowing through:
   - `engine/ancestor-collector` -> `engine/continuation-context-builder` -> `llm/context-types` -> planner continuation prompt section.
2. Analyst responses are not defined only by `analyst-types.ts` + `analyst-schema.ts`; they also pass through:
   - `src/llm/schemas/analyst-validation-schema.ts` (runtime Zod validation/defaulting)
   - `src/llm/schemas/analyst-response-transformer.ts` (normalization into `AnalystResult`)
3. Because `Page.analystResult` is already persisted, focus trajectory can be derived from ancestor pages without adding new `Page` model fields (still aligned with out-of-scope constraint).

## Architectural Decision (vs current architecture)

Implement this feature by mirroring the existing `thematicValenceTrajectory` pipeline, rather than creating an independent parallel mechanism. This is the cleaner and more extensible path because:
- it preserves one trajectory-assembly boundary (`ancestor-collector`)
- it keeps planner context wiring centralized in `continuation-context-builder`
- it avoids introducing duplicate history-fetch logic in prompt code.

## Files to Touch

- `src/llm/analyst-types.ts` — add `narrativeFocus: 'DEEPENING' | 'BROADENING' | 'BALANCED'` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — add field (required enum)
- `src/llm/prompts/analyst-prompt.ts` — add depth/breadth classification instruction
- `src/engine/ancestor-collector.ts` — build focus trajectory from ancestors
- `src/llm/generation-pipeline-types.ts` — add focus trajectory type
- `src/engine/continuation-context-builder.ts` — thread focus trajectory
- `src/llm/context-types.ts` — add field to `ContinuationContext`
- `src/llm/prompts/sections/planner/continuation-context.ts` — warn on 3+ consecutive BROADENING
- `src/llm/schemas/analyst-validation-schema.ts` — include `narrativeFocus` in runtime validation/defaulting
- `src/llm/schemas/analyst-response-transformer.ts` — map validated `narrativeFocus` into `AnalystResult`
- `prompts/analyst-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Tests to Touch

- `test/unit/llm/schemas/analyst-schema.test.ts` — assert JSON schema field + required entry
- `test/unit/llm/schemas/analyst-response-transformer.test.ts` — assert normalization/default behavior for `narrativeFocus`
- `test/unit/engine/ancestor-collector.test.ts` — assert focus trajectory assembly from page ancestry
- `test/unit/engine/continuation-context-builder.test.ts` — assert trajectory is threaded into continuation context
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` — assert warning appears for 3+ consecutive `BROADENING`
- Shared AnalystResult factories/typed mocks that compile against required fields (as needed)

## Out of Scope

- Writer prompt changes
- Page model storage of focus

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: analyst schema includes `narrativeFocus` enum
- [x] Unit test: planner context warns on consecutive broadening
- [x] Unit test: response transformer preserves/defaults `narrativeFocus` safely
- [x] Unit test: ancestor collector + continuation context carry focus trajectory end-to-end
- [x] Invariant: All existing tests pass

## Outcome

**Completion date**: 2026-02-27

**What actually changed**
- Added required `narrativeFocus` to the analyst contract end-to-end:
  - prompt instruction
  - OpenAI JSON schema
  - Zod validation/defaulting
  - response transformer mapping
  - `AnalystResult` type
- Added `NarrativeFocusTrajectory` types and threaded trajectory data through:
  - ancestor collection
  - continuation context building
  - planner continuation context typing
- Added planner warning section for 3+ consecutive `BROADENING` scenes.
- Updated prompt docs for analyst + planner trajectory behavior.
- Updated persistence converter/types so `narrativeFocus` round-trips with stored `analystResult`.
- Updated shared AnalystResult fixtures/mocks and compile-time test objects for the new required field.

**Deviations from original plan**
- Included persistence-layer updates (`analyst-result-converter` and `page-serializer-types`) to keep `narrativeFocus` durable in saved pages; this was required by existing architecture even though it was not listed in the initial ticket.
- Added an extra analyst prompt unit test for narrative-focus instruction coverage.

**Verification**
- `npm run typecheck` passed.
- `npm run lint` passed.
- Ran focused hard test suite covering analyst schema/transformer, ancestor + continuation trajectory wiring, planner warning behavior, and persistence round-trips:
  - `npm run test -- test/unit/engine/ancestor-collector.test.ts test/unit/engine/continuation-context-builder.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/llm/prompts/analyst-prompt.test.ts test/unit/llm/schemas/analyst-schema.test.ts test/unit/llm/schemas/analyst-response-transformer.test.ts test/unit/engine/state-lifecycle.test.ts test/unit/engine/page-builder.test.ts test/unit/llm/types.test.ts test/integration/persistence/page-serializer-converters.test.ts`
