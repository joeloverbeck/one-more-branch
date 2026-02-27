# NARARCAUD-19: Delayed Consequences — Writer & Page Integration

**Status**: COMPLETED
**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: NARARCAUD-18
**Spec reference**: F1 (part 2) — Subsystem gaps

## Summary

Wire delayed consequences into writer output and page assembly. The writer emits delayed-consequence drafts, and page assembly materializes canonical delayed-consequence records and applies lifecycle aging to inherited pending items.

## Assumption Reassessment (Codebase Reality)

- `DelayedConsequence` model and lifecycle helpers already exist:
  - `src/models/state/delayed-consequence.ts`
  - `src/engine/consequence-lifecycle.ts`
  - Unit tests already cover shape validation and lifecycle helpers.
- Current gap is integration: writer schemas/types, page model, page builder state threading, and page serialization do not yet carry delayed consequences.
- Original ticket assumption that this work starts from zero is incorrect.
- Architecturally cleaner boundary:
  - Writer should not emit engine-owned fields (`id`, `currentAge`, `triggered`, `sourcePageId`).
  - Writer should emit creation drafts only (`description`, `triggerCondition`, `minPagesDelay`, `maxPagesDelay`).
  - Page builder owns canonicalization (ID assignment + source linkage + aging).

## Files to Touch

- `src/llm/writer-contract.ts` — include `delayedConsequencesCreated` in required writer fields
- `src/llm/schemas/writer-schema.ts` — add delayed-consequence draft schema
- `src/llm/schemas/writer-validation-schema.ts` — validate delayed-consequence drafts
- `src/llm/schemas/writer-response-transformer.ts` — normalize delayed-consequence drafts
- `src/llm/writer-types.ts` — add delayed-consequence draft types + `PageWriterResult` field
- `src/models/page.ts` — add `readonly accumulatedDelayedConsequences: readonly DelayedConsequence[]`
- `src/engine/page-builder.ts` — age inherited consequences and append newly created canonical consequences
- `src/engine/post-generation-processor.ts` — pass parent delayed consequences into page-build context
- `src/engine/parent-state-collector.ts` — include delayed consequences in parent-state snapshot
- `src/persistence/page-serializer-types.ts` — add delayed-consequence file format field
- `src/persistence/page-serializer.ts` — serialize/deserialize delayed consequences
- `src/llm/prompts/opening-prompt.ts` and `src/llm/prompts/continuation-prompt.ts` — instruct writer on when/how to create delayed consequences
- `prompts/opening-prompt.md` and `prompts/continuation-prompt.md` — update prompt docs for ownership/scope consistency

## Out of Scope

- Analyst evaluation of consequences (NARARCAUD-20)
- Planner context injection / trigger targeting
- Trigger-resolution semantics beyond lifecycle aging and accumulation

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit tests: writer contract/schema/transformer validate `delayedConsequencesCreated` as required array (can be empty)
- [x] Unit test: `buildPage` increments age for inherited pending delayed consequences and adds newly created consequences with deterministic engine-owned fields
- [x] Unit test: serializer round-trips `accumulatedDelayedConsequences`
- [x] Invariant: All existing page builder tests pass (mocks updated)

## Outcome

- Completion date: 2026-02-27
- What changed:
  - Added required writer output field `delayedConsequencesCreated` end-to-end (contract, schema, validation, transformer, prompt text/docs).
  - Introduced writer draft type separation (`DelayedConsequenceDraft`) and kept engine-owned delayed consequence fields materialized in page assembly.
  - Integrated delayed consequence accumulation into page lifecycle:
    - inherited consequences age by +1 per page;
    - newly created consequences are assigned deterministic `dc-*` IDs, `currentAge=0`, `triggered=false`, and `sourcePageId=current page`.
  - Added delayed consequence state threading through parent-state collection, post-generation page build context, page model, and persistence serializer/types.
  - Updated and expanded tests across writer schema/transformer, page-builder lifecycle behavior, serializer round-trip, and affected integration fixtures.
- Deviations from original ticket plan:
  - Expanded file scope beyond the initial list to include contract/validation/transformer/context plumbing files required by current architecture.
  - Used explicit writer-draft vs engine-canonical split rather than exposing full canonical delayed consequence objects in writer output.
- Verification:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:e2e`
  - `npm run test:performance`
  - `npm run test:memory` (no tests found; exits 0)
  - `npm run test:client`
