**Status**: ✅ COMPLETED

# PAGPLASPE-05: Implement `generatePagePlan()` and LLM Wiring

## Summary
Add planner-generation runtime path (prompt build + OpenRouter call + schema/validator transform + observability logging) and expose it through LLM client/barrels.

## Assumptions Reassessed (2026-02-11)
- Planner prompt + schema + transformer are already implemented:
  - `src/llm/prompts/page-planner-prompt.ts`
  - `src/llm/schemas/page-planner-schema.ts`
  - `src/llm/schemas/page-planner-validation-schema.ts`
  - `src/llm/schemas/page-planner-response-transformer.ts`
- `src/llm/schemas/index.ts` already exports planner schema + transformer.
- The runtime planner generation path is still missing (no planner generation module and no client wrapper).
- The ticket’s expected test file `test/unit/llm/page-planner-generation.test.ts` does not exist yet.

## Depends on
- PAGPLASPE-01
- PAGPLASPE-02
- PAGPLASPE-03
- PAGPLASPE-04

## Blocks
- PAGPLASPE-06

## File list it expects to touch
- `src/llm/planner-generation.ts`
- `src/llm/client.ts`
- `src/llm/index.ts`
- `test/unit/llm/planner-generation.test.ts`
- `test/unit/llm/client.test.ts`
- `test/unit/llm/index.test.ts`

## Implementation checklist
1. Add planner generation module analogous to writer/analyst generation modules.
2. Use planner prompt builder and planner JSON schema as `response_format`.
3. Parse JSON content via shared HTTP helper; validate + transform to `PagePlan`.
4. Emit planner observability context (`storyId`, `pageId`, `requestId`) in planner validation failure logs.
5. Add client wrapper `generatePagePlan(context, options)` with retry behavior.
6. Export planner runtime API via LLM barrel.

## Out of scope
- Modifying writer generation output contract.
- Engine `page-service` orchestration changes.
- Reconciler implementation details from Spec 11.
- Prompt-level refactors for writer from Spec 10.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/planner-generation.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner failures surface as `LLMError` with code + context, matching existing error-handling style.
- Existing `generateOpeningPage` / `generateWriterPage` / `generateAnalystEvaluation` behavior remains unchanged.
- Planner path enforces strict schema validation before returning a `PagePlan`.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added `src/llm/planner-generation.ts` for planner OpenRouter execution + validation + structured-output capability handling.
  - Added `generatePagePlan(context, options)` to `src/llm/client.ts` with prompt logging and retry behavior.
  - Exported `generatePagePlan` from `src/llm/index.ts`.
  - Added planner runtime tests in `test/unit/llm/planner-generation.test.ts`.
  - Added planner client wrapper coverage in `test/unit/llm/client.test.ts`.
  - Added planner barrel export assertion in `test/unit/llm/index.test.ts`.
  - Extended `PromptType` in `src/logging/prompt-formatter.ts` to include `planner`, plus test coverage in `test/unit/logging/prompt-formatter.test.ts`.
- Deviations from original plan:
  - Replaced expected file names `page-planner-generation.*` with actual project naming `planner-generation.*`.
  - Did not modify `src/llm/types.ts` or `src/llm/schemas/index.ts` because planner contract/schema exports already existed.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/planner-generation.test.ts test/unit/llm/client.test.ts test/unit/llm/index.test.ts test/unit/logging/prompt-formatter.test.ts` passed.
  - `npm run typecheck` passed.
