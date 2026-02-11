# PAGPLASPE-06: Integrate Planner in `page-service` Generation Flow

**Status**: ✅ COMPLETED

## Summary
Wire planner calls into first-page and continuation generation flows so planner output is produced before writer generation and passed forward with observability context.

## Depends on
- PAGPLASPE-05

## Blocks
- None

## Reassessed assumptions (as of 2026-02-11)
1. `src/llm/types.ts` already defines `PagePlan`, `PagePlanContext`, and planner generation result types.
2. `src/llm/client.ts` already exports `generatePagePlan()` and supports planner prompt + structured validation.
3. `src/engine/page-service.ts` currently does **not** invoke planner in either opening or continuation flows.
4. `test/unit/engine/page-service.test.ts` and `test/integration/engine/page-service.test.ts` currently do **not** cover planner call ordering or planner-to-writer propagation.
5. Engine APIs currently accept `apiKey` only (no external `requestId` parameter). Request correlation must remain internal/non-breaking.

## Updated scope
- Integrate `generatePagePlan()` into `generateFirstPage()` and `generateNextPage()` before writer generation.
- Pass planner output into writer generation context through a non-breaking optional field.
- Include planner observability context with `storyId`, `pageId` (when applicable), and an internally generated `requestId`.
- Add/adjust unit + integration tests in page-service test suites for:
  - planner-before-writer ordering,
  - planner output propagation to writer context,
  - planner failure short-circuit (writer not called).

## File list expected to touch (updated)
- `src/engine/page-service.ts`
- `src/llm/types.ts`
- `src/llm/prompts/opening-prompt.ts`
- `src/llm/prompts/continuation-prompt.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`

## Implementation checklist
1. Build opening and continuation `PagePlanContext` from story + parent state inputs.
2. Call `generatePagePlan()` before writer generation in both first-page and continuation flows.
3. Pass planner output into writer context contract for prompt consumption.
4. Include planner observability context (`storyId`, `pageId`, `requestId`) in planner calls.
5. Add tests proving planner call order and planner-output consumption in generation flow.
6. Preserve existing persistence semantics and public API signatures.

## Out of scope
- Implementing deterministic reconciler module (`state-reconciler`) from Spec 11.
- Thread dedup strategy from Spec 12.
- Retry policy and hard-failure orchestration from Spec 13.
- Writer prompt/schema refactor from Spec 10 beyond minimal plan-brief/context inclusion.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Generation call ordering is planner before writer in both opening and continuation code paths.
- Existing story/page persistence semantics and choice-link updates remain unchanged.
- If planner output is invalid, generation aborts with machine-readable error before writer invocation.
- Public `page-service` function signatures remain unchanged.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Integrated planner calls into both `generateFirstPage()` and `generateNextPage()` in `src/engine/page-service.ts`, with planner-before-writer ordering.
  - Added internal request correlation via generated `requestId` and included planner observability context (`storyId`, `pageId` when applicable, `requestId`).
  - Passed planner output into writer/opening contexts through a new optional `pagePlan` field in `OpeningContext` and `ContinuationContext` (`src/llm/types.ts`).
  - Added minimal prompt consumption of planner guidance in `src/llm/prompts/opening-prompt.ts` and `src/llm/prompts/continuation-prompt.ts`.
  - Strengthened unit/integration page-service tests for planner ordering, planner-output propagation, and planner-failure short-circuit behavior.
- Deviations from original plan:
  - `src/llm/client.ts` did not need modification because planner generation and exports were already implemented.
  - Added prompt updates so planner output is concretely consumed by writer prompts, beyond merely being threaded through context.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts` passed.
  - `npm run typecheck` passed.
