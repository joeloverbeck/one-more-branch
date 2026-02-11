# PAGPLASPE-06: Integrate Planner in `page-service` Generation Flow

## Summary
Wire planner calls into first-page and continuation generation flows so planner output is produced before writer generation and passed forward with observability context.

## Depends on
- PAGPLASPE-05

## Blocks
- None

## File list it expects to touch
- `src/engine/page-service.ts`
- `src/llm/types.ts`
- `src/llm/client.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`

## Implementation checklist
1. Build opening and continuation `PagePlanContext` from story + parent state inputs.
2. Call `generatePagePlan()` before writer generation in both first-page and continuation flows.
3. Pass planner output into writer context contract (and through integration seam intended for reconciler).
4. Include planner observability context (`storyId`, `pageId`, `requestId`) in planner calls.
5. Add tests proving planner call order and planner-output consumption in generation flow.
6. Maintain graceful behavior if later specs add full deterministic reconciler integration.

## Out of scope
- Implementing deterministic reconciler module (`state-reconciler`) from Spec 11.
- Thread dedup strategy from Spec 12.
- Retry policy and hard-failure orchestration from Spec 13.
- Writer prompt/schema refactor from Spec 10.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Generation call ordering is planner before writer in both opening and continuation code paths.
- Existing story/page persistence semantics and choice-link updates remain unchanged.
- If planner output is invalid, generation aborts with machine-readable error before writer invocation.
