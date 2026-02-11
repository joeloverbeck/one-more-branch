# PAGWRISPE-05: Add `generatePageWriterOutput(context, plan, options)` API
**Status**: ✅ COMPLETED

## Summary
Introduce a dedicated client API for writer generation that accepts `PagePlan` separately and preserves current structured-output + retry behavior.

## Assumption Reassessment (2026-02-11)
- `generateWriterPage(context, options)` already exists and already wires plan guidance through `context.pagePlan`.
- The expected test files are present as:
  - `test/unit/llm/client.test.ts`
  - `test/integration/llm/client.test.ts`
- A minimal, non-breaking implementation is to add the new API as a wrapper path that forwards into the existing writer generation flow.
- `src/llm/types.ts` does not require changes for this ticket because existing `PagePlan` and `ContinuationContext` types already support the wrapper approach.

## File list it expects to touch
- `src/llm/client.ts`
- `src/llm/index.ts`
- `test/unit/llm/client.test.ts`
- `test/integration/llm/client.test.ts`

## Implementation checklist
1. Add `generatePageWriterOutput(context, plan, options)` in `src/llm/client.ts`.
2. Implement it as a non-breaking wrapper over the existing writer generation path by injecting `pagePlan` into continuation context.
3. Ensure implementation passes `plan` into writer prompt construction.
4. Keep retry behavior (`withRetry`) unchanged.
5. Keep structured-output enforcement and error mapping unchanged.
6. Retain existing `generateOpeningPage` / `generateWriterPage` public APIs unchanged; call-site migration is a follow-up ticket.
7. Update exports and tests for the new API.

## Out of scope
- Do not remove legacy API functions unless all call sites are migrated in the same change.
- Do not migrate engine/page-service call sites in this ticket.
- Do not modify planner generation behavior.
- Do not change schema validation rule semantics.
- Do not modify page-service in this ticket.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/llm/client.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- OpenRouter request headers and retry behavior remain unchanged.
- Structured-output unsupported models still raise `STRUCTURED_OUTPUT_NOT_SUPPORTED`.
- Validation failures remain non-retryable and include validation issue metadata.

## Outcome
- Completed: 2026-02-11
- Actual changes:
  - Added `generatePageWriterOutput(context, plan, options)` to `src/llm/client.ts` as a non-breaking wrapper over `generateWriterPage`, injecting `pagePlan` into continuation context.
  - Exported the new API from `src/llm/index.ts`.
  - Added/updated tests in `test/unit/llm/client.test.ts`, `test/integration/llm/client.test.ts`, and `test/unit/llm/index.test.ts` to cover the new API and barrel export.
- Deviations from original plan:
  - No `src/llm/types.ts` changes were needed after reassessment because existing types already support the wrapper API.
  - Existing `generateOpeningPage` / `generateWriterPage` remained intact as required; no call-site migration in this ticket.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/llm/client.test.ts` passed.
  - `npm run typecheck` passed.
