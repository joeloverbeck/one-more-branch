# NARARCAUD-20: Delayed Consequences — Analyst & Planner Wiring

**Status**: COMPLETED
**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: NARARCAUD-18, NARARCAUD-19
**Spec reference**: F1 (part 3) — Subsystem gaps

## Summary

Complete delayed-consequence trigger wiring by adding analyst trigger evaluation and planner visibility of pending consequences.

Reassessed baseline:
- Already implemented: delayed consequence model, writer output (`delayedConsequencesCreated`), page accumulation, age increment, persistence serialization.
- Missing: analyst trigger signal (`delayedConsequencesTriggered`) and prompt instructions, planner pending-consequence context section, and lifecycle application of analyst-triggered IDs.

## Files to Touch

- `src/llm/analyst-types.ts` — add delayed-consequence fields to analyst contract/context
- `src/llm/schemas/analyst-schema.ts` — add `delayedConsequencesTriggered` (required array, can be empty)
- `src/llm/schemas/analyst-validation-schema.ts` — validation/defaulting for new field
- `src/llm/schemas/analyst-response-transformer.ts` — ID normalization for triggered consequence IDs
- `src/llm/prompts/analyst-prompt.ts` — add trigger-evaluation rule + eligible consequence context section
- `src/llm/context-types.ts` — add delayed consequences to `ContinuationContext`
- `src/engine/continuation-context-builder.ts` — thread aged delayed consequences into continuation context
- `src/llm/prompts/sections/planner/continuation-context.ts` — add `PENDING CONSEQUENCES` section
- `src/engine/post-generation-processor.ts` — compute consequence eligibility for analyst context
- `src/engine/page-builder.ts` / `src/engine/consequence-lifecycle.ts` — apply analyst-triggered consequences during page build
- `prompts/analyst-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- Writer schema changes (NARARCAUD-19)
- Consequence model (NARARCAUD-18)
- Full trigger-condition semantic engine beyond analyst judgment (analyst identifies trigger IDs; deterministic lifecycle applies IDs)

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: analyst schema includes `delayedConsequencesTriggered`
- [x] Unit test: planner context renders pending consequences section
- [x] Unit test: `buildContinuationContext` threads accumulated consequences
- [x] Unit test: page build marks analyst-triggered delayed consequences as `triggered: true`
- [x] Invariant: All existing tests pass

## Outcome

- Completion date: 2026-02-27
- Implemented:
  - Added `delayedConsequencesTriggered` to analyst contract/schema/validation/transformer and prompt instructions.
  - Added trigger-eligible delayed consequence context to analyst prompt input.
  - Added delayed consequences to continuation context and planner `PENDING CONSEQUENCES` rendering.
  - Wired post-generation analyst eligibility computation using aged + trigger-window consequence lifecycle logic.
  - Applied analyst-triggered consequence IDs in page build lifecycle (`triggered: true` persisted).
  - Updated persistence conversion to include triggered consequence IDs with safe defaulting.
  - Updated prompt docs: `prompts/analyst-prompt.md`, `prompts/page-planner-prompt.md`.
  - Added/updated unit and integration tests for schema, prompt rendering, lifecycle application, and continuation context threading.
- Deviations from original plan:
  - Added converter defaulting for missing `delayedConsequencesTriggered` to prevent persistence crashes in existing integration fixtures.
  - Clarified scope to include lifecycle application of analyst-triggered IDs (not just prompt/schema wiring).
- Verification:
  - `npm run typecheck`
  - `npm run test:unit -- --coverage=false test/unit/llm/schemas/analyst-schema.test.ts test/unit/llm/schemas/analyst-response-transformer.test.ts test/unit/llm/prompts/analyst-prompt.test.ts test/unit/engine/continuation-context-builder.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/engine/consequence-lifecycle.test.ts test/unit/engine/page-builder.test.ts`
  - `npm run test:integration`
  - `npm run lint`
