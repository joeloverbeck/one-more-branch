# PAGPLASPE-05: Implement `generatePagePlan()` and LLM Wiring

## Summary
Add planner-generation runtime path (prompt build + OpenRouter call + schema/validator transform + observability logging) and expose it through LLM client/barrels.

## Depends on
- PAGPLASPE-01
- PAGPLASPE-02
- PAGPLASPE-03
- PAGPLASPE-04

## Blocks
- PAGPLASPE-06

## File list it expects to touch
- `src/llm/page-planner-generation.ts`
- `src/llm/client.ts`
- `src/llm/index.ts`
- `src/llm/types.ts`
- `src/llm/schemas/index.ts`
- `test/unit/llm/page-planner-generation.test.ts`
- `test/unit/llm/client.test.ts`
- `test/unit/llm/index.test.ts`

## Implementation checklist
1. Add planner generation module analogous to writer/analyst generation modules.
2. Use planner prompt builder and planner JSON schema as `response_format`.
3. Parse JSON content via shared HTTP helper; validate + transform + deterministic validate to `PagePlan`.
4. Emit planner observability context (`storyId`, `pageId`, `requestId`) in validation failure logs.
5. Add client wrapper `generatePagePlan(context, options)` with retry behavior.
6. Export planner runtime API via LLM barrel.

## Out of scope
- Modifying writer generation output contract.
- Engine `page-service` orchestration changes.
- Reconciler implementation details from Spec 11.
- Prompt-level refactors for writer from Spec 10.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/page-planner-generation.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner failures surface as `LLMError` with code + context, matching existing error-handling style.
- Existing `generateOpeningPage` / `generateWriterPage` / `generateAnalystEvaluation` behavior remains unchanged.
- Planner path enforces strict schema validation before returning a `PagePlan`.
