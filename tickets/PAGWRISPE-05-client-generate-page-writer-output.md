# PAGWRISPE-05: Add `generatePageWriterOutput(context, plan, options)` API
**Status**: Draft

## Summary
Introduce a dedicated client API for writer generation that accepts `PagePlan` separately and preserves current structured-output + retry behavior.

## File list it expects to touch
- `src/llm/client.ts`
- `src/llm/index.ts`
- `src/llm/types.ts`
- `test/unit/llm/client.test.ts`
- `test/integration/llm/client.test.ts`

## Implementation checklist
1. Add `generatePageWriterOutput(context, plan, options)` in `src/llm/client.ts`.
2. Ensure implementation passes `plan` into writer prompt construction.
3. Keep retry behavior (`withRetry`) unchanged.
4. Keep structured-output enforcement and error mapping unchanged.
5. Decide migration strategy for existing `generateOpeningPage` / `generateWriterPage`:
   - retain as wrappers, or
   - migrate call sites in follow-up tickets.
6. Update exports and unit tests for the new API.

## Out of scope
- Do not remove legacy API functions unless all call sites are migrated in the same change.
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
